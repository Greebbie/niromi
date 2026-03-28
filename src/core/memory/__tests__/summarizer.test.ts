import { describe, it, expect } from 'vitest'
import { summarizeConversation } from '../summarizer'
import type { Message } from '@/stores/chatStore'

function msg(role: Message['role'], content: string, toolCalls?: Message['toolCalls']): Message {
  return { id: crypto.randomUUID(), role, content, timestamp: Date.now(), toolCalls }
}

describe('summarizeConversation', () => {
  it('extracts userIntent from the first user message', () => {
    const messages: Message[] = [
      msg('user', 'Help me organize my desktop files'),
      msg('assistant', 'Sure, I can help with that.'),
    ]
    const result = summarizeConversation(messages)
    expect(result.userIntent).toBe('Help me organize my desktop files')
  })

  it('truncates userIntent to 60 characters', () => {
    const long = 'A'.repeat(100)
    const messages: Message[] = [
      msg('user', long),
      msg('assistant', 'OK'),
    ]
    const result = summarizeConversation(messages)
    expect(result.userIntent).toHaveLength(60)
    expect(result.userIntent).toBe('A'.repeat(60))
  })

  it('replaces newlines in userIntent with spaces', () => {
    const messages: Message[] = [
      msg('user', 'line one\nline two\nline three'),
      msg('assistant', 'OK'),
    ]
    const result = summarizeConversation(messages)
    expect(result.userIntent).toBe('line one line two line three')
  })

  it('returns empty userIntent when there are no user messages', () => {
    const messages: Message[] = [
      msg('assistant', 'Hello!'),
    ]
    const result = summarizeConversation(messages)
    expect(result.userIntent).toBe('')
  })

  it('collects unique tool names from all messages', () => {
    const messages: Message[] = [
      msg('user', 'open chrome'),
      msg('assistant', 'Opening Chrome', [
        { id: '1', name: 'open_app', input: { app: 'chrome' }, status: 'done', result: { success: true, data: null, summary: 'ok' } },
      ]),
      msg('assistant', 'Also searching', [
        { id: '2', name: 'web_search', input: { q: 'test' }, status: 'done', result: { success: true, data: null, summary: 'ok' } },
        { id: '3', name: 'open_app', input: { app: 'firefox' }, status: 'done', result: { success: true, data: null, summary: 'ok' } },
      ]),
    ]
    const result = summarizeConversation(messages)
    expect(result.toolsUsed).toEqual(['open_app', 'web_search'])
  })

  it('extracts niromiActions from lines containing the clip emoji', () => {
    const messages: Message[] = [
      msg('user', 'clean up'),
      msg('assistant', 'Done!\n\u{1F4CE} Moved 7 files to Documents\n\u{1F4CE} Deleted 3 temp files'),
    ]
    const result = summarizeConversation(messages)
    expect(result.niromiActions).toEqual([
      'Moved 7 files to Documents',
      'Deleted 3 temp files',
    ])
  })

  it('determines outcome as success when last tool call succeeded', () => {
    const messages: Message[] = [
      msg('user', 'do something'),
      msg('assistant', 'done', [
        { id: '1', name: 'list_files', input: {}, status: 'done', result: { success: true, data: [], summary: 'ok' } },
      ]),
    ]
    const result = summarizeConversation(messages)
    expect(result.outcome).toBe('success')
  })

  it('determines outcome as failed when last tool call has error status', () => {
    const messages: Message[] = [
      msg('user', 'do something'),
      msg('assistant', 'error', [
        { id: '1', name: 'list_files', input: {}, status: 'error', result: { success: false, data: null, summary: 'fail' } },
      ]),
    ]
    const result = summarizeConversation(messages)
    expect(result.outcome).toBe('failed')
  })

  it('determines outcome as failed when last tool result.success is false', () => {
    const messages: Message[] = [
      msg('user', 'do something'),
      msg('assistant', 'hmm', [
        { id: '1', name: 'open_app', input: {}, status: 'done', result: { success: true, data: null, summary: 'ok' } },
        { id: '2', name: 'run_shell', input: {}, status: 'done', result: { success: false, data: null, summary: 'exit code 1' } },
      ]),
    ]
    const result = summarizeConversation(messages)
    expect(result.outcome).toBe('failed')
  })

  it('defaults to success when there are no tool calls', () => {
    const messages: Message[] = [
      msg('user', 'hello'),
      msg('assistant', 'hi there'),
    ]
    const result = summarizeConversation(messages)
    expect(result.outcome).toBe('success')
  })

  it('builds a summary string combining intent, tools, and outcome', () => {
    const messages: Message[] = [
      msg('user', 'open Chrome'),
      msg('assistant', 'Done', [
        { id: '1', name: 'open_app', input: {}, status: 'done', result: { success: true, data: null, summary: 'ok' } },
      ]),
    ]
    const result = summarizeConversation(messages)
    expect(result.summary).toContain('open Chrome')
    expect(result.summary).toContain('open_app')
    expect(result.summary).toContain('成功')
  })

  it('includes 失败 in summary when outcome is failed', () => {
    const messages: Message[] = [
      msg('user', 'run build'),
      msg('assistant', 'Failed', [
        { id: '1', name: 'run_shell', input: {}, status: 'error' },
      ]),
    ]
    const result = summarizeConversation(messages)
    expect(result.summary).toContain('失败')
    expect(result.outcome).toBe('failed')
  })
})
