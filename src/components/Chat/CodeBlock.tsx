import { useState, useCallback } from 'react'

interface CodeBlockProps {
  language?: string
  children: string
}

export default function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [children])

  return (
    <div className="relative group/code my-1 rounded-lg overflow-hidden bg-black/40">
      {/* Top bar with language badge and copy button */}
      <div className="flex items-center justify-between px-2 py-1 bg-white/5">
        {language ? (
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">
            {language}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover/code:opacity-100 transition-opacity text-caption text-white/50 hover:text-white/80 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10"
          aria-label="Copy code"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Code content */}
      <pre className="p-3 overflow-x-auto">
        <code className="font-mono text-xs text-white/90 leading-relaxed">{children}</code>
      </pre>
    </div>
  )
}
