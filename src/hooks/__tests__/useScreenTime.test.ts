import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useConfigStore } from '@/stores/configStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useChatStore } from '@/stores/chatStore'

// Mock the sound module
vi.mock('@/core/sound', () => ({
  playSound: vi.fn(),
}))

vi.mock('@/i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'zh',
  }),
}))

import { playSound } from '@/core/sound'
import { useScreenTime } from '@/hooks/useScreenTime'

describe('useScreenTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()

    // Reset stores to clean defaults
    useConfigStore.setState({ screenTimeReminder: 0 })
    useCharacterStore.setState({
      lastInteraction: Date.now(),
      emotions: { curiosity: 0, focus: 0, joy: 0, concern: 0 },
    })
    useChatStore.setState({ messages: [] })

    vi.mocked(playSound).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does nothing when screenTimeReminder is 0 (disabled)', () => {
    useConfigStore.setState({ screenTimeReminder: 0 })

    renderHook(() => useScreenTime())

    // Advance well past any reminder threshold
    vi.advanceTimersByTime(120 * 60 * 1000) // 2 hours

    expect(playSound).not.toHaveBeenCalled()
    expect(useChatStore.getState().messages).toHaveLength(0)
  })

  it('sends reminder message after screenTimeReminder minutes elapse', () => {
    useConfigStore.setState({ screenTimeReminder: 30 })

    renderHook(() => useScreenTime())

    // Advance 30 minutes (30 intervals of 60s)
    vi.advanceTimersByTime(30 * 60 * 1000)

    const messages = useChatStore.getState().messages
    expect(messages.length).toBeGreaterThanOrEqual(1)
    expect(messages[0].role).toBe('assistant')
    expect(messages[0].content).toContain('screenTime.reminder')
  })

  it('plays alert sound when reminder triggers', () => {
    useConfigStore.setState({ screenTimeReminder: 30 })

    renderHook(() => useScreenTime())

    vi.advanceTimersByTime(30 * 60 * 1000)

    expect(playSound).toHaveBeenCalledWith('alert')
  })

  it('sets concern emotion when reminder triggers', () => {
    useConfigStore.setState({ screenTimeReminder: 30 })

    renderHook(() => useScreenTime())

    vi.advanceTimersByTime(30 * 60 * 1000)

    const emotions = useCharacterStore.getState().emotions
    expect(emotions.concern).toBeCloseTo(0.4)
  })

  it('resets timer when lastInteraction changes', () => {
    useConfigStore.setState({ screenTimeReminder: 30 })

    const { rerender } = renderHook(() => useScreenTime())

    // Advance 25 minutes — not yet at threshold
    vi.advanceTimersByTime(25 * 60 * 1000)
    expect(useChatStore.getState().messages).toHaveLength(0)

    // Simulate user interaction (resets the start ref)
    useCharacterStore.setState({ lastInteraction: Date.now() })
    rerender()

    // Advance another 25 minutes from the new interaction — still under 30 min since reset
    vi.advanceTimersByTime(25 * 60 * 1000)
    expect(useChatStore.getState().messages).toHaveLength(0)

    // Advance 6 more minutes (total 31 from last interaction) — should trigger
    vi.advanceTimersByTime(6 * 60 * 1000)
    expect(useChatStore.getState().messages.length).toBeGreaterThanOrEqual(1)
  })

  it('auto-resets and can trigger again after first reminder', () => {
    useConfigStore.setState({ screenTimeReminder: 30 })

    renderHook(() => useScreenTime())

    // First trigger at 30 minutes
    vi.advanceTimersByTime(30 * 60 * 1000)
    expect(useChatStore.getState().messages).toHaveLength(1)

    // Timer resets internally — advance another 30 minutes for second trigger
    vi.advanceTimersByTime(30 * 60 * 1000)
    expect(useChatStore.getState().messages.length).toBeGreaterThanOrEqual(2)
  })

  it('does not trigger before the threshold is reached', () => {
    useConfigStore.setState({ screenTimeReminder: 60 })

    renderHook(() => useScreenTime())

    // Advance 59 minutes
    vi.advanceTimersByTime(59 * 60 * 1000)

    expect(useChatStore.getState().messages).toHaveLength(0)
    expect(playSound).not.toHaveBeenCalled()
  })
})
