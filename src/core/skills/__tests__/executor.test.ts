import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/core/tools/registry', () => ({
  toolRegistry: {
    execute: vi.fn().mockResolvedValue({ success: true, data: 'result', summary: 'done' }),
  },
}))

import { executeSkill } from '../executor'
import { toolRegistry } from '@/core/tools/registry'
import type { SkillDefinition } from '../registry'

const makeSkill = (overrides: Partial<SkillDefinition> = {}): SkillDefinition => ({
  id: 'test-skill',
  name: '测试',
  nameEn: 'Test',
  icon: '🧪',
  category: 'custom' as const,
  description: 'A test skill',
  keywords: ['test'],
  ...overrides,
})

describe('executeSkill', () => {
  beforeEach(() => {
    vi.mocked(toolRegistry.execute).mockReset()
    vi.mocked(toolRegistry.execute).mockResolvedValue({ success: true, data: 'result', summary: 'done' })
  })

  it('single-tool skill delegates to toolRegistry.execute', async () => {
    const skill = makeSkill({ tool: 'open-app' })
    const result = await executeSkill(skill, 'hello')
    expect(toolRegistry.execute).toHaveBeenCalledWith('open-app', { input: 'hello' })
    expect(result.success).toBe(true)
  })

  it('no steps and no tool returns failure', async () => {
    const skill = makeSkill()
    const result = await executeSkill(skill, 'hello')
    expect(result.success).toBe(false)
    expect(result.summary).toBe('Skill has no steps or tool')
  })

  it('multi-step success executes all steps in order', async () => {
    const calls: string[] = []
    vi.mocked(toolRegistry.execute).mockImplementation(async (tool: string) => {
      calls.push(tool)
      return { success: true, data: `${tool}-result`, summary: `${tool} done` }
    })

    const skill = makeSkill({
      steps: [
        { tool: 'step-a', paramMap: { key: 'val-a' } },
        { tool: 'step-b', paramMap: { key: 'val-b' } },
      ],
    })

    const result = await executeSkill(skill, 'input')
    expect(result.success).toBe(true)
    expect(calls).toEqual(['step-a', 'step-b'])
    expect(result.summary).toContain('2 steps')
  })

  it('step failure stops chain and returns failure with step number', async () => {
    vi.mocked(toolRegistry.execute)
      .mockResolvedValueOnce({ success: true, data: 'ok', summary: 'ok' })
      .mockResolvedValueOnce({ success: false, data: null, summary: 'boom' })

    const skill = makeSkill({
      steps: [
        { tool: 'step-a', paramMap: {} },
        { tool: 'step-b', paramMap: {} },
        { tool: 'step-c', paramMap: {} },
      ],
    })

    const result = await executeSkill(skill, 'input')
    expect(result.success).toBe(false)
    expect(result.summary).toContain('Step 2/3 failed')
    expect(toolRegistry.execute).toHaveBeenCalledTimes(2)
  })

  it('conditional step skipped when condition returns false', async () => {
    const skill = makeSkill({
      steps: [
        { tool: 'always-run', paramMap: {} },
        { tool: 'skipped', paramMap: {}, condition: () => false },
        { tool: 'also-runs', paramMap: {} },
      ],
    })

    await executeSkill(skill, 'input')
    const calledTools = vi.mocked(toolRegistry.execute).mock.calls.map((c) => c[0])
    expect(calledTools).toEqual(['always-run', 'also-runs'])
  })

  it('onProgress callback called for each executed step', async () => {
    const progress = vi.fn()
    const skill = makeSkill({
      steps: [
        { tool: 'step-a', paramMap: {} },
        { tool: 'step-b', paramMap: {} },
      ],
    })

    await executeSkill(skill, 'input', progress)
    expect(progress).toHaveBeenCalledTimes(2)
    expect(progress).toHaveBeenCalledWith(1, 2, 'step-a...')
    expect(progress).toHaveBeenCalledWith(2, 2, 'step-b...')
  })

  it('parameter mapping with static values', async () => {
    const skill = makeSkill({
      steps: [{ tool: 'my-tool', paramMap: { path: '/tmp/file.txt', mode: 'read' } }],
    })

    await executeSkill(skill, 'input')
    expect(toolRegistry.execute).toHaveBeenCalledWith('my-tool', { path: '/tmp/file.txt', mode: 'read' })
  })

  it('parameter mapping with function values receives ctx', async () => {
    vi.mocked(toolRegistry.execute).mockResolvedValue({ success: true, data: 'first-result', summary: 'ok' })

    let capturedInput = ''
    let capturedPreviousLength = -1
    const paramFn = vi.fn((ctx) => {
      capturedInput = ctx.input
      capturedPreviousLength = ctx.previousResults.length
      return `processed-${ctx.input}`
    })
    const skill = makeSkill({
      steps: [{ tool: 'my-tool', paramMap: { dynamic: paramFn } }],
    })

    await executeSkill(skill, 'hello')
    expect(paramFn).toHaveBeenCalledTimes(1)
    expect(capturedInput).toBe('hello')
    expect(capturedPreviousLength).toBe(0)
    expect(toolRegistry.execute).toHaveBeenCalledWith('my-tool', { dynamic: 'processed-hello' })
  })
})
