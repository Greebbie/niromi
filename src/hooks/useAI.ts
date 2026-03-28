import { useCallback, useRef } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { useConfigStore } from '@/stores/configStore'
import { useCharacterStore } from '@/stores/characterStore'
import type { Message as AIMessage } from '@/core/ai/provider'
import { createProvider } from '@/core/ai/createProvider'
import { parseLocal } from '@/core/parser/local'
import { toolRegistry } from '@/core/tools'
import { extractFromConversation } from '@/core/memory/extractor'
import { estimateTokens } from '@/core/ai/tokenBudget'
import { skillRegistry } from '@/core/skills/registry'
import { executeSkill } from '@/core/skills/executor'
import { useCostStore } from '@/stores/costStore'
import { speakText } from '@/core/tts'
import { humanizeError } from '@/core/errors/humanize'
import { describeToolAction } from '@/core/tools/describe'
import { playSound } from '@/core/sound'
import { messages } from '@/i18n/messages'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { gatherAIContext } from '@/core/ai/aiContext'
import { runAILoop } from '@/core/ai/aiLoop'

/** Get a translated string using current language setting */
function msg(key: string): string {
  const lang = useConfigStore.getState().language
  const eff = lang === 'en' ? 'en' : lang === 'zh' ? 'zh' : (navigator.language.startsWith('zh') ? 'zh' : 'en')
  return messages[eff]?.[key] || messages.zh[key] || key
}

