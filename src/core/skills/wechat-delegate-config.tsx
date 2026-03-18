import { useState } from 'react'
import { useAdminStore } from '@/stores/adminStore'
import { useI18n } from '@/i18n/useI18n'
import type { DelegationLogEntry } from '@/stores/adminStore'

interface Props {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

export default function WeChatDelegateConfig({ config, onChange }: Props) {
  const { t } = useI18n()
  const delegationLog = useAdminStore((s) => s.delegationLog)
  const clearDelegationLog = useAdminStore((s) => s.clearDelegationLog)
  const [newKeyword, setNewKeyword] = useState('')

  const useAI = (config.useAI as boolean) ?? true
  const replyTemplate = (config.replyTemplate as string) ?? ''
  const idleMinutes = (config.idleMinutes as number) ?? 5
  const requireConfirm = (config.requireConfirm as boolean) ?? true
  const sensitiveKeywords = (config.sensitiveKeywords as string[]) ?? []
  const sensitiveInstruction = (config.sensitiveInstruction as string) ?? ''
  const maxRepliesPerContact = (config.maxRepliesPerContact as number) ?? 3

  const wechatLogs = delegationLog
    .filter((e) => e.app === 'wechat')
    .slice(-20)
    .reverse()

  const update = (patch: Record<string, unknown>) => {
    onChange({ ...config, ...patch })
  }

  const addKeyword = () => {
    const kw = newKeyword.trim()
    if (!kw || sensitiveKeywords.includes(kw)) return
    update({ sensitiveKeywords: [...sensitiveKeywords, kw] })
    setNewKeyword('')
  }

  const removeKeyword = (kw: string) => {
    update({ sensitiveKeywords: sensitiveKeywords.filter((k) => k !== kw) })
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Reply mode */}
      <div>
        <label className="text-white/50 text-[10px] uppercase tracking-wider">
          {t('skill.wechat.replyMode')}
        </label>
        <div className="flex gap-3 mt-1">
          <label className="flex items-center gap-1.5 text-white/70 cursor-pointer">
            <input
              type="radio"
              checked={!useAI}
              onChange={() => update({ useAI: false })}
              className="accent-blue-400"
            />
            {t('skill.wechat.fixedTemplate')}
          </label>
          <label className="flex items-center gap-1.5 text-white/70 cursor-pointer">
            <input
              type="radio"
              checked={useAI}
              onChange={() => update({ useAI: true })}
              className="accent-blue-400"
            />
            AI
          </label>
        </div>
      </div>

      {/* Reply template */}
      <div>
        <label className="text-white/50 text-[10px] uppercase tracking-wider">
          {useAI ? t('skill.wechat.fallbackTemplate') : t('skill.wechat.replyTemplate')}
        </label>
        <textarea
          value={replyTemplate}
          onChange={(e) => update({ replyTemplate: e.target.value })}
          rows={2}
          className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-blue-400/50 resize-none"
          placeholder={t('skill.wechat.templatePlaceholder')}
        />
      </div>

      {/* Idle + max replies row */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-white/50 text-[10px] uppercase tracking-wider">
            {t('skill.wechat.idleMinutes')}
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={idleMinutes}
            onChange={(e) => update({ idleMinutes: parseInt(e.target.value) || 0 })}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-blue-400/50"
          />
        </div>
        <div className="flex-1">
          <label className="text-white/50 text-[10px] uppercase tracking-wider">
            {t('skill.wechat.maxReplies')}
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={maxRepliesPerContact}
            onChange={(e) => update({ maxRepliesPerContact: parseInt(e.target.value) || 3 })}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-blue-400/50"
          />
        </div>
      </div>

      {/* Confirm toggle */}
      <label className="flex items-center gap-2 text-white/70 cursor-pointer">
        <input
          type="checkbox"
          checked={requireConfirm}
          onChange={(e) => update({ requireConfirm: e.target.checked })}
          className="accent-blue-400"
        />
        {t('skill.wechat.requireConfirm')}
      </label>

      {/* Sensitive keywords section */}
      <div className="border-t border-white/10 pt-3">
        <label className="text-white/50 text-[10px] uppercase tracking-wider">
          {t('skill.wechat.sensitiveKeywords')}
        </label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {sensitiveKeywords.map((kw) => (
            <span
              key={kw}
              className="flex items-center gap-1 px-2 py-0.5 bg-red-500/15 text-red-300 rounded-md text-[11px]"
            >
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                className="text-red-300/50 hover:text-red-300 ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="+"
              className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px] outline-none focus:border-red-400/50"
            />
          </div>
        </div>
      </div>

      {/* AI sensitive instruction */}
      {useAI && (
        <div>
          <label className="text-white/50 text-[10px] uppercase tracking-wider">
            {t('skill.wechat.sensitiveInstruction')}
          </label>
          <textarea
            value={sensitiveInstruction}
            onChange={(e) => update({ sensitiveInstruction: e.target.value })}
            rows={2}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-blue-400/50 resize-none"
            placeholder={t('skill.wechat.sensitiveInstructionPlaceholder')}
          />
        </div>
      )}

      {/* Delegation log */}
      <div className="border-t border-white/10 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-white/50 text-[10px] uppercase tracking-wider">
            {t('skill.wechat.log')}
          </label>
          {wechatLogs.length > 0 && (
            <button
              onClick={clearDelegationLog}
              className="text-white/30 hover:text-white/50 text-[10px]"
            >
              {t('skill.wechat.clearLog')}
            </button>
          )}
        </div>
        <div className="max-h-32 overflow-y-auto space-y-0.5">
          {wechatLogs.length === 0 ? (
            <div className="text-white/20 text-[11px] py-2 text-center">
              {t('skill.wechat.noLogs')}
            </div>
          ) : (
            wechatLogs.map((entry) => (
              <LogEntry key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function LogEntry({ entry }: { entry: DelegationLogEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (entry.action === 'replied') {
    return (
      <div className="text-[11px] text-green-300/70">
        {time} ✓ {entry.contact ? `${entry.contact}: ` : ''}{entry.replySent?.slice(0, 40)}
      </div>
    )
  }

  if (entry.action === 'skipped_sensitive') {
    return (
      <div className="text-[11px] text-red-300/70">
        {time} ✕ 跳过(敏感词"{entry.sensitiveKeyword}")
      </div>
    )
  }

  if (entry.action === 'skipped_max_replies') {
    return (
      <div className="text-[11px] text-yellow-300/70">
        {time} ✕ 跳过(回复上限)
      </div>
    )
  }

  return (
    <div className="text-[11px] text-white/30">
      {time} ✕ 跳过(冷却中)
    </div>
  )
}
