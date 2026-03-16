import { useEffect, useRef, useCallback, useState } from 'react'
import { useCharacterStore } from '@/stores/characterStore'
import { useChatStore } from '@/stores/chatStore'
import { expressionMap } from './expressions'
import miruPng from '@/assets/miru.png'

const IMG_WIDTH = 140
const IMG_HEIGHT = 180

export default function Character() {
  const { animationState, decay } = useCharacterStore()
  const { toggleChat } = useChatStore()
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; winX: number; winY: number } | null>(null)
  const totalMoved = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const expr = expressionMap[animationState]

  // Emotion decay every 500ms
  useEffect(() => {
    const interval = setInterval(decay, 500)
    return () => clearInterval(interval)
  }, [decay])

  // Drag handling
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return
    let winX = 0, winY = 0
    try {
      if (window.electronAPI) {
        const winPos = await window.electronAPI.getWindowPosition()
        winX = winPos.x; winY = winPos.y
      }
    } catch { /* click still works, drag may offset */ }
    dragStart.current = { x: e.screenX, y: e.screenY, winX, winY }
    totalMoved.current = 0
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent) => {
      if (!dragStart.current || !window.electronAPI) return
      const dx = e.screenX - dragStart.current.x
      const dy = e.screenY - dragStart.current.y
      totalMoved.current = Math.abs(dx) + Math.abs(dy)
      try {
        window.electronAPI.setWindowPosition(dragStart.current.winX + dx, dragStart.current.winY + dy)
      } catch { /* ignore position errors during drag */ }
    }

    const handleUp = () => {
      if (totalMoved.current < 5) toggleChat()
      setIsDragging(false)
      dragStart.current = null
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, toggleChat])

  // Build dynamic glow shadow
  const glowShadow = `0 0 ${20 * expr.glowIntensity}px ${expr.glowColor}${Math.round(expr.glowIntensity * 255).toString(16).padStart(2, '0')},`
    + `0 0 ${40 * expr.glowIntensity}px ${expr.glowColor}${Math.round(expr.glowIntensity * 150).toString(16).padStart(2, '0')}`

  return (
    <div
      ref={containerRef}
      className="relative cursor-pointer select-none"
      style={{ width: IMG_WIDTH + 20, height: IMG_HEIGHT + 20 }}
      onMouseDown={handleMouseDown}
    >
      <style>{KEYFRAMES}</style>

      {/* Character image with animations */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          animation: `miru-float ${expr.breathSpeed}s ease-in-out infinite`
            + (expr.bounce > 0 ? `, miru-bounce ${expr.breathSpeed * 0.5}s ease-in-out infinite` : ''),
        }}
      >
        <img
          src={miruPng}
          alt="Miru"
          draggable={false}
          style={{
            width: IMG_WIDTH,
            height: IMG_HEIGHT,
            objectFit: 'contain',
            transform: `scale(${expr.scale}) rotate(${expr.tilt}deg)`,
            filter: `brightness(${expr.brightness}) drop-shadow(${glowShadow})`,
            transition: 'transform 0.6s ease, filter 0.6s ease',
            imageRendering: 'auto',
          }}
        />
      </div>
    </div>
  )
}

const KEYFRAMES = `
@keyframes miru-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes miru-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
`