export function useAI() {
  const abortRef = useRef<AbortController | null>(null)
  const isProcessingRef = useRef(false)

  const sendMessage = useCallback(async (text: string) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    try {
    const chatStore = useChatStore.getState()
    const charStore = useCharacterStore.getState()

    chatStore.addMessage({ role: 'user', content: text })
    chatStore.setStreaming(true)
    charStore.setEmotions({ curiosity: 0.8 })

    // ── Step 1: Try local parser (zero tokens) ──────────────────
    const localMatch = parseLocal(text)
    if (localMatch) {
      if (localMatch.directResponse) {
        chatStore.addMessage({ role: 'assistant', content: localMatch.directResponse })
        charStore.setEmotions({ joy: 0.5 })
        useFeedbackStore.getState().addToast({ icon: '\u26A1', message: localMatch.directResponse.slice(0, 40), type: 'info' })
        return
      }

      if (localMatch.skill) {
        const skill = skillRegistry.get(localMatch.skill)
        if (skill?.execute) {
          try { await skill.execute(text); charStore.setEmotions({ joy: 0.6 }) }
          catch (err) {
            chatStore.addMessage({ role: 'assistant', content: humanizeError(err, useConfigStore.getState().language) })
            charStore.setEmotions({ concern: 0.7 })
          }
          return
        } else if (skill?.steps) {
          try {
            const result = await executeSkill(skill, text, (step, total, summary) => {
              useChatStore.getState().appendToLastMessage(`\n⏳ Step ${step}/${total}: ${summary}`)
            })
            chatStore.addMessage({ role: 'assistant', content: result.success ? `✨ ${result.summary}` : `呜...失败了: ${result.summary}` })
            charStore.setEmotions(result.success ? { joy: 0.6 } : { concern: 0.5 })
          } catch (err) {
            chatStore.addMessage({ role: 'assistant', content: humanizeError(err, useConfigStore.getState().language) })
            charStore.setEmotions({ concern: 0.7 })
          }
          return
        }
      }

      if (localMatch.tool) {
        const tool = toolRegistry.get(localMatch.tool)
        if (tool) {
          if (tool.riskLevel === 'high') {
            const lang = useConfigStore.getState().language
            chatStore.setPendingConfirm({
              toolName: localMatch.tool, params: localMatch.params, riskLevel: tool.riskLevel,
              description: describeToolAction(localMatch.tool, localMatch.params, lang),
              onConfirm: async () => {
                chatStore.setPendingConfirm(null)
                try {
                  const result = await toolRegistry.execute(localMatch.tool!, localMatch.params)
                  chatStore.addMessage({ role: 'assistant', content: result.success ? `✨ ${result.summary}` : `呜...失败了: ${result.summary}` })
                  charStore.setEmotions(result.success ? { joy: 0.6 } : { concern: 0.5 })
                } catch (err) {
                  chatStore.addMessage({ role: 'assistant', content: humanizeError(err, useConfigStore.getState().language) })
                  charStore.setEmotions({ concern: 0.7 })
                }
              },
              onCancel: () => { chatStore.setPendingConfirm(null); chatStore.addMessage({ role: 'assistant', content: msg('ai.cancelled') }) },
            })
            return
          }

          try {
            const result = await toolRegistry.execute(localMatch.tool, localMatch.params)

            // Image result → send to AI vision for description
            const imageUrl = (result.data as Record<string, unknown>)?._image as string | undefined
            if (imageUrl && result.success) {
              const provider = createProvider('vision')
              if (!provider) {
                chatStore.addMessage({ role: 'assistant', content: msg('ai.noApiKey') })
                charStore.setEmotions({ concern: 0.4 })
                return
              }
              const lang = useConfigStore.getState().language
              const prompt = lang === 'en' ? 'Describe what you see on this screen briefly.' : '简要描述一下你在屏幕上看到的内容。'
              const imageMessages: AIMessage[] = [{ role: 'user', content: prompt, images: [imageUrl] }]
              const visionAssistantId = chatStore.addMessage({ role: 'assistant', content: '' })
              const controller = new AbortController()
              abortRef.current?.abort()
              abortRef.current = controller
              try {
                let responseText = ''
                for await (const chunk of provider.streamChat(imageMessages, undefined, controller.signal)) {
                  if (chunk.type === 'text') { responseText += chunk.text; useChatStore.getState().appendToLastMessage(chunk.text) }
                  else if (chunk.type === 'error') {
                    useChatStore.getState().updateMessage(visionAssistantId, { content: humanizeError(chunk.error, useConfigStore.getState().language) })
                    charStore.setEmotions({ concern: 0.7 }); return
                  }
                }
                charStore.setEmotions({ joy: 0.6 }); playSound('reply')
                const { provider: provName, model } = useConfigStore.getState()
                useCostStore.getState().addUsage(estimateTokens(prompt) + 200, estimateTokens(responseText), provName, model)
                if (useConfigStore.getState().ttsEnabled && responseText.length > 0 && responseText.length < 500) speakText(responseText)
              } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') useChatStore.getState().appendToLastMessage('\n(已中断)')
                else useChatStore.getState().updateMessage(visionAssistantId, { content: humanizeError(err, useConfigStore.getState().language) })
              } finally { if (abortRef.current === controller) abortRef.current = null }
              return
            }

            chatStore.addMessage({ role: 'assistant', content: result.success ? `✨ ${result.summary}` : `呜...失败了: ${result.summary}` })
            charStore.setEmotions(result.success ? { joy: 0.6 } : { concern: 0.5 })
          } catch (err) {
            chatStore.addMessage({ role: 'assistant', content: humanizeError(err, useConfigStore.getState().language) })
            charStore.setEmotions({ concern: 0.7 })
          }
          return
        }
      }
    }

    // ── Step 2: Fall through to AI ──────────────────────────────
    const ctx = await gatherAIContext(text)
    if (!ctx) {
      chatStore.addMessage({ role: 'assistant', content: msg('ai.noApiKey') })
      charStore.setEmotions({ concern: 0.5 })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const assistantId = chatStore.addMessage({ role: 'assistant', content: '' })
    const lang = useConfigStore.getState().language

    try {
      const result = await runAILoop(
        ctx.provider,
        ctx.conversationMessages,
        ctx.allDefs,
        ctx.pruneLimit,
        ctx.systemTokens,
        controller.signal,
        assistantId,
        lang,
        {
          appendText: (text) => useChatStore.getState().appendToLastMessage(text),
          addToolCall: (aId, tc) => useChatStore.getState().addToolCallToMessage(aId, tc as any),
          updateToolCall: (aId, tcId, update) => useChatStore.getState().updateToolCall(aId, tcId, update as any),
          updateMessage: (id, update) => useChatStore.getState().updateMessage(id, update),
          createAssistantMessage: () => useChatStore.getState().addMessage({ role: 'assistant', content: '' }),
          confirmHighRisk: (toolName, params, riskLevel, description) => {
            return new Promise<boolean>((resolve) => {
              useChatStore.getState().setPendingConfirm({
                toolName, params, riskLevel: riskLevel as 'low' | 'medium' | 'high', description,
                onConfirm: () => { useChatStore.getState().setPendingConfirm(null); resolve(true) },
                onCancel: () => { useChatStore.getState().setPendingConfirm(null); resolve(false) },
              })
              setTimeout(() => { useChatStore.getState().setPendingConfirm(null); resolve(false) }, 30000)
            })
          },
          onError: (aId, error, lang) => {
            useChatStore.getState().updateMessage(aId, { content: humanizeError(error, lang as any) })
            charStore.setEmotions({ concern: 0.7 })
          },
          playSound,
        },
      )

      // Post-completion
      if (!result.hadToolCalls || result.finalText) {
        charStore.setEmotions({ joy: 0.6 })
        extractFromConversation(useChatStore.getState().messages)
      }

      // Use the routed provider/model for accurate cost tracking
      const cfg = useConfigStore.getState()
      const chatRoute = cfg.modelRouting.chat
      const costProvider = chatRoute?.provider || cfg.provider
      const costModel = chatRoute?.model || cfg.model
      useCostStore.getState().addUsage(result.inputTokens, result.outputTokens, costProvider, costModel)

      if (useConfigStore.getState().ttsEnabled && result.finalText.length > 0 && result.finalText.length < 500) {
        speakText(result.finalText)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        useChatStore.getState().appendToLastMessage('\n(已中断)')
      } else {
        useChatStore.getState().updateMessage(assistantId, { content: humanizeError(err, lang as any) })
        charStore.setEmotions({ concern: 0.7 })
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }

    // Clean orphan empty assistant message
    const lastMsg = useChatStore.getState().messages.find((m) => m.id === assistantId)
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content && (!lastMsg.toolCalls || lastMsg.toolCalls.length === 0)) {
      useChatStore.getState().deleteMessage(assistantId)
    }
    } finally {
      useChatStore.getState().setStreaming(false)
      isProcessingRef.current = false
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  return { sendMessage, abort }
}
