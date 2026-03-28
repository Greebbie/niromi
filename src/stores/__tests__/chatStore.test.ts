import { vi } from 'vitest'
import { useChatStore } from '../chatStore'

describe('chatStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useChatStore.setState({
      messages: [],
      isStreaming: false,
      isChatOpen: false,
      pendingConfirm: null,
      pendingPrompt: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('addMessage', () => {
    it('returns an id string', () => {
      const id = useChatStore.getState().addMessage({ role: 'user', content: 'hello' })
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('adds message with timestamp and id to messages array', () => {
      const now = Date.now()
      useChatStore.getState().addMessage({ role: 'user', content: 'test' })
      const { messages } = useChatStore.getState()
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content).toBe('test')
      expect(messages[0].id).toBeTruthy()
      expect(messages[0].timestamp).toBeGreaterThanOrEqual(now)
    })
  })

  describe('appendToLastMessage', () => {
    it('appends to last message content', () => {
      useChatStore.getState().addMessage({ role: 'assistant', content: 'Hello' })
      useChatStore.getState().appendToLastMessage(' world')
      const { messages } = useChatStore.getState()
      expect(messages[0].content).toBe('Hello world')
    })

    it('does nothing on empty messages', () => {
      useChatStore.getState().appendToLastMessage('text')
      const { messages } = useChatStore.getState()
      expect(messages).toHaveLength(0)
    })
  })

  describe('updateMessage', () => {
    it('updates specific message', () => {
      const id = useChatStore.getState().addMessage({ role: 'user', content: 'original' })
      useChatStore.getState().updateMessage(id, { content: 'updated' })
      const { messages } = useChatStore.getState()
      expect(messages[0].content).toBe('updated')
      expect(messages[0].role).toBe('user')
    })
  })

  describe('addToolCallToMessage', () => {
    it('adds tool call to message', () => {
      const msgId = useChatStore.getState().addMessage({ role: 'assistant', content: '' })
      const toolCall = {
        id: 'tc-1',
        name: 'openApp',
        input: { app: 'Chrome' },
        status: 'pending' as const,
      }
      useChatStore.getState().addToolCallToMessage(msgId, toolCall)
      const { messages } = useChatStore.getState()
      expect(messages[0].toolCalls).toHaveLength(1)
      expect(messages[0].toolCalls![0].name).toBe('openApp')
    })
  })

  describe('updateToolCall', () => {
    it('updates specific tool call', () => {
      const msgId = useChatStore.getState().addMessage({ role: 'assistant', content: '' })
      const toolCall = {
        id: 'tc-1',
        name: 'openApp',
        input: { app: 'Chrome' },
        status: 'pending' as const,
      }
      useChatStore.getState().addToolCallToMessage(msgId, toolCall)
      useChatStore.getState().updateToolCall(msgId, 'tc-1', {
        status: 'done',
        result: { success: true, data: null, summary: 'Opened Chrome' },
      })
      const { messages } = useChatStore.getState()
      expect(messages[0].toolCalls![0].status).toBe('done')
      expect(messages[0].toolCalls![0].result?.summary).toBe('Opened Chrome')
    })
  })

  describe('setStreaming', () => {
    it('setStreaming(true) sets isStreaming', () => {
      useChatStore.getState().setStreaming(true)
      expect(useChatStore.getState().isStreaming).toBe(true)
    })

    it('setStreaming(false) persists immediately (calls storeSet)', () => {
      useChatStore.getState().addMessage({ role: 'user', content: 'hi' })
      ;(window.electronAPI.storeSet as ReturnType<typeof vi.fn>).mockClear()
      useChatStore.getState().setStreaming(false)
      expect(window.electronAPI.storeSet).toHaveBeenCalledWith('chatMessages', expect.any(Array))
    })
  })

  describe('toggleChat', () => {
    it('toggles isChatOpen', () => {
      expect(useChatStore.getState().isChatOpen).toBe(false)
      useChatStore.getState().toggleChat()
      expect(useChatStore.getState().isChatOpen).toBe(true)
      useChatStore.getState().toggleChat()
      expect(useChatStore.getState().isChatOpen).toBe(false)
    })
  })

  describe('deleteMessage', () => {
    it('removes specific message', () => {
      const id1 = useChatStore.getState().addMessage({ role: 'user', content: 'first' })
      useChatStore.getState().addMessage({ role: 'assistant', content: 'second' })
      useChatStore.getState().deleteMessage(id1)
      const { messages } = useChatStore.getState()
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('second')
    })
  })

  describe('clearMessages', () => {
    it('empties messages array and calls storeSet', () => {
      useChatStore.getState().addMessage({ role: 'user', content: 'test' })
      ;(window.electronAPI.storeSet as ReturnType<typeof vi.fn>).mockClear()
      useChatStore.getState().clearMessages()
      expect(useChatStore.getState().messages).toHaveLength(0)
      expect(window.electronAPI.storeSet).toHaveBeenCalledWith('chatMessages', [])
    })
  })

  describe('setPendingConfirm', () => {
    it('stores confirm object', () => {
      const confirm = {
        toolName: 'deleteFiles',
        params: { path: '/tmp/test' },
        riskLevel: 'high' as const,
        description: 'Delete files',
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }
      useChatStore.getState().setPendingConfirm(confirm)
      expect(useChatStore.getState().pendingConfirm).toEqual(confirm)
    })
  })

  describe('setPendingPrompt', () => {
    it('stores prompt string', () => {
      useChatStore.getState().setPendingPrompt('What do you want?')
      expect(useChatStore.getState().pendingPrompt).toBe('What do you want?')
    })
  })
})
