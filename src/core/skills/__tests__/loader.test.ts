import { describe, it, expect, beforeEach, vi } from 'vitest'
import { skillRegistry } from '../registry'
import { initMarketplaceSkills, installSkill, uninstallSkill, fetchMarketplaceIndex } from '../loader'

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({
    version: 1,
    updatedAt: '2026-01-01',
    skills: [{ id: 'remote-1', name: 'Remote Skill' }],
  }),
})

describe('loader', () => {
  beforeEach(() => {
    (skillRegistry as any).skills.clear()
    vi.clearAllMocks()
    ;(window.electronAPI.skillScanLocal as any).mockResolvedValue([])
    ;(window.electronAPI.storeGet as any).mockResolvedValue(null)
    ;(window.electronAPI.skillGetDir as any).mockResolvedValue('C:\\Users\\test\\.niromi\\skills')
  })

  describe('initMarketplaceSkills', () => {
    it('registers nothing when no local skills exist', async () => {
      await initMarketplaceSkills()
      expect(skillRegistry.getAll()).toHaveLength(0)
    })

    it('parses SKILL.md and registers local skill', async () => {
      ;(window.electronAPI.skillScanLocal as any).mockResolvedValue([
        {
          id: 'local-skill',
          skillMdContent: '---\nname: Local Skill\nnameEn: Local Skill\ncategory: custom\n---',
          files: ['SKILL.md'],
        },
      ])

      await initMarketplaceSkills()

      const skill = skillRegistry.get('local-skill')
      expect(skill).toBeDefined()
      expect(skill!.name).toBe('Local Skill')
      expect(skill!.category).toBe('custom')
    })

    it('skips already registered skills', async () => {
      // Pre-register a skill
      skillRegistry.register({
        id: 'local-skill',
        name: 'Already Registered',
        nameEn: 'Already Registered',
        icon: '🔧',
        category: 'custom',
        description: '',
        keywords: [],
      })

      ;(window.electronAPI.skillScanLocal as any).mockResolvedValue([
        {
          id: 'local-skill',
          skillMdContent: '---\nname: Different Name\nnameEn: Different Name\ncategory: custom\n---',
          files: ['SKILL.md'],
        },
      ])

      await initMarketplaceSkills()

      // Should still have the original name, not overwritten
      const skill = skillRegistry.get('local-skill')
      expect(skill!.name).toBe('Already Registered')
    })
  })

  describe('installSkill', () => {
    const mockEntry = {
      id: 'test-skill',
      name: 'Test Skill',
      nameEn: 'Test Skill',
      icon: '🧪',
      category: 'custom' as const,
      description: 'A test skill',
      author: 'test',
      version: '1.0.0',
      source: 'niromi-registry' as const,
      repoUrl: 'https://example.com/repo',
      riskLevel: 'low' as const,
      tags: ['test'],
    }

    it('calls electronAPI.skillInstall', async () => {
      ;(window.electronAPI.skillInstall as any).mockResolvedValue({
        success: true,
        skillDir: 'C:\\skills\\test',
      })
      ;(window.electronAPI.skillScanLocal as any).mockResolvedValue([
        {
          id: 'test-skill',
          skillMdContent: '---\nname: Test Skill\nnameEn: Test Skill\ncategory: custom\n---',
          files: ['SKILL.md'],
        },
      ])

      await installSkill(mockEntry)

      expect(window.electronAPI.skillInstall).toHaveBeenCalledWith(
        expect.objectContaining({
          repoUrl: 'https://example.com/repo',
          skillId: 'test-skill',
        }),
      )
    })

    it('registers skill after download', async () => {
      ;(window.electronAPI.skillInstall as any).mockResolvedValue({
        success: true,
        skillDir: 'C:\\skills\\test',
      })
      ;(window.electronAPI.skillScanLocal as any).mockResolvedValue([
        {
          id: 'test-skill',
          skillMdContent: '---\nname: Test Skill\nnameEn: Test Skill\ncategory: custom\n---',
          files: ['SKILL.md'],
        },
      ])

      const result = await installSkill(mockEntry)

      expect(result).toBe(true)
      expect(skillRegistry.get('test-skill')).toBeDefined()
    })

    it('returns false when skillInstall fails', async () => {
      ;(window.electronAPI.skillInstall as any).mockResolvedValue({
        success: false,
      })

      const result = await installSkill(mockEntry)

      expect(result).toBe(false)
      expect(skillRegistry.get('test-skill')).toBeUndefined()
    })
  })

  describe('uninstallSkill', () => {
    it('unregisters from skillRegistry', async () => {
      skillRegistry.register({
        id: 'to-remove',
        name: 'Remove Me',
        nameEn: 'Remove Me',
        icon: '🗑️',
        category: 'custom',
        description: '',
        keywords: [],
      })

      await uninstallSkill('to-remove')

      expect(skillRegistry.get('to-remove')).toBeUndefined()
    })

    it('updates installed list in store', async () => {
      ;(window.electronAPI.storeGet as any).mockResolvedValue([
        { id: 'to-remove', name: 'R', version: '1', source: 'local', installedAt: 1, skillDir: '' },
        { id: 'keep', name: 'K', version: '1', source: 'local', installedAt: 1, skillDir: '' },
      ])

      await uninstallSkill('to-remove')

      expect(window.electronAPI.storeSet).toHaveBeenCalledWith(
        'marketplace-installed',
        expect.arrayContaining([expect.objectContaining({ id: 'keep' })]),
      )
      // The removed skill should not be in the updated list
      const storeSetCalls = vi.mocked(window.electronAPI.storeSet).mock.calls
      const installedCall = storeSetCalls.find((c) => c[0] === 'marketplace-installed')
      expect(installedCall).toBeDefined()
      const updatedList = installedCall![1] as Array<{ id: string }>
      expect(updatedList.find((r) => r.id === 'to-remove')).toBeUndefined()
    })
  })

  describe('fetchMarketplaceIndex', () => {
    it('returns skills from remote index', async () => {
      const index = await fetchMarketplaceIndex()

      expect(index.version).toBe(1)
      expect(index.skills).toHaveLength(1)
      expect(index.skills[0].id).toBe('remote-1')
    })

    it('returns empty index on fetch failure', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network error'))

      const index = await fetchMarketplaceIndex()

      expect(index.version).toBe(0)
      expect(index.skills).toHaveLength(0)
    })
  })
})
