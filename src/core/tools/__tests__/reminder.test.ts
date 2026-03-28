import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toolRegistry } from '../registry'

// Register reminder tool (side-effect import)
import '../reminder'

describe('set_reminder tool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is registered in toolRegistry with correct metadata', () => {
    const tool = toolRegistry.get('set_reminder')
    expect(tool).toBeDefined()
    expect(tool!.name).toBe('set_reminder')
    expect(tool!.riskLevel).toBe('low')
    expect(tool!.category).toBe('system')
  })

  it('returns success with reminder id and trigger time', async () => {
    const now = new Date('2025-06-01T12:00:00Z').getTime()
    vi.setSystemTime(now)

    const result = await toolRegistry.get('set_reminder')!.execute({
      message: 'Check email',
      minutes: 5,
    })

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('id')
    expect(result.data).toHaveProperty('triggerAt')
    expect((result.data as { id: string }).id).toMatch(/^reminder-/)
    // triggerAt should be 5 minutes from now
    const triggerAt = new Date((result.data as { triggerAt: string }).triggerAt).getTime()
    expect(triggerAt).toBe(now + 5 * 60 * 1000)
  })

  it('returns summary with minutes and truncated message', async () => {
    const result = await toolRegistry.get('set_reminder')!.execute({
      message: 'A very long reminder message that exceeds thirty characters easily',
      minutes: 10,
    })

    expect(result.success).toBe(true)
    expect(result.summary).toContain('10min')
    // Message is sliced to 30 chars
    expect(result.summary).toContain('A very long reminder message t')
  })

  it('fires Notification after the specified minutes', async () => {
    // Mock Notification API
    const mockNotification = vi.fn()
    ;(globalThis as any).Notification = Object.assign(mockNotification, {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    })

    await toolRegistry.get('set_reminder')!.execute({
      message: 'Time to eat!',
      minutes: 2,
    })

    // Notification should not fire before 2 minutes
    vi.advanceTimersByTime(1 * 60 * 1000)
    expect(mockNotification).not.toHaveBeenCalled()

    // Advance to 2 minutes — notification should fire
    vi.advanceTimersByTime(1 * 60 * 1000)
    expect(mockNotification).toHaveBeenCalledWith('Niromi 提醒你~', { body: 'Time to eat!' })
  })
})
