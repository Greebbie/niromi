import { useState, useCallback, useRef, useEffect } from 'react'
import { useConfigStore } from '@/stores/configStore'

const errorMessages: Record<string, { zh: string; en: string }> = {
  'not-allowed': { zh: '麦克风权限被拒绝', en: 'Microphone permission denied' },
  'no-speech': { zh: '没有检测到语音', en: 'No speech detected' },
  'audio-capture': { zh: '未找到麦克风', en: 'No microphone found' },
  'download-failed': { zh: '语音模型下载失败', en: 'Voice model download failed' },
  'init-failed': { zh: '语音模型加载失败', en: 'Voice model failed to load' },
  'transcribe-failed': { zh: '语音识别失败', en: 'Transcription failed' },
}

function getErrorMsg(key: string): string {
  const lang = useConfigStore.getState().language
  const msg = errorMessages[key]
  if (msg) return lang === 'en' ? msg.en : msg.zh
  return lang === 'en' ? 'Voice input failed' : '语音输入失败'
}

/**
 * Convert audio Blob (WebM/opus) to 16kHz mono Float32Array for Whisper.
 */
async function blobToFloat32(blob: Blob): Promise<Float32Array> {
  const audioCtx = new AudioContext({ sampleRate: 16000 })
  try {
    const audioBuffer = await audioCtx.decodeAudioData(await blob.arrayBuffer())
    const mono = audioBuffer.getChannelData(0)
    const copy = new Float32Array(mono.length)
    copy.set(mono)
    return copy
  } finally {
    await audioCtx.close()
  }
}

export function useVoiceInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<{ status: string; progress?: number } | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      // Stop MediaRecorder if still active on unmount
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      mediaRecorderRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const showError = useCallback((key: string, detail?: string) => {
    const base = getErrorMsg(key)
    setError(detail ? `${base}: ${detail}` : base)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setError(null), 5000)
  }, [])

  /** Check if STT is ready; if not, auto-download with progress feedback */
  const ensureSTTReady = useCallback(async (): Promise<boolean> => {
    const api = window.electronAPI
    if (!api) return false

    try {
      const status = await api.sttStatus()
      if (status.initialized) return true
    } catch {
      // Status check failed, try init anyway
    }

    // Not ready — auto-download with progress
    setIsInitializing(true)
    setDownloadProgress({ status: 'downloading', progress: 0 })

    const cleanup = () => {
      setIsInitializing(false)
      setDownloadProgress(null)
      api.offSttProgress()
    }

    api.onSttProgress((p) => {
      setDownloadProgress({
        status: p.status,
        progress: p.progress != null ? Math.round(p.progress) : undefined,
      })
    })

    try {
      const model = useConfigStore.getState().sttModel
      const result = await api.sttInit(model)
      cleanup()

      if (!result.success) {
        showError('download-failed', result.error)
        return false
      }
      return true
    } catch (err) {
      cleanup()
      showError('download-failed', err instanceof Error ? err.message : undefined)
      return false
    }
  }, [showError])

  const start = useCallback(async () => {
    setError(null)

    const ready = await ensureSTTReady()
    if (!ready) return

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      showError('not-allowed')
      return
    }

    streamRef.current = stream
    chunksRef.current = []

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null

      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      chunksRef.current = []

      if (blob.size < 1000) {
        showError('no-speech')
        return
      }

      try {
        const api = window.electronAPI
        if (!api) { showError('transcribe-failed'); return }
        const float32 = await blobToFloat32(blob)
        const sttLang = useConfigStore.getState().sttLanguage
        const mainLang = useConfigStore.getState().language
        const effectiveLang = sttLang === 'auto' ? mainLang : sttLang
        const whisperLang = effectiveLang === 'en' ? 'english' : effectiveLang === 'zh' ? 'chinese' : undefined
        const result = await api.sttTranscribe(float32, whisperLang)

        if (result.error) {
          showError('transcribe-failed')
          return
        }

        if (result.text.trim()) {
          onResult(result.text.trim())
        } else {
          showError('no-speech')
        }
      } catch {
        showError('transcribe-failed')
      }
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start()
    setIsListening(true)
  }, [ensureSTTReady, onResult, showError])

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    setIsListening(false)
  }, [])

  const toggle = useCallback(() => {
    if (isListening) stop()
    else start()
  }, [isListening, start, stop])

  return { isListening, isInitializing, downloadProgress, error, toggle }
}
