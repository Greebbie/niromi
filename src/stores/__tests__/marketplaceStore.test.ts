import { vi } from 'vitest'

vi.mock('@/core/skills/loader', () => ({
  installSkill: vi.fn().mockResolvedValue(true),
  uninstallSkill: vi.fn().mockResolvedValue(undefined),
  fetchMarketplaceIndex: vi.fn().mockResolvedValue({ skills: [{ id: 'test-skill', name: 'Test' }] }),
}))

import { useMarketplaceStore } from '../marketplaceStore'
import { installSkill, uninstallSkill, fetchMarketplaceIndex } from '@/core/skills/loader'

describe('marketplaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMarketplaceStore.setState({
      remoteSkills: [],
      installedSkills: [],
      isFetching: false,
      lastFetched: null,
    })
  })

  describe('fetchIndex', () => {
    it('sets remoteSkills from fetched index', async () => {
      await useMarketplaceStore.getState().fetchIndex()
      const state = useMarketplaceStore.getState()
      expect(state.remoteSkills).toEqual([{ id: 'test-skill', name: 'Test' }])
    })

    it('sets isFetching during fetch', async () => {
      // Replace fetchMarketplaceIndex with a delayed version so we can observe isFetching
      let resolveFetch!: (value: any) => void
      ;(fetchMarketplaceIndex as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => new Promise((resolve) => { resolveFetch = resolve })
      )

      const promise = useMarketplaceStore.getState().fetchIndex()
      expect(useMarketplaceStore.getState().isFetching).toBe(true)

      resolveFetch({ skills: [] })
      await promise
      expect(useMarketplaceStore.getState().isFetching).toBe(false)
    })

    it('sets lastFetched timestamp', async () => {
      const before = Date.now()
      await useMarketplaceStore.getState().fetchIndex()
      const state = useMarketplaceStore.getState()
      expect(state.lastFetched).toBeGreaterThanOrEqual(before)
      expect(state.lastFetched).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('install', () => {
    it('calls installSkill and refreshes installed list', async () => {
      const entry = { id: 'new-skill', name: 'New' } as any
      ;(window.electronAPI.storeGet as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 'new-skill', name: 'New', version: '1.0', installedAt: Date.now() },
      ])

      const result = await useMarketplaceStore.getState().install(entry)
      expect(result).toBe(true)
      expect(installSkill).toHaveBeenCalledWith(entry)
      expect(useMarketplaceStore.getState().installedSkills).toHaveLength(1)
    })
  })

  describe('uninstall', () => {
    it('calls uninstallSkill and refreshes installed list', async () => {
      useMarketplaceStore.setState({
        installedSkills: [{ id: 'old-skill', name: 'Old', version: '1.0', source: 'niromi-registry', installedAt: 0, skillDir: '' }],
      })
      ;(window.electronAPI.storeGet as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])

      await useMarketplaceStore.getState().uninstall('old-skill')
      expect(uninstallSkill).toHaveBeenCalledWith('old-skill')
      expect(useMarketplaceStore.getState().installedSkills).toHaveLength(0)
    })
  })

  describe('isInstalled', () => {
    it('returns true for installed skill', () => {
      useMarketplaceStore.setState({
        installedSkills: [{ id: 'my-skill', name: 'My', version: '1.0', source: 'niromi-registry', installedAt: 0, skillDir: '' }],
      })
      expect(useMarketplaceStore.getState().isInstalled('my-skill')).toBe(true)
    })

    it('returns false for uninstalled skill', () => {
      useMarketplaceStore.setState({ installedSkills: [] })
      expect(useMarketplaceStore.getState().isInstalled('missing-skill')).toBe(false)
    })
  })
})
