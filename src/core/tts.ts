import { useConfigStore } from '@/stores/configStore'

const TTS_RATE = 1.1
const TTS_PITCH = 1.2

// Cache voices to avoid race condition where getVoices() returns empty on first call
let cachedVoices: SpeechSynthesisVoice[] = []

if (typeof window !== 'undefined' && window.speechSynthesis) {
  cachedVoices = window.speechSynthesis.getVoices()
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoices = window.speechSynthesis.getVoices()
  })
}

function getVoiceForLang(lang: string): SpeechSynthesisVoice | undefined {
  // Always get fresh voices (cache is fallback for async-loaded voices)
  const voices = window.speechSynthesis
    ? window.speechSynthesis.getVoices()
    : cachedVoices

  const effective = voices.length > 0 ? voices : cachedVoices

  const prefix = lang === 'en' ? 'en' : 'zh'
  const preferred = effective.find((v) => v.lang.startsWith(prefix))
  if (preferred) return preferred

  // Fallback: system default or first available
  return effective.find((v) => v.default) || effective[0]
}

export function speakText(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()

  // Clean markdown formatting
  const clean = text
    .replace(/[*_~`#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, '. ')

  const utterance = new SpeechSynthesisUtterance(clean)

  const lang = useConfigStore.getState().language
  const voice = getVoiceForLang(lang)
  if (voice) utterance.voice = voice

  // Also set lang attribute for fallback TTS engines
  utterance.lang = lang === 'en' ? 'en-US' : 'zh-CN'
  utterance.rate = TTS_RATE
  utterance.pitch = TTS_PITCH

  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel()
}
