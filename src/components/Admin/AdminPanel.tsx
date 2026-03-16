import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminStore } from '@/stores/adminStore'
import AdminTools from './AdminTools'
import AdminMonitor from './AdminMonitor'
import AdminAutoReply from './AdminAutoReply'
import AdminLogs from './AdminLogs'

type Tab = 'tools' | 'monitor' | 'autoreply' | 'logs'

const TABS: { id: Tab; label: string }[] = [
  { id: 'tools', label: '工具管理' },
  { id: 'monitor', label: '监控规则' },
  { id: 'autoreply', label: '自动回复' },
  { id: 'logs', label: '日志' },
]

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('tools')
  const setAdminOpen = useAdminStore((s) => s.setAdminOpen)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setAdminOpen(false)
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-[680px] max-h-[600px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(30, 30, 40, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-white text-sm font-medium">Admin Panel</span>
          <button
            onClick={() => setAdminOpen(false)}
            className="text-white/40 hover:text-white/80 text-lg transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
          >
            x
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-white/10">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs transition-colors relative ${
                tab === t.id ? 'text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t.label}
              {tab === t.id && (
                <motion.div
                  layoutId="admin-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-4"
            >
              {tab === 'tools' && <AdminTools />}
              {tab === 'monitor' && <AdminMonitor />}
              {tab === 'autoreply' && <AdminAutoReply />}
              {tab === 'logs' && <AdminLogs />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
