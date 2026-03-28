import { estimateTokens, estimateMessageTokens, pruneMessages } from '../tokenBudget'
import type { Message } from '../provider'

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('estimates pure ASCII text', () => {
    const text = 'hello world'
    expect(estimateTokens(text)).toBe(Math.ceil(11 / 3.5))
  })

  it('estimates pure CJK text', () => {
    const text = '你好世界'
    expect(estimateTokens(text)).toBe(Math.ceil(4 / 1.3))
  })

  it('estimates mixed ASCII and CJK text', () => {
    const text = 'hello你好'
    const expected = Math.ceil(2 / 1.3 + 5 / 3.5)
    expect(estimateTokens(text)).toBe(expected)
  })
})

describe('estimateMessageTokens', () => {
  it('estimates a plain message', () => {
    const msg: Message = { role: 'user', content: 'hello world' }
    expect(estimateMessageTokens(msg)).toBe(estimateTokens('hello world'))
  })

  it('includes tool_calls in estimation', () => {
    const msg: Message = {
      role: 'assistant',
      content: 'thinking',
      tool_calls: [
        { id: 'tc1', name: 'search', input: { query: 'test' } },
      ],
    }
    const expected =
      estimateTokens('thinking') +
      estimateTokens('search') +
      estimateTokens(JSON.stringify({ query: 'test' }))
    expect(estimateMessageTokens(msg)).toBe(expected)
  })

  it('includes tool_results in estimation', () => {
    const msg: Message = {
      role: 'user',
      content: '',
      tool_results: [
        { tool_use_id: 'tc1', content: 'found 3 results' },
      ],
    }
    const expected = estimateTokens('') + estimateTokens('found 3 results')
    expect(estimateMessageTokens(msg)).toBe(expected)
  })
})

describe('pruneMessages', () => {
  const makeMsg = (role: Message['role'], content: string): Message => ({ role, content })

  it('returns empty array as-is', () => {
    expect(pruneMessages([], 1000)).toEqual([])
  })

  it('returns single message as-is', () => {
    const msgs = [makeMsg('user', 'hi')]
    expect(pruneMessages(msgs, 1000)).toEqual(msgs)
  })

  it('keeps system message first when present', () => {
    const system = makeMsg('system', 'you are helpful')
    const user = makeMsg('user', 'hello')
    const result = pruneMessages([system, user], 1000)
    expect(result[0]).toBe(system)
    expect(result).toHaveLength(2)
  })

  it('removes oldest messages when over budget', () => {
    const system = makeMsg('system', 'sys')
    const old1 = makeMsg('user', 'old message one that is somewhat long')
    const old2 = makeMsg('assistant', 'old reply that is also somewhat long')
    const recent = makeMsg('user', 'new')

    const systemTokens = estimateMessageTokens(system)
    const recentTokens = estimateMessageTokens(recent)
    const tightBudget = systemTokens + recentTokens + 1

    const result = pruneMessages([system, old1, old2, recent], tightBudget)
    expect(result[0]).toBe(system)
    expect(result[result.length - 1]).toBe(recent)
    expect(result).not.toContain(old1)
  })

  it('preserves tool_call/tool_result pairing', () => {
    const assistant: Message = {
      role: 'assistant',
      content: 'let me check',
      tool_calls: [{ id: 'tc1', name: 'search', input: { q: 'x' } }],
    }
    const toolResult: Message = {
      role: 'user',
      content: '',
      tool_results: [{ tool_use_id: 'tc1', content: 'result' }],
    }

    const result = pruneMessages([assistant, toolResult], 5000)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(assistant)
    expect(result[1]).toBe(toolResult)
  })

  it('works without system message', () => {
    const msgs = [
      makeMsg('user', 'first'),
      makeMsg('assistant', 'reply'),
      makeMsg('user', 'second'),
    ]
    const result = pruneMessages(msgs, 5000)
    expect(result).toHaveLength(3)
  })
})
