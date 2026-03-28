import { formatMessagesForClaude, formatMessagesForOpenAI } from '../provider'
import type { Message } from '../provider'

describe('formatMessagesForClaude', () => {
  it('formats a basic text message', () => {
    const msgs: Message[] = [{ role: 'user', content: 'hello' }]
    const result = formatMessagesForClaude(msgs)
    expect(result).toEqual([{ role: 'user', content: 'hello' }])
  })

  it('formats assistant message with tool_calls', () => {
    const msgs: Message[] = [{
      role: 'assistant',
      content: 'Let me check',
      tool_calls: [{ id: 'tc1', name: 'web_search', input: { q: 'test' } }],
    }]
    const result = formatMessagesForClaude(msgs)
    expect(result).toEqual([{
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me check' },
        { type: 'tool_use', id: 'tc1', name: 'web_search', input: { q: 'test' } },
      ],
    }])
  })

  it('formats user message with tool_results', () => {
    const msgs: Message[] = [{
      role: 'user',
      content: '',
      tool_results: [{ tool_use_id: 'tc1', content: '{"result":"ok"}' }],
    }]
    const result = formatMessagesForClaude(msgs)
    expect(result).toEqual([{
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'tc1', content: '{"result":"ok"}' },
      ],
    }])
  })

  it('formats message with base64 images', () => {
    const msgs: Message[] = [{
      role: 'user',
      content: 'What is this?',
      images: ['data:image/jpeg;base64,abc123'],
    }]
    const result = formatMessagesForClaude(msgs)
    expect(result).toEqual([{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'abc123' } },
        { type: 'text', text: 'What is this?' },
      ],
    }])
  })
})

describe('formatMessagesForOpenAI', () => {
  it('formats a basic text message', () => {
    const msgs: Message[] = [{ role: 'user', content: 'hi' }]
    const result = formatMessagesForOpenAI(msgs)
    expect(result).toEqual([{ role: 'user', content: 'hi' }])
  })

  it('formats assistant message with tool_calls using function format', () => {
    const msgs: Message[] = [{
      role: 'assistant',
      content: '',
      tool_calls: [{ id: 'tc1', name: 'calc', input: { expr: '1+1' } }],
    }]
    const result = formatMessagesForOpenAI(msgs)
    expect(result).toEqual([{
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: 'tc1',
        type: 'function',
        function: { name: 'calc', arguments: '{"expr":"1+1"}' },
      }],
    }])
  })

  it('formats user message with tool_results and images', () => {
    const msgs: Message[] = [{
      role: 'user',
      content: 'see this',
      tool_results: [{ tool_use_id: 'tc1', content: 'done' }],
      images: ['data:image/png;base64,xyz'],
    }]
    const result = formatMessagesForOpenAI(msgs)
    // tool result comes first, then image as separate user message
    expect(result[0]).toEqual({ role: 'tool', tool_call_id: 'tc1', content: 'done' })
    expect(result[1]).toEqual({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: 'data:image/png;base64,xyz', detail: 'low' } },
        { type: 'text', text: 'see this' },
      ],
    })
  })
})
