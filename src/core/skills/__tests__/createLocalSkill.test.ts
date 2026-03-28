import { describe, it, expect, beforeEach, vi } from 'vitest'
import { skillRegistry } from '../registry'
import { createLocalSkill } from '../loader'
import type { CreateLocalSkillConfig } from '../loader'

describe('createLocalSkill', () => {
  const baseConfig: CreateLocalSkillConfig = {
    id: 'my-custom-skill',
    name: 'My Custom Skill',
    nameEn: 'My Custom Skill',
    icon: '\u2699\uFE0F',
    description: 'A test skill',
    category: 'custom',
    aiInvocable: true,
    script: 'console.log("hello")',
    interpreter: 'node',
  }

  beforeEach(() => {
    (skillRegistry as any).skills.clear()
    vi.clearAllMocks()
    ;(window.electronAPI.skillGetDir as any).mockResolvedValue('C:\\Users\\test\\.niromi\\skills')
    ;(window.electronAPI.createDirectory as any).mockResolvedValue(undefined)
    ;(window.electronAPI.writeFile as any).mockResolvedValue(undefined)
  })

  it('writes SKILL.md and script file to disk', async () => {
    const result = await createLocalSkill(baseConfig)

    expect(result).toBe(true)

    // Should create the skill directory
    expect(window.electronAPI.createDirectory).toHaveBeenCalledWith(
      'C:\\Users\\test\\.niromi\\skills/my-custom-skill'
    )

    // Should write SKILL.md
    expect(window.electronAPI.writeFile).toHaveBeenCalledWith(
      'C:\\Users\\test\\.niromi\\skills/my-custom-skill/SKILL.md',
      expect.stringContaining('name: My Custom Skill')
    )

    // Should write run.js (node interpreter)
    expect(window.electronAPI.writeFile).toHaveBeenCalledWith(
      'C:\\Users\\test\\.niromi\\skills/my-custom-skill/run.js',
      'console.log("hello")'
    )
  })

  it('writes run.py for python interpreter', async () => {
    const config = { ...baseConfig, interpreter: 'python' as const }
    await createLocalSkill(config)

    expect(window.electronAPI.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('run.py'),
      'console.log("hello")'
    )
  })

  it('writes run.ps1 for powershell interpreter', async () => {
    const config = { ...baseConfig, interpreter: 'powershell' as const }
    await createLocalSkill(config)

    expect(window.electronAPI.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('run.ps1'),
      'console.log("hello")'
    )
  })

  it('writes run.sh for bash interpreter', async () => {
    const config = { ...baseConfig, interpreter: 'bash' as const }
    await createLocalSkill(config)

    expect(window.electronAPI.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('run.sh'),
      'console.log("hello")'
    )
  })

  it('registers skill in skillRegistry', async () => {
    await createLocalSkill(baseConfig)

    const skill = skillRegistry.get('my-custom-skill')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('My Custom Skill')
    expect(skill!.nameEn).toBe('My Custom Skill')
    expect(skill!.description).toBe('A test skill')
    expect(skill!.category).toBe('custom')
  })

  it('registers with execute function for shell execution', async () => {
    await createLocalSkill(baseConfig)

    const skill = skillRegistry.get('my-custom-skill')
    expect(skill).toBeDefined()
    expect(typeof skill!.execute).toBe('function')
  })

  it('skill with aiInvocable=true is exposed to LLM', async () => {
    await createLocalSkill({ ...baseConfig, aiInvocable: true })

    const skill = skillRegistry.get('my-custom-skill')
    expect(skill).toBeDefined()
    expect(skill!.aiInvocable).toBe(true)
  })

  it('skill with aiInvocable=false is not exposed to LLM', async () => {
    await createLocalSkill({ ...baseConfig, aiInvocable: false })

    const skill = skillRegistry.get('my-custom-skill')
    expect(skill).toBeDefined()
    expect(skill!.aiInvocable).toBe(false)
  })

  it('overwrites existing skill when re-created', async () => {
    await createLocalSkill(baseConfig)
    expect(skillRegistry.get('my-custom-skill')!.description).toBe('A test skill')

    await createLocalSkill({ ...baseConfig, description: 'Updated skill' })
    expect(skillRegistry.get('my-custom-skill')!.description).toBe('Updated skill')
  })

  it('returns false on failure', async () => {
    ;(window.electronAPI.createDirectory as any).mockRejectedValue(new Error('disk full'))

    const result = await createLocalSkill(baseConfig)
    expect(result).toBe(false)
  })

  it('SKILL.md contains expected frontmatter fields', async () => {
    await createLocalSkill(baseConfig)

    const writeFileCalls = vi.mocked(window.electronAPI.writeFile).mock.calls
    const skillMdCall = writeFileCalls.find(c => (c[0] as string).endsWith('SKILL.md'))
    expect(skillMdCall).toBeDefined()

    const content = skillMdCall![1] as string
    expect(content).toContain('name: My Custom Skill')
    expect(content).toContain('nameEn: My Custom Skill')
    expect(content).toContain('icon: \u2699\uFE0F')
    expect(content).toContain('description: A test skill')
    expect(content).toContain('category: custom')
    expect(content).toContain('executionMode: shell')
    expect(content).toContain('aiInvocable: true')
  })
})
