import { useEffect, useRef, useCallback } from 'react'
import { useCharacterStore } from '@/stores/characterStore'
import { useChatStore } from '@/stores/chatStore'
import { expressionMap } from './expressions'
import miruPng from '@/assets/miru.png'

const IMG_WIDTH = 140
const IMG_HEIGHT = 180
const GRAVITY = 2400 // px/s²

export default function Character() {
  const { animationState, decay } = useCharacterStore()
  const { toggleChat } = useChatStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const gravityRef = useRef<number | null>(null)
  const homeYRef = useRef<number | null>(null)
  const localPosRef = useRef<{ x: number; y: number } | null>(null)

  const expr = expressionMap[animationState]

  // Emotion decay every 500ms
  useEffect(() => {
    const interval = setInterval(decay, 500)
    return () => clearInterval(interval)
  }, [decay])

  // Store the "home" Y position on mount
  useEffect(() => {
    window.electronAPI?.getWindowPosition().then((pos) => {
      homeYRef.current = pos.y
      localPosRef.current = { x: pos.x, y: pos.y }
    }).catch(() => {})
  }, [])

  // Gravity: animate window back to home Y after drag
  const applyGravity = useCallback(() => {
    if (gravityRef.current !== null) return
    if (!window.electronAPI || !localPosRef.current) return

    let velocity = 0
    let lastTime = performance.now()

    const tick = (now: number) => {
      const homeY = homeYRef.current
      const pos = localPosRef.current
      if (homeY === null || !pos) { gravityRef.current = null; return }

      const dy = homeY - pos.y
      if (Math.abs(dy) < 2 && Math.abs(velocity) < 10) {
        pos.y = homeY
        localPosRef.current = pos
        window.electronAPI?.setWindowPosition(pos.x, homeY)
        gravityRef.current = null
        return
      }

      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      velocity += GRAVITY * dt
      let newY = pos.y + velocity * dt

      if (dy > 0 && newY > homeY) {
        newY = homeY
        velocity = 0
      }

      pos.y = Math.round(newY)
      localPosRef.current = pos
      window.electronAPI?.setWindowPosition(pos.x, pos.y)
      gravityRef.current = requestAnimationFrame(tick)
    }

    gravityRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    return () => {
      if (gravityRef.current !== null) {
        cancelAnimationFrame(gravityRef.current)
        gravityRef.current = null
      }
    }
  }, [])

  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return

    // Cancel any running gravity
    if (gravityRef.current !== null) {
      cancelAnimationFrame(gravityRef.current)
      gravityRef.current = null
    }

    // Calculate window position IMMEDIATELY from the event (no async IPC!)
    // window position = screen coords - client coords
    const winX = e.screenX - e.clientX
    const winY = e.screenY - e.clientY
    const startX = e.screenX
    const startY = e.screenY
    let moved = 0
    let rafId: number | null = null
    let pendingDx = 0
    let pendingDy = 0

    // Enable mouse capture over transparent areas during drag
    window.electronAPI?.setIgnoreCursorEvents(true, { forward: true })

    const flushMove = () => {
      rafId = null
      const newX = winX + pendingDx
      const newY = winY + pendingDy
      localPosRef.current = { x: newX, y: newY }
      window.electronAPI?.setWindowPosition(newX, newY)
    }

    const handleMove = (ev: MouseEvent) => {
      pendingDx = ev.screenX - startX
      pendingDy = ev.screenY - startY
      moved = Math.abs(pendingDx) + Math.abs(pendingDy)
      if (rafId === null) {
        rafId = requestAnimationFrame(flushMove)
      }
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        flushMove()
      }

      // Restore default transparent window click-through
      window.electronAPI?.setIgnoreCursorEvents(false)

      if (moved < 5) {
        toggleChat()
      } else {
        localPosRef.current = { x: winX + pendingDx, y: winY + pendingDy }
        applyGravity()
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [toggleChat, applyGravity])

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
        // Background alpha > 0 so transparent window captures clicks on this area
        background: 'rgba(0, 0, 0, 0.05)',
      }}
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
