import type { SkillDefinition, StepContext } from './registry'
import { toolRegistry, type ToolResult } from '@/core/tools/registry'

/**
 * Execute a multi-step skill sequentially.
 * Each step's result feeds into the next step's StepContext.
 */
export async function executeSkill(
  skill: SkillDefinition,
  input: string,
  onProgress?: (step: number, total: number, summary: string) => void
): Promise<ToolResult> {
  // Single-tool skill: delegate directly
  if (!skill.steps || skill.steps.length === 0) {
    if (skill.tool) {
      return toolRegistry.execute(skill.tool, { input })
    }
    return { success: false, data: null, summary: 'Skill has no steps or tool' }
  }

  const ctx: StepContext = { input, previousResults: [] }
  let lastResult: ToolResult = { success: true, data: null, summary: '' }

  for (let i = 0; i < skill.steps.length; i++) {
    const step = skill.steps[i]

    // Check condition
    if (step.condition && !step.condition(ctx)) {
      continue
    }

    // Resolve parameters
    const params: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(step.paramMap)) {
      params[key] = typeof value === 'function' ? value(ctx) : value
    }

    onProgress?.(i + 1, skill.steps.length, `${step.tool}...`)

    const result = await toolRegistry.execute(step.tool, params)
    ctx.previousResults.push(result)
    lastResult = result

    // Stop on failure
    if (!result.success) {
      return {
        success: false,
        data: ctx.previousResults,
        summary: `Step ${i + 1}/${skill.steps.length} failed: ${result.summary}`,
      }
    }
  }

  return {
    success: true,
    data: ctx.previousResults,
    summary: `${skill.name} completed (${skill.steps.length} steps): ${lastResult.summary}`,
  }
}
