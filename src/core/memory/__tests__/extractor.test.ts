import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Message } from '@/stores/chatStore'

// Mock memoryStore before importing extractor
vi.mock('../store', () => {
  const store = {
    updateIdentity: vi.fn(),
    updatePreferences: vi.fn(),
    addEpisode: vi.fn(),
    addFact: vi.fn(),
    getPreferences: vi.fn(() => ({})),
  }
  return { memoryStore: store }
})

vi.mock('@/stores/configStore', () => ({
  useConfigStore: {
    getState: vi.fn(() => ({
      userName: '',
      updateConfig: vi.fn(),
    })),
  },
}))

import { extractFromConversation } from '../extractor'
import { memoryStore } from '../store'
import { useConfigStore } from '@/stores/configStore'

function msg(role: Message['role'], content: string, toolCalls?: Message['toolCalls']): Message {
  return { id: crypto.randomUUID(), role, content, timestamp: Date.now(), toolCalls }
}

/** Build a conversation with at least 3 user + 3 assistant rounds */
function convo(userTexts: string[], assistantTexts?: string[]): Message[] {
  const messages: Message[] = []
  const aTexts = assistantTexts ?? userTexts.map(() => 'OK noted.')
  for (let i = 0; i < userTexts.length; i++) {
    messages.push(msg('user', userTexts[i]))
    if (aTexts[i]) messages.push(msg('assistant', aTexts[i]))
  }
  return messages
}

