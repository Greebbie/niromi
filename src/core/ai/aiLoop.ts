/**
 * Multi-round AI tool execution loop.
 * Handles streaming, tool calls, loop detection, skill execution.
 * UI updates are done through callbacks to keep this module store-free.
 */
import type { AIProvider, Message as AIMessage, ToolDef, ToolCallRequest, ToolResult } from './provider'
import { pruneMessages, estimateTokens, estimateMessageTokens } from './tokenBudget'
import { toolRegistry } from '@/core/tools'
import { skillRegistry } from '@/core/skills/registry'
import { executeSkill } from '@/core/skills/executor'
import { humanizeError } from '@/core/errors/humanize'
import { describeToolAction } from '@/core/tools/describe'
import { MAX_TOOL_ROUNDS, MAX_CONSECUTIVE_TOOL_FAILURES, TOOL_CALL_TIMEOUT_MS } from '@/core/constants'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)),
  ])
}

export interface AILoopCallbacks {
  appendText: (text: string) => void
  addToolCall: (assistantId: string, tc: { id: string; name: string; input: Record<string, unknown>; status: string }) => void
  updateToolCall: (assistantId: string, tcId: string, update: Record<string, unknown>) => void
  updateMessage: (id: string, update: { content: string }) => void
  createAssistantMessage: () => string
  /** Returns true if user confirmed, false if cancelled */
  confirmHighRisk: (toolName: string, params: Record<string, unknown>, riskLevel: string, description: string) => Promise<boolean>
  onError: (assistantId: string, error: unknown, lang: string) => void
  playSound: (type: 'reply' | 'complete' | 'alert') => void
}

export interface AILoopResult {
  inputTokens: number
  outputTokens: number
  finalText: string
  hadToolCalls: boolean
}

