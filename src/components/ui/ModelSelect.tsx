import { useState, useRef, useEffect } from 'react'
import type { AIProviderType } from '@/stores/configStore'
import { MODEL_PRESETS } from '@/core/ai/models'

interface ModelSelectProps {
  provider: AIProviderType
  value: string
  onChange: (model: string) => void
}

export default function ModelSelect({ provider, value, onChange }: ModelSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const presets = MODEL_PRESETS[provider] || []
  const isPreset = presets.some((m) => m.id === value)
  const currentLabel = presets.find((m) => m.id === value)?.label || value || ''

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsCustomMode(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus custom input when entering custom mode
  useEffect(() => {
    if (isCustomMode && inputRef.current) inputRef.current.focus()
  }, [isCustomMode])

  const handleSelect = (modelId: string) => {
    onChange(modelId)
    setIsOpen(false)
    setIsCustomMode(false)
  }

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onChange(customInput.trim())
      setCustomInput('')
      setIsOpen(false)
      setIsCustomMode(false)
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-3 py-2 rounded-lg text-xs bg-white/10 text-white/80 border border-white/10 hover:border-white/20 transition-colors flex items-center justify-between"
      >
        <span className="truncate">
          {currentLabel || 'Select model...'}
          {!isPreset && value && <span className="text-white/40 ml-1">(custom)</span>}
        </span>
        <span className="text-white/30 ml-2">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border border-white/15 overflow-hidden"
          style={{ background: 'var(--bg-secondary, #1a1a2e)' }}
        >
          {/* Preset options */}
          {presets.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                value === m.id
                  ? 'bg-blue-500/25 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <span>{m.label}</span>
              {m.description && <span className="text-white/30 text-caption">{m.description}</span>}
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Custom input option */}
          {isCustomMode ? (
            <div className="p-2 flex gap-1">
              <input
                ref={inputRef}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit() }}
                placeholder="model-name..."
                className="flex-1 px-2 py-1 rounded text-xs bg-white/10 text-white outline-none border border-white/10 focus:border-blue-400/50 placeholder:text-white/20"
              />
              <button
                onClick={handleCustomSubmit}
                className="px-2 py-1 rounded text-xs bg-blue-500/30 text-white hover:bg-blue-500/40"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCustomMode(true)}
              className="w-full text-left px-3 py-2 text-xs text-white/40 hover:bg-white/10 hover:text-white/60 transition-colors"
            >
              {'\u270F\uFE0F'} 自定义 model...
            </button>
          )}
        </div>
      )}
    </div>
  )
}
