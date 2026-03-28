import { describe, it, expect } from 'vitest'
import { parseSkillMd } from '../skillmd-parser'

const fullFrontmatter = `---
name: 测试技能
nameEn: Test Skill
description: A test skill
icon: 🧪
category: custom
author: Test
version: 1.0.0
riskLevel: low
executionMode: shell
aiInvocable: true
tags: test, automation
---

Some intro text.
`

describe('parseSkillMd', () => {
  describe('frontmatter parsing', () => {
    it('parses name from frontmatter', () => {
      const { meta } = parseSkillMd(fullFrontmatter)
      expect(meta.name).toBe('测试技能')
    })

    it('parses nameEn from frontmatter', () => {
      const { meta } = parseSkillMd(fullFrontmatter)
      expect(meta.nameEn).toBe('Test Skill')
    })

    it('parses description from frontmatter', () => {
      const { meta } = parseSkillMd(fullFrontmatter)
      expect(meta.description).toBe('A test skill')
    })

    it('parses icon from frontmatter', () => {
      const { meta } = parseSkillMd(fullFrontmatter)
      expect(meta.icon).toBe('🧪')
    })

    it('parses author and version', () => {
      const { meta } = parseSkillMd(fullFrontmatter)
      expect(meta.author).toBe('Test')
      expect(meta.version).toBe('1.0.0')
    })

    it('parses valid category', () => {
      const validCategories = ['files', 'apps', 'search', 'create', 'system', 'custom']
      for (const cat of validCategories) {
        const content = `---\ncategory: ${cat}\n---`
        const { meta } = parseSkillMd(content)
        expect(meta.category).toBe(cat)
      }
    })

    it('ignores invalid category', () => {
      const content = `---\ncategory: invalid\n---`
      const { meta } = parseSkillMd(content)
      expect(meta.category).toBeUndefined()
    })

    it('parses valid riskLevel', () => {
      for (const level of ['low', 'medium', 'high']) {
        const content = `---\nriskLevel: ${level}\n---`
        const { meta } = parseSkillMd(content)
        expect(meta.riskLevel).toBe(level)
      }
    })

    it('ignores invalid riskLevel', () => {
      const content = `---\nriskLevel: extreme\n---`
      const { meta } = parseSkillMd(content)
      expect(meta.riskLevel).toBeUndefined()
    })

    it('parses executionMode steps vs shell', () => {
      const stepsContent = `---\nexecutionMode: steps\n---`
      const shellContent = `---\nexecutionMode: shell\n---`
      expect(parseSkillMd(stepsContent).meta.executionMode).toBe('steps')
      expect(parseSkillMd(shellContent).meta.executionMode).toBe('shell')
    })

    it('parses aiInvocable true and false', () => {
      const trueContent = `---\naiInvocable: true\n---`
      const falseContent = `---\naiInvocable: false\n---`
      expect(parseSkillMd(trueContent).meta.aiInvocable).toBe(true)
      expect(parseSkillMd(falseContent).meta.aiInvocable).toBe(false)
    })

    it('converts tags to keywords array', () => {
      const { meta } = parseSkillMd(fullFrontmatter)
      expect(meta.keywords).toEqual(['test', 'automation'])
    })
  })

  describe('script file auto-detection', () => {
    it('detects run.ps1 as powershell', () => {
      const { meta } = parseSkillMd('---\nname: test\n---', ['run.ps1'])
      expect(meta.scriptInterpreter).toBe('powershell')
      expect(meta.scriptPath).toBe('run.ps1')
    })

    it('detects run.js as node', () => {
      const { meta } = parseSkillMd('---\nname: test\n---', ['run.js'])
      expect(meta.scriptInterpreter).toBe('node')
      expect(meta.scriptPath).toBe('run.js')
    })

    it('detects run.py as python', () => {
      const { meta } = parseSkillMd('---\nname: test\n---', ['run.py'])
      expect(meta.scriptInterpreter).toBe('python')
      expect(meta.scriptPath).toBe('run.py')
    })

    it('detects run.sh as bash', () => {
      const { meta } = parseSkillMd('---\nname: test\n---', ['run.sh'])
      expect(meta.scriptInterpreter).toBe('bash')
      expect(meta.scriptPath).toBe('run.sh')
    })

    it('sets executionMode to shell when script file found and no explicit mode', () => {
      const { meta } = parseSkillMd('---\nname: test\n---', ['run.js'])
      expect(meta.executionMode).toBe('shell')
    })

    it('does not override explicit executionMode when script file found', () => {
      const { meta } = parseSkillMd('---\nexecutionMode: steps\n---', ['run.js'])
      expect(meta.executionMode).toBe('steps')
    })
  })

  describe('defaults and auto-generation', () => {
    it('defaults executionMode to steps when no script found', () => {
      const { meta } = parseSkillMd('---\nname: test\n---')
      expect(meta.executionMode).toBe('steps')
    })

    it('auto-generates keywords from name, nameEn, and description when no tags', () => {
      const content = `---\nname: 文件管理\nnameEn: File Manager\ndescription: Manage your files easily\n---`
      const { meta } = parseSkillMd(content)
      expect(meta.keywords).toBeDefined()
      expect(meta.keywords!.some((k) => k.toLowerCase().includes('file'))).toBe(true)
      expect(meta.keywords!.some((k) => k.toLowerCase().includes('manager'))).toBe(true)
    })
  })

  describe('steps extraction', () => {
    it('extracts steps section lines starting with dash', () => {
      // The regex needs a following ## or --- to delimit the steps section,
      // so add a trailing section header
      const content = `---
name: test
---

## Steps
- Step 1: Do something
- Step 2: Do something else

## Notes
`
      const { stepsRaw } = parseSkillMd(content)
      expect(stepsRaw).toBeDefined()
      expect(stepsRaw).toHaveLength(2)
      expect(stepsRaw![0]).toBe('Step 1: Do something')
      expect(stepsRaw![1]).toBe('Step 2: Do something else')
    })

    it('extracts steps starting with asterisk', () => {
      const content = `---\nname: test\n---\n\n## Steps\n* Do A\n* Do B\n\n## End\n`
      const { stepsRaw } = parseSkillMd(content)
      expect(stepsRaw).toBeDefined()
      expect(stepsRaw).toHaveLength(2)
      expect(stepsRaw![0]).toBe('Do A')
    })

    it('extracts steps at end of file without trailing section', () => {
      const content = `---\nname: test\n---\n\n## Steps\n- Final step A\n- Final step B`
      const { stepsRaw } = parseSkillMd(content)
      expect(stepsRaw).toBeDefined()
      expect(stepsRaw).toHaveLength(2)
      expect(stepsRaw![0]).toBe('Final step A')
    })

    it('returns undefined stepsRaw when no steps section', () => {
      const content = `---\nname: test\n---\n\nSome other content`
      const { stepsRaw } = parseSkillMd(content)
      expect(stepsRaw).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('returns meta with defaults for empty content', () => {
      const { meta, stepsRaw } = parseSkillMd('')
      expect(meta.executionMode).toBe('steps')
      expect(stepsRaw).toBeUndefined()
    })
  })
})
