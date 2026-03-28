import { vi, describe, it, expect, beforeEach } from 'vitest'

// We need to isolate the module for each test since it uses module-level state.
// Re-import fresh module per describe block using dynamic import + resetModules.

describe('memoryStore', () => {
  let memoryStore: typeof import('../store').memoryStore

  beforeEach(async () => {
    vi.resetModules()
    // Re-import to get a fresh module with reset cached state
    const mod = await import('../store')
    memoryStore = mod.memoryStore
    vi.clearAllMocks()
  })

  describe('getAll / initial state', () => {
    it('returns empty cache before init', () => {
      const all = memoryStore.getAll()
      expect(all.identity).toEqual({})
      expect(all.preferences).toEqual({})
      expect(all.episodes).toEqual([])
      expect(all.facts).toEqual([])
    })
  })

  describe('identity CRUD', () => {
    it('updates identity and returns updated values', () => {
      memoryStore.updateIdentity({ name: 'Alice', language: 'en' })
      const identity = memoryStore.getIdentity()
      expect(identity.name).toBe('Alice')
      expect(identity.language).toBe('en')
    })

    it('merges identity updates immutably', () => {
      memoryStore.updateIdentity({ name: 'Alice' })
      const ref1 = memoryStore.getIdentity()
      memoryStore.updateIdentity({ language: 'zh' })
      const ref2 = memoryStore.getIdentity()
      expect(ref2.name).toBe('Alice')
      expect(ref2.language).toBe('zh')
      // Should be a new object (immutable update)
      expect(ref1).not.toBe(ref2)
    })

    it('calls saveLegacy when not using sqlite', () => {
      const spy = vi.spyOn(memoryStore, 'saveLegacy')
      memoryStore.updateIdentity({ name: 'Test' })
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('preferences CRUD', () => {
    it('updates and retrieves preferences', () => {
      memoryStore.updatePreferences({ theme: 'dark' })
      expect(memoryStore.getPreferences().theme).toBe('dark')
    })

    it('merges preference updates', () => {
      memoryStore.updatePreferences({ theme: 'dark' })
      memoryStore.updatePreferences({ replyStyle: 'casual' })
      const prefs = memoryStore.getPreferences()
      expect(prefs.theme).toBe('dark')
      expect(prefs.replyStyle).toBe('casual')
    })

    it('handles array preference values', () => {
      memoryStore.updatePreferences({ favoriteTools: ['list_files', 'open_app'] })
      const prefs = memoryStore.getPreferences()
      expect(prefs.favoriteTools).toEqual(['list_files', 'open_app'])
    })
  })

  describe('episodes', () => {
    it('adds an episode from a string', () => {
      memoryStore.addEpisode('User asked about weather')
      const episodes = memoryStore.getEpisodes()
      expect(episodes).toHaveLength(1)
      expect(episodes[0].summary).toBe('User asked about weather')
      expect(episodes[0].timestamp).toBeGreaterThan(0)
    })

    it('adds an episode from an object', () => {
      memoryStore.addEpisode({
        summary: 'Helped with files',
        userIntent: 'organize files',
        toolsUsed: ['list_files', 'move_files'],
        outcome: 'success',
      })
      const episodes = memoryStore.getEpisodes()
      expect(episodes).toHaveLength(1)
      expect(episodes[0].summary).toBe('Helped with files')
      expect(episodes[0].toolsUsed).toEqual(['list_files', 'move_files'])
      expect(episodes[0].outcome).toBe('success')
    })

    it('limits returned episodes by the limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        memoryStore.addEpisode(`Episode ${i}`)
      }
      const limited = memoryStore.getEpisodes(3)
      expect(limited).toHaveLength(3)
      // Should return the last 3 (most recent)
      expect(limited[0].summary).toBe('Episode 7')
      expect(limited[2].summary).toBe('Episode 9')
    })

    it('defaults to 20 episode limit', () => {
      for (let i = 0; i < 25; i++) {
        memoryStore.addEpisode(`Episode ${i}`)
      }
      const episodes = memoryStore.getEpisodes()
      expect(episodes).toHaveLength(20)
    })

    it('caps total stored episodes at 200', () => {
      for (let i = 0; i < 210; i++) {
        memoryStore.addEpisode(`Episode ${i}`)
      }
      // Internal storage is capped at 200
      const all = memoryStore.getEpisodes(300)
      expect(all.length).toBeLessThanOrEqual(200)
    })

    it('clears all episodes', () => {
      memoryStore.addEpisode('test')
      memoryStore.clearEpisodes()
      expect(memoryStore.getEpisodes()).toHaveLength(0)
    })
  })

  describe('facts', () => {
    it('returns empty facts array initially', () => {
      expect(memoryStore.getFacts()).toEqual([])
    })

    it('searchFacts returns empty array when not using sqlite', async () => {
      const results = await memoryStore.searchFacts('test')
      expect(results).toEqual([])
    })
  })

  describe('deleteKey', () => {
    it('removes a key from identity', () => {
      memoryStore.updateIdentity({ name: 'Alice', language: 'en' })
      memoryStore.deleteKey('identity', 'name')
      expect(memoryStore.getIdentity().name).toBeUndefined()
      expect(memoryStore.getIdentity().language).toBe('en')
    })

    it('removes a key from preferences', () => {
      memoryStore.updatePreferences({ theme: 'dark', replyStyle: 'casual' })
      memoryStore.deleteKey('preferences', 'theme')
      expect(memoryStore.getPreferences().theme).toBeUndefined()
      expect(memoryStore.getPreferences().replyStyle).toBe('casual')
    })
  })

  describe('clearAll', () => {
    it('resets all memory to empty state', () => {
      memoryStore.updateIdentity({ name: 'Alice' })
      memoryStore.updatePreferences({ theme: 'dark' })
      memoryStore.addEpisode('test episode')
      memoryStore.clearAll()

      const all = memoryStore.getAll()
      expect(all.identity).toEqual({})
      expect(all.preferences).toEqual({})
      expect(all.episodes).toEqual([])
      expect(all.facts).toEqual([])
    })

    it('calls storeDelete to remove legacy data', () => {
      memoryStore.clearAll()
      expect(window.electronAPI?.storeDelete).toHaveBeenCalledWith('niromi-memory')
    })
  })

  describe('saveLegacy', () => {
    it('persists identity, preferences, and episodes via storeSet', () => {
      memoryStore.updateIdentity({ name: 'Test' })
      memoryStore.updatePreferences({ theme: 'light' })
      memoryStore.addEpisode('ep1')

      // saveLegacy is called internally; verify storeSet was called
      expect(window.electronAPI?.storeSet).toHaveBeenCalledWith(
        'niromi-memory',
        expect.objectContaining({
          identity: expect.objectContaining({ name: 'Test' }),
          preferences: expect.objectContaining({ theme: 'light' }),
          episodes: expect.arrayContaining([
            expect.objectContaining({ summary: 'ep1' }),
          ]),
        })
      )
    })
  })

  describe('init with SQLite', () => {
    it('loads data from electronAPI when memoryGetIdentity is available', async () => {
      const api = window.electronAPI!
      vi.mocked(api.memoryGetIdentity).mockResolvedValue({ name: 'Bob', language: 'zh' })
      vi.mocked(api.memoryGetPreferences).mockResolvedValue({ theme: '"dark"' })
      vi.mocked(api.memoryGetEpisodes).mockResolvedValue([
        { id: 1, timestamp: 100, summary: 'test ep', userIntent: 'do thing', toolsUsed: '["list_files"]', outcome: 'success' },
      ])
      vi.mocked(api.memoryGetRecentFacts).mockResolvedValue([
        { id: 1, category: 'user', content: 'test fact', confidence: 0.8, accessCount: 1 },
      ])
      vi.mocked(api.storeGet).mockResolvedValue(null)

      await memoryStore.init()

      expect(memoryStore.getIdentity().name).toBe('Bob')
      expect(memoryStore.getPreferences().theme).toBe('dark')
      expect(memoryStore.getEpisodes()).toHaveLength(1)
      expect(memoryStore.getEpisodes()[0].toolsUsed).toEqual(['list_files'])
      expect(memoryStore.getFacts()).toHaveLength(1)
    })

    it('falls back to JSON store when SQLite is unavailable', async () => {
      const api = window.electronAPI!
      vi.mocked(api.memoryGetIdentity).mockResolvedValue(null as any)
      vi.mocked(api.storeGet).mockResolvedValue({
        identity: { name: 'Fallback' },
        preferences: { theme: 'light' },
        episodes: [{ timestamp: 1, summary: 'old ep', outcome: 'success' }],
      })

      await memoryStore.init()

      expect(memoryStore.getIdentity().name).toBe('Fallback')
      expect(memoryStore.getPreferences().theme).toBe('light')
    })

    it('uses empty cache when both SQLite and JSON store fail', async () => {
      const api = window.electronAPI!
      vi.mocked(api.memoryGetIdentity).mockRejectedValue(new Error('no sqlite'))
      vi.mocked(api.storeGet).mockRejectedValue(new Error('no store'))

      await memoryStore.init()

      expect(memoryStore.getIdentity()).toEqual({})
      expect(memoryStore.getEpisodes()).toEqual([])
    })
  })
})
