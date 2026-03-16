import { useState } from 'react'
import { memoryStore } from '@/core/memory/store'

export default function MemoryViewer() {
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate((n) => n + 1)

  const memory = memoryStore.getAll()

  return (
    <div className="space-y-3">
      {/* Identity */}
      <Section title="身份信息">
        {Object.entries(memory.identity).length === 0 ? (
          <Empty />
        ) : (
          Object.entries(memory.identity).map(([k, v]) => (
            <MemoryItem
              key={k}
              label={k}
              value={String(v)}
              onDelete={() => { memoryStore.deleteKey('identity', k); refresh() }}
            />
          ))
        )}
      </Section>

      {/* Preferences */}
      <Section title="偏好设置">
        {Object.entries(memory.preferences).length === 0 ? (
          <Empty />
        ) : (
          Object.entries(memory.preferences).map(([k, v]) => (
            <MemoryItem
              key={k}
              label={k}
              value={Array.isArray(v) ? v.join(', ') : String(v)}
              onDelete={() => { memoryStore.deleteKey('preferences', k); refresh() }}
            />
          ))
        )}
      </Section>

      {/* Episodes */}
      <Section title={`最近记忆 (${memory.episodes.length})`}>
        {memory.episodes.length === 0 ? (
          <Empty />
        ) : (
          <>
            {memory.episodes.slice(-10).reverse().map((ep, i) => (
              <div key={i} className="text-white/50 text-xs py-0.5">
                <span className="text-white/20 mr-1">
                  {new Date(ep.timestamp).toLocaleDateString()}
                </span>
                {ep.summary}
              </div>
            ))}
            <button
              onClick={() => { memoryStore.clearEpisodes(); refresh() }}
              className="text-red-400/60 text-xs mt-1 hover:text-red-400"
            >
              清除所有记忆
            </button>
          </>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-white/40 text-xs font-medium mb-1">{title}</p>
      {children}
    </div>
  )
}

function MemoryItem({ label, value, onDelete }: { label: string; value: string; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between py-0.5 group">
      <span className="text-white/70 text-xs">
        <span className="text-white/30">{label}:</span> {value}
      </span>
      <button
        onClick={onDelete}
        className="text-red-400/0 group-hover:text-red-400/60 text-xs transition-colors"
      >
        ×
      </button>
    </div>
  )
}

function Empty() {
  return <p className="text-white/20 text-xs">暂无数据</p>
}
