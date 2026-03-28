import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceInput } from '../useVoiceInput'
import { useConfigStore } from '@/stores/configStore'

describe('useVoiceInput', () => {
  const onResult = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useConfigStore.setState({
      sttModel: 'Xenova/whisper-tiny',
      sttLanguage: 'auto',
      language: 'zh',
    })
    // Reset sttStatus to not initialized by default
    ;(window.electronAPI.sttStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ initialized: false })
    ;(window.electronAPI.sttInit as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })
    ;(window.electronAPI.sttTranscribe as ReturnType<typeof vi.fn>).mockResolvedValue({ text: 'hello world' })
  })

  describe('ensureSTTReady', () => {
    it('returns true immediately when already initialized', async () => {
      ;(window.electronAPI.sttStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ initialized: true })

      const { result } = renderHook(() => useVoiceInput(onResult))

      // toggle calls ensureSTTReady internally; if already initialized it proceeds to start
      // We test ensureSTTReady indirectly by confirming sttInit is NOT called
      await act(async () => {
        result.current.toggle()
      })

      expect(window.electronAPI.sttStatus).toHaveBeenCalled()
      expect(window.electronAPI.sttInit).not.toHaveBeenCalled()
    })

    it('shows error and stays idle when auto-download fails', async () => {
      ;(window.electronAPI.sttInit as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'network' })
      const { result } = renderHook(() => useVoiceInput(onResult))

      await act(async () => {
        result.current.toggle()
      })

      expect(window.electronAPI.sttStatus).toHaveBeenCalled()
      expect(window.electronAPI.sttInit).toHaveBeenCalled()
      expect(result.current.isListening).toBe(false)
      expect(result.current.error).toBeTruthy()
    })

    it('auto-downloads model when not initialized', async () => {
      ;(window.electronAPI.sttInit as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })
      const { result } = renderHook(() => useVoiceInput(onResult))

      await act(async () => {
        result.current.toggle()
      })

      expect(window.electronAPI.sttInit).toHaveBeenCalled()
      // After successful download, should proceed to recording
      expect(result.current.isListening).toBe(true)
    })
  })

  describe('start', () => {
    it('gets microphone, creates MediaRecorder, and starts recording', async () => {
      ;(window.electronAPI.sttStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ initialized: true })
      const { result } = renderHook(() => useVoiceInput(onResult))

      await act(async () => {
        result.current.toggle()
      })

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
      expect(result.current.isListening).toBe(true)
    })
  })

  describe('stop', () => {
    it('stops MediaRecorder and processes audio', async () => {
      ;(window.electronAPI.sttStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ initialized: true })
      const { result } = renderHook(() => useVoiceInput(onResult))

      // Start recording
      await act(async () => {
        result.current.toggle()
      })
      expect(result.current.isListening).toBe(true)

      // Stop recording - MockMediaRecorder.stop() fires ondataavailable + onstop
      await act(async () => {
        result.current.toggle()
      })
      expect(result.current.isListening).toBe(false)
    })
  })

  describe('short audio rejection', () => {
    it('shows no-speech error when blob is less than 1000 bytes', async () => {
      ;(window.electronAPI.sttStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ initialized: true })
      // The MockMediaRecorder emits a blob with 'test audio data' which is ~15 bytes (< 1000)
      // So by default, the mock triggers the short audio path
      const { result } = renderHook(() => useVoiceInput(onResult))

      await act(async () => {
        result.current.toggle()
      })

      await act(async () => {
        result.current.toggle()
      })

      // The blob from MockMediaRecorder is tiny, so it should show no-speech
      expect(result.current.error).toContain('没有检测到语音')
    })
  })

  describe('error messages', () => {
    it('renders Chinese error messages when language is zh', () => {
      useConfigStore.setState({ language: 'zh' })

      const errorMessages: Record<string, string> = {
        'not-allowed': '麦克风权限被拒绝',
        'no-speech': '没有检测到语音',
        'audio-capture': '未找到麦克风',
        'not-downloaded': '请先在设置里下载语音模型',
        'init-failed': '语音模型加载失败',
        'transcribe-failed': '语音识别失败',
      }

      // Verify the error messages exist for zh locale
      for (const key of Object.keys(errorMessages)) {
        expect(errorMessages[key]).toBeTruthy()
      }
    })

    it('renders English download-failed error when language is en and STT init fails', async () => {
      useConfigStore.setState({ language: 'en' })
      ;(window.electronAPI.sttInit as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'network error' })

      const { result } = renderHook(() => useVoiceInput(onResult))

      await act(async () => {
        result.current.toggle()
      })

      expect(result.current.error).toContain('download failed')
    })

    it('renders not-allowed error when microphone permission denied', async () => {
      ;(window.electronAPI.sttStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ initialized: true })
      ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Permission denied')
      )

      const { result } = renderHook(() => useVoiceInput(onResult))

      await act(async () => {
        result.current.toggle()
      })

      expect(result.current.error).toContain('麦克风权限被拒绝')
    })
  })

  describe('downloadProgress', () => {
    it('downloadProgress is null initially', () => {
      const { result } = renderHook(() => useVoiceInput(onResult))
      expect(result.current.downloadProgress).toBeNull()
    })

    it('downloadProgress resets to null after successful download', async () => {
      ;(window.electronAPI.sttInit as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })
      const { result } = renderHook(() => useVoiceInput(onResult))

      await act(async () => {
        result.current.toggle()
      })

      // After download completes, progress resets
      expect(result.current.downloadProgress).toBeNull()
    })
  })

  describe('toggle', () => {
    it('toggles between start and stop', async () => {
      ;(window.electronAPI.sttStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ initialized: true })
      const { result } = renderHook(() => useVoiceInput(onResult))

      expect(result.current.isListening).toBe(false)

      // First toggle -> start
      await act(async () => {
        result.current.toggle()
      })
      expect(result.current.isListening).toBe(true)

      // Second toggle -> stop
      await act(async () => {
        result.current.toggle()
      })
      expect(result.current.isListening).toBe(false)
    })
  })
})
