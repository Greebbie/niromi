import { describe, it, expect, beforeEach } from 'vitest'
import { skillRegistry, type SkillDefinition } from '../registry'

const makeSkill = (overrides: Partial<SkillDefinition> = {}): SkillDefinition => ({
  id: 'test-skill',
  name: '测试',
  nameEn: 'Test',
  icon: '🧪',
  category: 'custom' as const,
  description: 'A test skill',
  keywords: ['test', 'debug'],
  ...overrides,
})

describe('skillRegistry', () => {
  beforeEach(() => {
    ;(skillRegistry as any).skills.clear()
  })

  it('register adds skill and get returns it', () => {
    const skill = makeSkill()
    skillRegistry.register(skill)
    expect(skillRegistry.get('test-skill')).toBe(skill)
  })

  it('unregister removes skill', () => {
    skillRegistry.register(makeSkill())
    skillRegistry.unregister('test-skill')
    expect(skillRegistry.get('test-skill')).toBeUndefined()
  })

  it('get returns undefined for unknown id', () => {
    expect(skillRegistry.get('nonexistent')).toBeUndefined()
  })

  it('getAll returns all registered skills', () => {
    skillRegistry.register(makeSkill({ id: 'a', name: 'A' }))
    skillRegistry.register(makeSkill({ id: 'b', name: 'B' }))
    expect(skillRegistry.getAll()).toHaveLength(2)
  })

  it('getByCategory filters correctly', () => {
    skillRegistry.register(makeSkill({ id: 'a', category: 'files' }))
    skillRegistry.register(makeSkill({ id: 'b', category: 'custom' }))
    skillRegistry.register(makeSkill({ id: 'c', category: 'files' }))
    expect(skillRegistry.getByCategory('files')).toHaveLength(2)
    expect(skillRegistry.getByCategory('custom')).toHaveLength(1)
  })

  it('search matches by name', () => {
    skillRegistry.register(makeSkill({ id: 'a', name: '文件管理' }))
    skillRegistry.register(makeSkill({ id: 'b', name: '搜索' }))
    const results = skillRegistry.search('文件')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('a')
  })

  it('search matches by nameEn', () => {
    skillRegistry.register(makeSkill({ id: 'a', nameEn: 'File Manager' }))
    skillRegistry.register(makeSkill({ id: 'b', nameEn: 'Search' }))
    const results = skillRegistry.search('file')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('a')
  })

  it('search matches by keyword', () => {
    skillRegistry.register(makeSkill({ id: 'a', keywords: ['automation', 'workflow'] }))
    skillRegistry.register(makeSkill({ id: 'b', keywords: ['debug', 'test'] }))
    const results = skillRegistry.search('automation')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('a')
  })

  it('search with empty query returns all', () => {
    skillRegistry.register(makeSkill({ id: 'a' }))
    skillRegistry.register(makeSkill({ id: 'b' }))
    expect(skillRegistry.search('')).toHaveLength(2)
    expect(skillRegistry.search('  ')).toHaveLength(2)
  })
})