export async function runAILoop(
  provider: AIProvider,
  conversationMessages: AIMessage[],
  allDefs: ToolDef[],
  pruneLimit: number,
  systemTokens: number,
  signal: AbortSignal,
  assistantId: string,
  lang: 'zh' | 'en' | 'auto',
  callbacks: AILoopCallbacks,
): Promise<AILoopResult> {
  // Clone to avoid mutating the caller's array
  const messages = [...conversationMessages]
  let lastToolKey = ''
  let sameToolCount = 0
  const recentToolKeys: string[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let finalText = ''
  let hadToolCalls = false
  let currentAssistantId = assistantId

  let consecutiveToolFailures = 0
  let activeDefs = allDefs

  let round = 0
  while (round < MAX_TOOL_ROUNDS) {
    if (signal.aborted) break

    const prunedMessages = pruneMessages(messages, pruneLimit - systemTokens)

    let roundText = ''
    const roundToolCalls: ToolCallRequest[] = []

    for await (const chunk of provider.streamChat(prunedMessages, activeDefs.length > 0 ? activeDefs : undefined, signal)) {
      switch (chunk.type) {
        case 'text':
          roundText += chunk.text
          callbacks.appendText(chunk.text)
          break
        case 'tool_use':
          roundToolCalls.push({ id: chunk.id, name: chunk.name, input: chunk.input })
          callbacks.addToolCall(currentAssistantId, { id: chunk.id, name: chunk.name, input: chunk.input, status: 'pending' })
          break
        case 'error':
          callbacks.onError(currentAssistantId, chunk.error, lang)
          callbacks.playSound('alert')
          return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, finalText: roundText, hadToolCalls }
        case 'done':
          break
      }
    }

    // No tool calls → AI finished
    if (roundToolCalls.length === 0) {
      finalText = roundText
      totalInputTokens += prunedMessages.reduce((sum, m) => sum + estimateMessageTokens(m), 0)
      totalOutputTokens += estimateTokens(roundText)
      callbacks.playSound('reply')
      break
    }

    hadToolCalls = true

    // Loop detection
    const toolKey = roundToolCalls.map((tc) => `${tc.name}:${JSON.stringify(tc.input)}`).join('|')
    recentToolKeys.push(toolKey)
    if (recentToolKeys.length > 10) recentToolKeys.shift()
    if (toolKey === lastToolKey) {
      sameToolCount++
      if (sameToolCount >= 2) break
    } else {
      sameToolCount = 0
      lastToolKey = toolKey
    }
    if (recentToolKeys.length >= 4) {
      const len = recentToolKeys.length
      if (recentToolKeys[len - 1] === recentToolKeys[len - 3] &&
          recentToolKeys[len - 2] === recentToolKeys[len - 4]) break
    }

    // Append assistant message to conversation
    messages.push({ role: 'assistant', content: roundText, tool_calls: roundToolCalls })

    // Execute each tool call
    const toolResults: ToolResult[] = []
    let pendingImage: string | undefined

    for (const tc of roundToolCalls) {
      if (signal.aborted) break
      callbacks.updateToolCall(currentAssistantId, tc.id, { status: 'running' })

      try {
        // Handle skill calls
        if (tc.name.startsWith('skill_')) {
          const skillId = tc.name.replace('skill_', '')
          const skill = skillRegistry.get(skillId)
          if (skill) {
            const input = (tc.input.input as string) || ''
            let summary = 'done'
            if (skill.execute) {
              await withTimeout(skill.execute(input), TOOL_CALL_TIMEOUT_MS, `skill:${skillId}`)
            } else if (skill.steps) {
              const result = await withTimeout(executeSkill(skill, input), TOOL_CALL_TIMEOUT_MS, `skill:${skillId}`)
              summary = result.summary
            }
            toolResults.push({ tool_use_id: tc.id, content: summary })
            callbacks.updateToolCall(currentAssistantId, tc.id, { status: 'done', result: { success: true, data: null, summary } })
            continue
          }
        }

        // Regular tool call
        const tool = toolRegistry.get(tc.name)
        if (!tool) {
          toolResults.push({ tool_use_id: tc.id, content: `Unknown tool: ${tc.name}` })
          callbacks.updateToolCall(currentAssistantId, tc.id, { status: 'error', result: { success: false, data: null, summary: `Unknown tool: ${tc.name}` } })
          continue
        }

        // High-risk: confirm
        if (tool.riskLevel === 'high') {
          const description = describeToolAction(tc.name, tc.input, lang)
          const confirmed = await callbacks.confirmHighRisk(tc.name, tc.input, tool.riskLevel, description)
          if (!confirmed) {
            toolResults.push({ tool_use_id: tc.id, content: 'User cancelled this action.' })
            callbacks.updateToolCall(currentAssistantId, tc.id, { status: 'error', result: { success: false, data: null, summary: '已取消' } })
            continue
          }
        }

        const result = await withTimeout(toolRegistry.execute(tc.name, tc.input), TOOL_CALL_TIMEOUT_MS, `tool:${tc.name}`)
        const imageUrl = (result.data as Record<string, unknown>)?._image as string | undefined

        if (imageUrl) {
          toolResults.push({ tool_use_id: tc.id, content: result.summary || '[screenshot]' })
          pendingImage = imageUrl
        } else {
          const fullContent = typeof result.data === 'string'
            ? result.data.slice(0, 4000)
            : JSON.stringify(result.data).slice(0, 4000)
          toolResults.push({ tool_use_id: tc.id, content: result.success ? fullContent : `Error: ${result.summary}` })
        }
        callbacks.updateToolCall(currentAssistantId, tc.id, { status: result.success ? 'done' : 'error', result })
        if (result.success) callbacks.playSound('complete')
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        toolResults.push({ tool_use_id: tc.id, content: `Error: ${errMsg}` })
        callbacks.updateToolCall(currentAssistantId, tc.id, { status: 'error', result: { success: false, data: null, summary: errMsg } })
      }
    }

    // Track consecutive tool failure rounds
    const allFailed = toolResults.every((r) => r.content.startsWith('Error:'))
    if (allFailed) {
      consecutiveToolFailures++
      if (consecutiveToolFailures >= MAX_CONSECUTIVE_TOOL_FAILURES) {
        activeDefs = []
      }
    } else {
      consecutiveToolFailures = 0
    }

    // Append tool results to conversation
    messages.push({
      role: 'user',
      content: pendingImage ? '请描述这张截图上的内容' : '',
      images: pendingImage ? [pendingImage] : undefined,
      tool_results: toolResults,
    })
    pendingImage = undefined

    // Compress older rounds' tool results to save tokens (keep latest round full)
    for (let i = 0; i < messages.length - 2; i++) {
      const msg = messages[i]
      if (msg.tool_results) {
        messages[i] = {
          ...msg,
          tool_results: msg.tool_results.map(tr => ({
            ...tr,
            content: tr.content.length > 200 ? tr.content.slice(0, 200) + '...(truncated)' : tr.content,
          })),
        }
      }
    }

    // New assistant placeholder for next round
    currentAssistantId = callbacks.createAssistantMessage()
    round++
  }

  return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, finalText, hadToolCalls }
}
