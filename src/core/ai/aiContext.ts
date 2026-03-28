/**
 * AI context gathering — assembles all context before sending to LLM.
 * Pure data assembly, no UI side effects.
 */
import { useConfigStore } from '@/stores/configStore'
import { useChatStore } from '@/stores/chatStore'
import type { AIProvider, Message as AIMessage, ToolDef } from './provider'
import { createProvider } from './createProvider'
import { injectMemory } from '@/core/memory/injector'
import { buildSystemPrompt } from './systemPrompt'
import { toolRegistry } from '@/core/tools'
import { skillRegistry } from '@/core/skills/registry'
import { TOKEN_BUDGETS } from '@/core/constants'
import { estimateTokens } from './tokenBudget'

export interface AIContext {
  provider: AIProvider
  conversationMessages: AIMessage[]
  allDefs: ToolDef[]
  pruneLimit: number
  systemTokens: number
}

/** Get active window context with timeout. Returns empty string on failure. */
export async function getScreenContext(): Promise<string> {
  if (!window.electronAPI) return ''
  try {
    const result = await Promise.race([
      window.electronAPI.getActiveWindow(),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ])
    if (result) return `${result.app} - ${result.title || '(no title)'}`
  } catch (err) { console.warn('[Niromi] getScreenContext:', err) }
  return ''
}

/** Get vision context if enabled (Layer 0: window title, zero tokens). */
export async function getVisionContext(): Promise<string> {
  const config = useConfigStore.getState()
  if (config.visionTarget === 'off') return ''
  if (!window.electronAPI) return ''
  try {
    const targetInfo = config.visionTarget === 'fullscreen'
      ? 'fullscreen'
      : `window: ${config.visionTarget}`
    const win = await window.electronAPI.getActiveWindow()
    return `[Vision ON, target: ${targetInfo}] Active: ${win.app} - ${win.title}. Call describe_screen to capture.`
  } catch { return '' }
}

/**
 * Gather all context needed for AI conversation.
 * Returns null if no API key configured.
 */
export async function gatherAIContext(userText: string): Promise<AIContext | null> {
  const provider = createProvider('chat')
  if (!provider) return null

  const config = useConfigStore.getState()
  const pruneLimit = TOKEN_BUDGETS[config.tokenBudget] || TOKEN_BUDGETS.balanced
  const isSimpleMessage = userText.length < 100 && !/打开|文件|搜索|搜|查|删除|创建|执行|天气|新闻|翻译|看|屏幕|窗口|截图|视觉|open|file|search|delete|create|run|list|move|weather|translate|news|screen|window|see|look|vision/i.test(userText)

  // Vision + screen context
  const visionContext = await getVisionContext()
  const screenContext = visionContext || await getScreenContext()

  // Memory injection (async for FTS5 fact search)
  const maxEpisodes = config.tokenBudget === 'smart' ? 10 : undefined
  const memoryContext = await injectMemory(screenContext, userText, maxEpisodes)

  // Tool + skill defs
  const toolDefs = config.tokenBudget === 'minimal' && isSimpleMessage ? [] : toolRegistry.getToolDefs()
  const skillDefs = skillRegistry.getAll()
    .filter((s) => s.aiInvocable && (s.steps || s.execute))
    .map((s) => ({
      name: `skill_${s.id}`,
      description: s.description,
      parameters: { type: 'object', properties: { input: { type: 'string', description: 'User request context' } } },
    }))
  const allDefs = [...toolDefs, ...skillDefs]

  // Build conversation messages
  const conversationMessages: AIMessage[] = []
  if (memoryContext) {
    conversationMessages.push({ role: 'system', content: memoryContext })
  }
  conversationMessages.push(
    ...useChatStore.getState().messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  )

  const systemTokens = estimateTokens(buildSystemPrompt()) + estimateTokens(JSON.stringify(allDefs))

  return { provider, conversationMessages, allDefs, pruneLimit, systemTokens }
}
