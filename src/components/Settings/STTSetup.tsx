import { useState, useEffect } from 'react'
import { useConfigStore } from '@/stores/configStore'
import { useI18n } from '@/i18n/useI18n'

function StatusDot({ status }: { status: 'ready' | 'loading' | 'error' | 'idle' }) {
  const colors = { ready: 'bg-green-400', loading: 'bg-yellow-400 animate-pulse', error: 'bg-red-400', idle: 'bg-white/20' }
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[status]}`} />
}

export default function STTSetup() {
  const config = useConfigStore()
  const { lang } = useI18n()
  const [status, setStatus] = useState<'checking' | 'not-downloaded' | 'downloading' | 'ready' | 'error'>('checking')
  const [progress, setProgress] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    window.electronAPI?.sttStatus().then((s) => {
      if (!cancelled) setStatus(s.initialized ? 'ready' : 'not-downloaded')
    }).catch(() => {
      if (!cancelled) setStatus('not-downloaded')
    })
    return () => { cancelled = true }
  }, [])

  const handleDownload = async () => {
    const api = window.electronAPI
    if (!api) return
    setStatus('downloading')
    setProgress(0)
    setErrorMsg('')

    api.onSttProgress((p) => {
      if (p.progress != null) setProgress(Math.round(p.progress))
    })

    try {
      const result = await api.sttInit(config.sttModel)
      if (!result.success) {
        setStatus('error')
        setErrorMsg(result.error || '')
      } else {
        setStatus('ready')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setProgress(null)
      api.offSttProgress()
    }
  }

  const handleModelChange = async (newModel: string) => {
    config.setSttModel(newModel)
    // Changed model requires re-download
    if (status === 'ready') {
      setStatus('not-downloaded')
    }
  }

  const dotStatus = status === 'ready' ? 'ready' as const
    : status === 'downloading' ? 'loading' as const
    : status === 'error' ? 'error' as const
    : 'idle' as const

  const modelSizes: Record<string, string> = {
    'Xenova/whisper-tiny': '~75MB',
    'Xenova/whisper-base': '~150MB',
    'Xenova/whisper-small': '~500MB',
  }

  const statusText: Record<string, string> = {
    checking: lang === 'zh' ? '检查中...' : 'Checking...',
    'not-downloaded': lang === 'zh' ? '未下载' : 'Not downloaded',
    downloading: progress != null ? `${progress}%` : (lang === 'zh' ? '下载中...' : 'Downloading...'),
    ready: lang === 'zh' ? '已就绪' : 'Ready',
    error: lang === 'zh' ? '下载失败' : 'Download failed',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <StatusDot status={dotStatus} />
        <span className="text-caption text-white/50">{statusText[status]}</span>
      </div>

      {/* Progress bar */}
      {status === 'downloading' && progress != null && (
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Model selector */}
      <div className="text-caption text-white/40 mb-0.5">{lang === 'zh' ? '模型' : 'Model'}</div>
      <select
        value={config.sttModel}
        onChange={(e) => handleModelChange(e.target.value)}
        disabled={status === 'downloading'}
        className="nr-select"
      >
        <option value="Xenova/whisper-tiny">Tiny (~75MB, {lang === 'zh' ? '快' : 'fast'})</option>
        <option value="Xenova/whisper-base">Base (~150MB, {lang === 'zh' ? '更准' : 'accurate'})</option>
        <option value="Xenova/whisper-small">Small (~500MB, {lang === 'zh' ? '最准' : 'best'})</option>
      </select>

      {/* Language selector — always visible */}
      <div className="text-caption text-white/40 mb-0.5">{lang === 'zh' ? '识别语言' : 'Language'}</div>
      <select
        value={config.sttLanguage}
        onChange={(e) => config.setSttLanguage(e.target.value as 'auto' | 'zh' | 'en')}
        className="nr-select"
      >
        <option value="auto">{lang === 'zh' ? '自动' : 'Auto'}</option>
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>

      {/* Download button */}
      {(status === 'not-downloaded' || status === 'error') && (
        <button
          onClick={handleDownload}
          className="btn-primary w-full"
        >
          {lang === 'zh'
            ? `下载模型 (${modelSizes[config.sttModel] || '~75MB'})`
            : `Download (${modelSizes[config.sttModel] || '~75MB'})`}
        </button>
      )}

      {status === 'error' && errorMsg && (
        <p className="text-caption text-red-400/80">{errorMsg.slice(0, 100)}</p>
      )}

      {/* Hint when ready */}
      {status === 'ready' && (
        <p className="text-caption text-green-400/60">{lang === 'zh' ? '按 Alt+M 或点麦克风图标开始说话' : 'Press Alt+M or click mic to speak'}</p>
      )}
    </div>
  )
}
