import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { useChatStore } from '@/stores/chatStore'
import { useAI } from '@/hooks/useAI'
import ToolCallBadge from './ToolCallBadge'

function CopyButton({ text }: { text: string }) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 rounded px-1.5 py-0.5 text-[10px] text-white/70"
    >
      Copy
    </button>
  )
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
  a: ({ href, children }) => (
    <a href={href} className="text-blue-400 underline" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <div className="relative group/code my-1">
          <pre className="bg-black/30 rounded-lg p-2 overflow-x-auto">
            <code className="font-mono text-xs text-white/90">{children}</code>
          </pre>
          <button
            onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
            className="absolute top-1 right-1 opacity-0 group-hover/code:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 rounded px-1.5 py-0.5 text-[10px] text-white/70"
          >
            Copy
          </button>
        </div>
      )
    }
    return (
      <code className="bg-white/20 rounded px-1 font-mono text-xs">{children}</code>
    )
  },
  pre: ({ children }) => <>{children}</>,
  ul: ({ children }) => <ul className="list-disc ml-4 mb-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ml-4 mb-1">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white/10 rounded-xl px-3 py-2 flex gap-1">
        <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-typing-dot" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-typing-dot" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-typing-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

const capabilityCategories = [
  {
    icon: '\uD83D\uDCC1',
    label: '文件管理',
    actions: [
      { label: '整理桌面文件', prompt: '帮我整理桌面文件，按类型分类' },
      { label: '列出文件', prompt: '列出桌面文件' },
    ],
  },
  {
    icon: '\uD83D\uDE80',
    label: '应用控制',
    actions: [
      { label: '打开应用', prompt: '打开记事本' },
    ],
  },
  {
    icon: '\uD83D\uDD0D',
    label: '搜索',
    actions: [
      { label: '网页搜索', prompt: '搜索 TypeScript 教程' },
    ],
  },
  {
    icon: '\uD83D\uDCBB',
    label: '系统工具',
    actions: [
      { label: '系统信息', prompt: '系统信息' },
      { label: '设置提醒', prompt: '5分钟后提醒我休息' },
      { label: '剪贴板', prompt: '读取剪贴板内容' },
    ],
  },
]

export default function MessageList() {
  const { messages, isStreaming, pendingPrompt, setPendingPrompt } = useChatStore()
  const { sendMessage } = useAI()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Consume pendingPrompt from context menu
  useEffect(() => {
    if (pendingPrompt) {
      sendMessage(pendingPrompt)
      setPendingPrompt(null)
    }
  }, [pendingPrompt, sendMessage, setPendingPrompt])

  const visibleMessages = messages.filter((m) => m.role !== 'system')
  const showTyping = isStreaming && visibleMessages.length > 0 && visibleMessages[visibleMessages.length - 1]?.content === ''

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[100px] max-h-[320px]">
      {visibleMessages.length === 0 && (
        <div className="py-3 px-1">
          <p className="text-white/50 text-xs mb-3">我可以帮你做这些事</p>
          <div className="space-y-2.5">
            {capabilityCategories.map((cat) => (
              <div key={cat.label}>
                <p className="text-white/40 text-[10px] mb-1">
                  {cat.icon} {cat.label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {cat.actions.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => sendMessage(a.prompt)}
                      className="px-2 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white/90 text-[11px] transition-colors"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-white/30 text-[10px] mt-3 text-center">
            输入 / 查看所有命令 · Ctrl+Space 命令面板
          </p>
        </div>
      )}
      {visibleMessages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`relative group max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-500/80 text-white'
                : 'bg-white/10 text-white/90'
            }`}
          >
            {msg.role === 'assistant' ? (
              <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
            ) : (
              msg.content
            )}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {msg.toolCalls.map((tc) => (
                  <ToolCallBadge key={tc.id} toolCall={tc} />
                ))}
              </div>
            )}
            {msg.content && <CopyButton text={msg.content} />}
          </div>
        </motion.div>
      ))}
      {showTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
