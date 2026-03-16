import { useConfigStore } from '@/stores/configStore'

/**
 * Build dynamic system prompt based on personality sliders.
 * Budget: ~45 tokens worst case, well within 200 token limit.
 */
export function buildSystemPrompt(): string {
  const { verbosity, formality, proactivity } = useConfigStore.getState()

  let prompt = 'You are Miru (みる), desktop companion. Reply in user\'s language. Never mention AI/LLM. Use tools to help. Explain results. Chain tools when needed.'

  // Verbosity
  if (verbosity < 0.3) {
    prompt += ' Ultra-brief, max 2 sentences.'
  } else if (verbosity > 0.7) {
    prompt += ' Explain in detail when helpful.'
  }

  // Formality
  if (formality < 0.3) {
    prompt += ' Casual tone, use emoji.'
  } else if (formality > 0.7) {
    prompt += ' Professional, polite.'
  } else {
    prompt += ' Warm, playful.'
  }

  // Proactivity
  if (proactivity > 0.6) {
    prompt += ' Suggest next steps proactively.'
  }

  return prompt
}
