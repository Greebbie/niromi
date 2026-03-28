import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockStore = vi.hoisted(() => ({
  getIdentity: vi.fn((): Record<string, unknown> => ({})),
  getPreferences: vi.fn((): Record<string, unknown> => ({})),
  getEpisodes: vi.fn((): unknown[] => []),
  getFacts: vi.fn((): unknown[] => []),
  searchFacts: vi.fn(async (): Promise<unknown[]> => []),
}))

vi.mock('../store', () => ({
  memoryStore: mockStore,
}))

import { injectMemory } from '../injector'

describe('injectMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.getIdentity.mockReturnValue({})
    mockStore.getPreferences.mockReturnValue({})
    mockStore.getEpisodes.mockReturnValue([])
    mockStore.getFacts.mockReturnValue([])
    mockStore.searchFacts.mockResolvedValue([])
  })

  it('returns empty string when all memory layers are empty', async () => {
    const result = await injectMemory()
    expect(result).toBe('')
  })

  it('injects identity line with name as bare value', async () => {
    mockStore.getIdentity.mockReturnValue({ name: '绿酱', language: 'zh' })
    const result = await injectMemory()
    expect(result).toContain('[User]')
    expect(result).toContain('绿酱')
    expect(result).toContain('language:zh')
  })

  it('formats name without key prefix', async () => {
    mockStore.getIdentity.mockReturnValue({ name: 'Alice' })
    const result = await injectMemory()
    // name should appear as just "Alice", not "name:Alice"
    expect(result).toContain('[User] Alice')
    expect(result).not.toContain('name:Alice')
  })

  it('includes all non-empty identity fields separated by pipes', async () => {
    mockStore.getIdentity.mockReturnValue({
      name: 'Bob',
      language: 'en',
      editor: 'Cursor',
      location: 'Tokyo',
    })
    const result = await injectMemory()
    expect(result).toContain('Bob')
    expect(result).toContain('language:en')
    expect(result).toContain('editor:Cursor')
    expect(result).toContain('location:Tokyo')
    // Verify pipe separation
    expect(result).toMatch(/Bob \| language:en/)
  })

  it('skips identity fields with falsy values', async () => {
    mockStore.getIdentity.mockReturnValue({ name: 'Test', editor: '', language: undefined })
    const result = await injectMemory()
    expect(result).toContain('[User] Test')
    expect(result).not.toContain('editor:')
    expect(result).not.toContain('language:')
  })

  it('injects preferences line with array values joined by commas', async () => {
    mockStore.getPreferences.mockReturnValue({
      theme: 'dark',
      frequentTools: ['list_files', 'open_app'],
    })
    const result = await injectMemory()
    expect(result).toContain('[Prefs]')
    expect(result).toContain('theme:dark')
    expect(result).toContain('frequentTools:list_files,open_app')
  })

  it('searches facts by keywords when userMessage is provided', async () => {
    mockStore.searchFacts.mockResolvedValue([
      { id: 1, category: 'project', content: '用户在做React项目', confidence: 0.8, accessCount: 1 },
    ])
    const result = await injectMemory(undefined, '帮我看看React代码')
    expect(mockStore.searchFacts).toHaveBeenCalled()
    expect(result).toContain('[Facts]')
    expect(result).toContain('React项目')
  })

  it('falls back to recent facts when no keyword search results', async () => {
    mockStore.searchFacts.mockResolvedValue([])
    mockStore.getFacts.mockReturnValue([
      { id: 1, category: 'user', content: '用户喜欢Tailwind', confidence: 0.8, accessCount: 1 },
    ])
    const result = await injectMemory(undefined, 'something')
    expect(result).toContain('[Facts]')
    expect(result).toContain('Tailwind')
  })

  it('shows recent facts when no userMessage is provided', async () => {
    mockStore.getFacts.mockReturnValue([
      { id: 1, category: 'user', content: 'fact one', confidence: 0.8, accessCount: 1 },
      { id: 2, category: 'user', content: 'fact two', confidence: 0.8, accessCount: 1 },
    ])
    const result = await injectMemory()
    expect(result).toContain('[Facts]')
    expect(result).toContain('fact one')
    expect(result).toContain('fact two')
  })

  it('injects recent episodes with outcome', async () => {
    mockStore.getEpisodes.mockReturnValue([
      { timestamp: 1, summary: '帮用户调试了vite配置', outcome: 'success' },
      { timestamp: 2, summary: '搜索天气API', outcome: 'failed' },
    ])
    const result = await injectMemory()
    expect(result).toContain('[Recent]')
    expect(result).toContain('帮用户调试了vite配置(success)')
    expect(result).toContain('搜索天气API(failed)')
  })

  it('respects maxEpisodes parameter', async () => {
    mockStore.getEpisodes.mockReturnValue([
      { timestamp: 1, summary: 'episode1', outcome: 'success' },
    ])
    await injectMemory(undefined, undefined, 2)
    expect(mockStore.getEpisodes).toHaveBeenCalledWith(2)
  })

  it('defaults to 5 max episodes', async () => {
    await injectMemory()
    expect(mockStore.getEpisodes).toHaveBeenCalledWith(5)
  })

  it('injects screen context when provided', async () => {
    const result = await injectMemory('VS Code - main.ts')
    expect(result).toContain('[Screen] VS Code - main.ts')
  })

  it('combines all sections with newlines', async () => {
    mockStore.getIdentity.mockReturnValue({ name: 'Test' })
    mockStore.getPreferences.mockReturnValue({ theme: 'dark' })
    mockStore.getEpisodes.mockReturnValue([
      { timestamp: 1, summary: 'did stuff', outcome: 'success' },
    ])

    const result = await injectMemory('Chrome - Google')
    const lines = result.split('\n')
    expect(lines[0]).toMatch(/^\[User\]/)
    expect(lines[1]).toMatch(/^\[Prefs\]/)
    expect(lines.some((l) => l.startsWith('[Recent]'))).toBe(true)
    expect(lines.some((l) => l.startsWith('[Screen]'))).toBe(true)
  })

  it('truncates long fact content to 60 chars', async () => {
    const longContent = 'A'.repeat(100)
    mockStore.getFacts.mockReturnValue([
      { id: 1, category: 'user', content: longContent, confidence: 0.8, accessCount: 1 },
    ])
    const result = await injectMemory()
    // The fact content should be sliced to 60 chars
    expect(result).toContain('A'.repeat(60))
    expect(result).not.toContain('A'.repeat(61))
  })

  it('handles searchFacts errors gracefully', async () => {
    mockStore.searchFacts.mockRejectedValue(new Error('DB error'))
    mockStore.getFacts.mockReturnValue([
      { id: 1, category: 'user', content: 'fallback fact', confidence: 0.8, accessCount: 1 },
    ])
    const result = await injectMemory(undefined, 'some query')
    // Should fall back to recent facts instead of crashing
    expect(result).toContain('fallback fact')
  })
})