describe('extractFromConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(memoryStore.getPreferences).mockReturnValue({})
    vi.mocked(useConfigStore.getState).mockReturnValue({
      userName: '',
      updateConfig: vi.fn(),
    } as any)
  })

  it('does nothing when conversation has fewer than 3 rounds', () => {
    const messages = [
      msg('user', 'hello'),
      msg('assistant', 'hi'),
      msg('user', 'bye'),
      msg('assistant', 'see ya'),
    ]
    extractFromConversation(messages)
    expect(memoryStore.updateIdentity).not.toHaveBeenCalled()
    expect(memoryStore.addEpisode).not.toHaveBeenCalled()
  })

  it('extracts Chinese name from "我叫" pattern', () => {
    extractFromConversation(convo(['我叫小明', 'hello', 'test']))
    expect(memoryStore.updateIdentity).toHaveBeenCalledWith({ name: '小明' })
  })

  it('extracts English name from "my name is" pattern', () => {
    extractFromConversation(convo(['my name is Alice', 'hi', 'thanks']))
    expect(memoryStore.updateIdentity).toHaveBeenCalledWith({ name: 'Alice' })
  })

  it('extracts English name from "call me" pattern', () => {
    extractFromConversation(convo(['call me Bob', 'hi', 'ok']))
    expect(memoryStore.updateIdentity).toHaveBeenCalledWith({ name: 'Bob' })
  })

  it('updates configStore userName when empty', () => {
    const mockUpdateConfig = vi.fn()
    vi.mocked(useConfigStore.getState).mockReturnValue({
      userName: '',
      updateConfig: mockUpdateConfig,
    } as any)

    extractFromConversation(convo(['我叫绿酱', 'hi', 'ok']))
    expect(mockUpdateConfig).toHaveBeenCalledWith({ userName: '绿酱' })
  })

  it('does not overwrite existing configStore userName', () => {
    const mockUpdateConfig = vi.fn()
    vi.mocked(useConfigStore.getState).mockReturnValue({
      userName: 'ExistingName',
      updateConfig: mockUpdateConfig,
    } as any)

    extractFromConversation(convo(['我叫绿酱', 'hi', 'ok']))
    expect(mockUpdateConfig).not.toHaveBeenCalled()
  })

  it('detects Chinese language from Chinese characters', () => {
    extractFromConversation(convo(['你好世界', '帮我打开浏览器', '谢谢']))
    expect(memoryStore.updateIdentity).toHaveBeenCalledWith({ language: 'zh' })
  })

  it('detects English language from ASCII-only text', () => {
    extractFromConversation(convo(['Hello world!', 'Open Chrome please.', 'Thanks!']))
    expect(memoryStore.updateIdentity).toHaveBeenCalledWith({ language: 'en' })
  })

  it('extracts editor from user message', () => {
    extractFromConversation(convo(['我在用 VS Code 写代码', 'hello', 'ok']))
    expect(memoryStore.updateIdentity).toHaveBeenCalledWith({ editor: 'VS Code' })
  })

  it('extracts editor with English pattern', () => {
    extractFromConversation(convo(['I am using Cursor for this', 'hi', 'ok']))
    expect(memoryStore.updateIdentity).toHaveBeenCalledWith({ editor: 'Cursor' })
  })

  it('extracts location from Chinese pattern', () => {
    extractFromConversation(convo(['我在北京，天气不错', 'other', 'more']))
    expect(memoryStore.updateIdentity).toHaveBeenCalledWith({ location: '北京' })
  })

  it('extracts occupation from Chinese pattern', () => {
    extractFromConversation(convo(['我是程序员', 'hello', 'ok']))
    expect(memoryStore.updateIdentity).toHaveBeenCalledWith({ occupation: '程序员' })
  })

  it('extracts occupation from English pattern', () => {
    extractFromConversation(convo(["I'm a developer", 'hi', 'ok']))
    expect(memoryStore.updateIdentity).toHaveBeenCalledWith({ occupation: 'developer' })
  })

  it('extracts theme preference', () => {
    extractFromConversation(convo(['我喜欢 dark 主题', 'hello', 'ok']))
    expect(memoryStore.updatePreferences).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('extracts light theme preference from Chinese', () => {
    extractFromConversation(convo(['我用 亮色 模式', 'hello', 'ok']))
    expect(memoryStore.updatePreferences).toHaveBeenCalledWith({ theme: 'light' })
  })

  it('extracts interests from "learning" pattern', () => {
    extractFromConversation(convo(['I am learning React Native', 'hi', 'ok']))
    expect(memoryStore.updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ interests: expect.arrayContaining(['React Native']) })
    )
  })

  it('does not duplicate existing interests', () => {
    vi.mocked(memoryStore.getPreferences).mockReturnValue({
      interests: ['React Native'],
    } as any)
    extractFromConversation(convo(['I am learning React Native', 'hi', 'ok']))
    // Should still be called but with same array (no duplicate)
    const calls = vi.mocked(memoryStore.updatePreferences).mock.calls
    const interestCall = calls.find((c) => (c[0] as any).interests)
    if (interestCall) {
      const interests = (interestCall[0] as any).interests as string[]
      const unique = new Set(interests)
      expect(unique.size).toBe(interests.length)
    }
  })

  it('adds an episode with summary when conversation has user intent', () => {
    extractFromConversation(convo(['帮我打开Chrome', '谢谢', '再见']))
    expect(memoryStore.addEpisode).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.any(String),
        userIntent: expect.any(String),
        outcome: expect.any(String),
      })
    )
  })

  it('extracts facts from user text patterns', () => {
    extractFromConversation(convo(['我在用 TypeScript 做开发', 'hello', 'ok']))
    expect(memoryStore.addFact).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'user',
        content: expect.any(String),
        confidence: 0.8,
      })
    )
  })

  it('extracts project facts from Chinese pattern', () => {
    extractFromConversation(convo(['我的项目叫 Niromi', 'hello', 'ok']))
    expect(memoryStore.addFact).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'project',
        content: expect.stringContaining('Niromi'),
        confidence: 0.8,
      })
    )
  })

  it('extracts preference facts from English pattern', () => {
    extractFromConversation(convo(['I prefer dark mode always', 'hi', 'ok']))
    expect(memoryStore.addFact).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'preference',
        confidence: 0.8,
      })
    )
  })

  it('updates frequentTools from tool calls', () => {
    const messages = convo(['do thing', 'more', 'again'])
    messages[1] = msg('assistant', 'done', [
      { id: '1', name: 'list_files', input: {}, status: 'done', result: { success: true, data: null, summary: 'ok' } },
    ])
    messages[3] = msg('assistant', 'done', [
      { id: '2', name: 'open_app', input: {}, status: 'done', result: { success: true, data: null, summary: 'ok' } },
    ])
    extractFromConversation(messages)
    expect(memoryStore.updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ frequentTools: expect.any(Array) })
    )
  })

  it('logs audit entries for completed tool calls', () => {
    const messages = convo(['test', 'hi', 'ok'])
    messages[1] = msg('assistant', 'done', [
      { id: '1', name: 'open_app', input: { app: 'chrome' }, status: 'done', result: { success: true, data: null, summary: 'opened' } },
    ])
    extractFromConversation(messages)
    expect(window.electronAPI?.memoryAddAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: 'open_app',
        resultSuccess: true,
      })
    )
  })
})
