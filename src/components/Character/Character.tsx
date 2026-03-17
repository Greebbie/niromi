import { useEffect, useRef, useCallback } from 'react'
import { useCharacterStore } from '@/stores/characterStore'
import { useChatStore } from '@/stores/chatStore'
import { expressionMap } from './expressions'
import miruPng from '@/assets/miru.png'

const IMG_WIDTH = 140
const IMG_HEIGHT = 180

export default function Character() {
  const { animationState, decay } = useCharacterStore()
  const { toggleChat } = useChatStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const expr = expressionMap[animationState]

  // Emotion decay every 500ms
  useEffect(() => {
    const interval = setInterval(decay, 500)
    return () => clearInterval(interval)
  }, [decay])

  // Drag via Pointer Events + setPointerCapture — reliable on all platforms
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    const winX = e.screenX - e.clientX
    const winY = e.screenY - e.clientY
    const startX = e.screenX
    const startY = e.screenY
    let moved = 0
    let rafId: number | null = null
    let pendingDx = 0
    let pendingDy = 0

    const flushMove = () => {
      rafId = null
      window.electronAPI?.setWindowPosition(winX + pendingDx, winY + pendingDy)
    }

    const onMove = (ev: PointerEvent) => {
      pendingDx = ev.screenX - startX
      pendingDy = ev.screenY - startY
      moved = Math.abs(pendingDx) + Math.abs(pendingDy)
      if (rafId === null) {
        rafId = requestAnimationFrame(flushMove)
      }
    }

    const onUp = () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('lostpointercapture', onUp)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        flushMove()
      }
      if (moved < 5) {
        toggleChat()
      }
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('lostpointercapture', onUp)
  }, [toggleChat])

  // Build dynamic glow shadow
  const glowShadow = `0 0 ${20 * expr.glowIntensity}px ${expr.glowColor}${Math.round(expr.glowIntensity * 255).toString(16).padStart(2, '0')},`
    + `0 0 ${40 * expr.glowIntensity}px ${expr.glowColor}${Math.round(expr.glowIntensity * 150).toString(16).padStart(2, '0')}`

  return (
    <div
      ref={containerRef}
      className="relative cursor-pointer select-none rounded-full"
      style={{
        width: IMG_WIDTH + 20,
        height: IMG_HEIGHT + 20,
        background: 'rgba(0, 0, 0, 0.05)',
        touchAction: 'none', // required for pointer capture
      }}
      onPointerDown={handlePointerDown}
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
