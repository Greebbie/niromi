import { calculateCost } from '../pricing'

describe('calculateCost', () => {
  it('calculates claude-sonnet-4 pricing correctly', () => {
    const cost = calculateCost(1000, 500, 'claude', 'claude-sonnet-4')
    expect(cost).toBeCloseTo((1000 * 3 + 500 * 15) / 1_000_000)
  })

  it('calculates gpt-4o pricing correctly', () => {
    const cost = calculateCost(2000, 1000, 'openai', 'gpt-4o')
    expect(cost).toBeCloseTo((2000 * 2.5 + 1000 * 10) / 1_000_000)
  })

  it('calculates deepseek-chat pricing correctly', () => {
    const cost = calculateCost(5000, 2000, 'deepseek', 'deepseek-chat')
    expect(cost).toBeCloseTo((5000 * 0.14 + 2000 * 0.28) / 1_000_000)
  })

  it('falls back to provider defaults for unknown model', () => {
    const cost = calculateCost(1000, 1000, 'claude', 'claude-unknown-model')
    expect(cost).toBeCloseTo((1000 * 3 + 1000 * 15) / 1_000_000)
  })

  it('returns 0 for ollama', () => {
    expect(calculateCost(100000, 50000, 'ollama', 'llama3')).toBe(0)
  })

  it('returns 0 for vllm', () => {
    expect(calculateCost(100000, 50000, 'vllm', 'any-model')).toBe(0)
  })

  it('returns 0 for unknown provider', () => {
    expect(calculateCost(1000, 1000, 'nonexistent', 'some-model')).toBe(0)
  })

  it('returns 0 when both token counts are zero', () => {
    expect(calculateCost(0, 0, 'claude', 'claude-sonnet-4')).toBe(0)
  })

  it('handles large token counts', () => {
    const cost = calculateCost(1_000_000, 500_000, 'openai', 'gpt-4o')
    expect(cost).toBeCloseTo(1_000_000 * 2.5 / 1_000_000 + 500_000 * 10 / 1_000_000)
    expect(cost).toBeCloseTo(7.5)
  })
})
