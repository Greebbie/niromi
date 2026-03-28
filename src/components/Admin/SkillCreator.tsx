import { useState, useCallback } from 'react'
import { useI18n } from '@/i18n/useI18n'
import { createLocalSkill } from '@/core/skills/loader'
import { useFeedbackStore } from '@/stores/feedbackStore'

type Interpreter = 'node' | 'python' | 'bash' | 'powershell'

const INTERPRETER_OPTIONS: { value: Interpreter; label: string }[] = [
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'bash', label: 'Bash' },
]

const SCRIPT_PLACEHOLDERS: Record<Interpreter, string> = {
  node: `const input = process.env.NIROMI_PARAM_INPUT || '';
const http = require('http');
// Your API call here
http.get('http://localhost:8080/api?q=' + input, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log(data));
});`,
  python: `import os, urllib.request
inp = os.environ.get('NIROMI_PARAM_INPUT', '')
url = f'http://localhost:8080/api?q={inp}'
with urllib.request.urlopen(url) as r:
    print(r.read().decode())`,
  bash: [
    '#!/bin/bash',
    'INPUT="${NIROMI_PARAM_INPUT:-}"',
    'curl -s "http://localhost:8080/api?q=$INPUT"',
  ].join('\n'),
  powershell: [
    '$input = $env:NIROMI_PARAM_INPUT',
    '$result = Invoke-RestMethod "http://localhost:8080/api?q=$input"',
    'Write-Output $result',
  ].join('\n'),
}

/** Slugify a name into a valid skill ID */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface SkillCreatorProps {
  onCreated?: () => void
}

export default function SkillCreator({ onCreated }: SkillCreatorProps) {
  const { t } = useI18n()
  const addToast = useFeedbackStore((s) => s.addToast)

  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [icon, setIcon] = useState('')
  const [description, setDescription] = useState('')
  const [aiInvocable, setAiInvocable] = useState(true)
  const [interpreter, setInterpreter] = useState<Interpreter>('node')
  const [script, setScript] = useState('')
  const [creating, setCreating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) {
      newErrors.name = t('skillCreator.nameRequired')
    }
    if (!description.trim()) {
      newErrors.description = t('skillCreator.descriptionRequired')
    }
    if (!script.trim()) {
      newErrors.script = t('skillCreator.scriptRequired')
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [name, description, script, t])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return
    setCreating(true)

    const id = slugify(name)
    if (!id) {
      setErrors({ name: t('skill.creator.nameInvalid') || 'Name must contain letters or numbers' })
      setCreating(false)
      return
    }
    const resolvedNameEn = nameEn.trim() || name.trim()

    const success = await createLocalSkill({
      id,
      name: name.trim(),
      nameEn: resolvedNameEn,
      icon: (icon.trim() || '\u2699\uFE0F').replace(/[\r\n]/g, ''),
      description: description.trim(),
      category: 'custom',
      aiInvocable,
      script: script.trim(),
      interpreter,
    })

    setCreating(false)

    if (success) {
      addToast({
        icon: '\u2705',
        message: t('skillCreator.success'),
        type: 'success',
      })
      // Reset form
      setName('')
      setNameEn('')
      setIcon('')
      setDescription('')
      setScript('')
      setAiInvocable(true)
      setInterpreter('node')
      setErrors({})
      onCreated?.()
    } else {
      addToast({
        icon: '\u274C',
        message: t('skillCreator.error'),
        type: 'error',
      })
    }
  }, [name, nameEn, icon, description, aiInvocable, script, interpreter, validate, addToast, t, onCreated])

  return (
    <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-white/10">
      <div className="text-white text-xs font-medium">
        {t('skillCreator.title')}
      </div>

      {/* Name */}
      <div>
        <label className="text-white/50 text-[11px] block mb-1">
          {t('skillCreator.name')} *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('skillCreator.namePlaceholder')}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-blue-400/50"
        />
        {errors.name && (
          <span className="text-red-400 text-[10px]">{errors.name}</span>
        )}
      </div>

      {/* English Name */}
      <div>
        <label className="text-white/50 text-[11px] block mb-1">
          {t('skillCreator.nameEn')}
        </label>
        <input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder={t('skillCreator.nameEnPlaceholder')}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-blue-400/50"
        />
      </div>

      {/* Icon */}
      <div>
        <label className="text-white/50 text-[11px] block mb-1">
          {t('skillCreator.icon')}
        </label>
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder={t('skillCreator.iconPlaceholder')}
          className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-blue-400/50"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-white/50 text-[11px] block mb-1">
          {t('skillCreator.description')} *
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('skillCreator.descriptionPlaceholder')}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-blue-400/50"
        />
        {errors.description && (
          <span className="text-red-400 text-[10px]">{errors.description}</span>
        )}
      </div>

      {/* AI Invocable toggle */}
      <div className="flex items-center gap-2">
        <label className="text-white/50 text-[11px]">
          {t('skillCreator.aiInvocable')}
        </label>
        <button
          type="button"
          onClick={() => setAiInvocable(!aiInvocable)}
          className={`relative w-8 h-4 rounded-full transition-colors ${
            aiInvocable ? 'bg-blue-500' : 'bg-white/10'
          }`}
        >
          <div
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
              aiInvocable ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Interpreter select */}
      <div>
        <label className="text-white/50 text-[11px] block mb-1">
          {t('skillCreator.interpreter')}
        </label>
        <select
          value={interpreter}
          onChange={(e) => setInterpreter(e.target.value as Interpreter)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-blue-400/50"
        >
          {INTERPRETER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-800">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Script content */}
      <div>
        <label className="text-white/50 text-[11px] block mb-1">
          {t('skillCreator.script')} *
        </label>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder={SCRIPT_PLACEHOLDERS[interpreter]}
          rows={8}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-blue-400/50 font-mono resize-y"
        />
        {errors.script && (
          <span className="text-red-400 text-[10px]">{errors.script}</span>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={creating}
        className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg text-blue-300 text-xs transition-colors disabled:opacity-50"
      >
        {creating ? t('skillCreator.creating') : t('skillCreator.create')}
      </button>
    </div>
  )
}
