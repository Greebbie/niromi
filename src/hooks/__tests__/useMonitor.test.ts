import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAdminStore } from '@/stores/adminStore'
import { useChatStore } from '@/stores/chatStore'

// Mock modules imported by useMonitor
vi.mock('@/core/tools', () => ({
  toolRegistry: { execute: vi.fn().mockResolvedValue({ success: true }) },
}))

vi.mock('@/core/skills/registry', () => ({
  skillRegistry: { get: vi.fn().mockReturnValue(null) },
}))

vi.mock('@/core/skills/executor', () => ({
  executeSkill: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/i18n/useI18n', () => ({
  t: (key: string) => key,
}))

vi.mock('@/hooks/useVisionMonitor', () => ({
  startVisionMonitor: vi.fn(),
  stopVisionMonitor: vi.fn(),
  isVisionMonitorRunning: vi.fn().mockReturnValue(false),
}))

// Import after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { startVisionMonitor, stopVisionMonitor, isVisionMonitorRunning } from '@/hooks/useVisionMonitor'

// We need to import the module under test *after* mocks
// matchTrigger, matchAutoReplyApp, executeAction are not exported — we test them via the hook.
// markUserActive and useMonitor are exported.
import { useMonitor, markUserActive, useMonitorStatus } from '@/hooks/useMonitor'

function makeMonitorRule(overrides?: Partial<{
  id: string
  name: string
  enabled: boolean
  trigger: Partial<{ type: 'app_focus' | 'window_title' | 'content_change'; pattern: string; app: string }>
  action: Partial<{ type: 'notify' | 'auto_reply' | 'run_tool' | 'run_skill' | 'send_keys_to_app' | 'copy_content' | 'run_command' | 'chain_next'; payload: string; params: Record<string, unknown> }>
  cooldownMs: number
  lastTriggered: number
}>) {
  return {
    id: overrides?.id ?? 'rule-1',
    name: overrides?.name ?? 'Test Rule',
    enabled: overrides?.enabled ?? true,
    trigger: {
      type: 'app_focus' as const,
      pattern: 'chrome',
      app: '',
      ...overrides?.trigger,
    },
    action: {
      type: 'notify' as const,
      payload: 'Detected: {app} - {title}',
      ...overrides?.action,
    },
    cooldownMs: overrides?.cooldownMs ?? 1000,
    lastTriggered: overrides?.lastTriggered,
  }
}

function makeAutoReplyRule(overrides?: Partial<{
  id: string
  name: string
  enabled: boolean
  app: 'wechat' | 'discord' | 'telegram' | 'outlook' | 'other'
  contactPattern: string
  triggerKeywords: string[]
  replyTemplate: string
  useAI: boolean
  idleMinutes: number
  requireConfirm: boolean
  sensitiveKeywords: string[]
}>) {
  return {
    id: overrides?.id ?? 'ar-1',
    name: overrides?.name ?? 'Auto Reply',
    enabled: overrides?.enabled ?? true,
    app: overrides?.app ?? 'wechat',
    contactPattern: overrides?.contactPattern,
    triggerKeywords: overrides?.triggerKeywords,
    replyTemplate: overrides?.replyTemplate ?? 'I am busy now',
    useAI: overrides?.useAI ?? false,
    idleMinutes: overrides?.idleMinutes,
    requireConfirm: overrides?.requireConfirm ?? false,
    sensitiveKeywords: overrides?.sensitiveKeywords,
  }
}

/** Capture the onWindowChanged callback registered via electronAPI */
function getWindowChangedHandler(): ((data: { app: string; title: string }) => void) | undefined {
  const calls = vi.mocked(window.electronAPI!.onWindowChanged).mock.calls
  if (calls.length === 0) return undefined
  return calls[calls.length - 1][0] as (data: { app: string; title: string }) => void
}

describe('useMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()

    // Reset stores
    useChatStore.setState({ messages: [], pendingConfirm: null })
    useAdminStore.setState({
      monitorRules: [],
      autoReplyRules: [],
      delegationLog: [],
    })

    // Reset electronAPI mock call counts
    const api = window.electronAPI!
    vi.mocked(api.monitorStart).mockClear()
    vi.mocked(api.monitorStop).mockClear()
    vi.mocked(api.onWindowChanged).mockClear()
    vi.mocked(api.offWindowChanged).mockClear()
    vi.mocked(api.clipboardWrite).mockClear()
    vi.mocked(api.focusWindow).mockClear()
    vi.mocked(api.sendKeys).mockClear()

    // Reset vision monitor mocks
    vi.mocked(startVisionMonitor).mockClear()
    vi.mocked(stopVisionMonitor).mockClear()
    vi.mocked(isVisionMonitorRunning).mockReturnValue(false)

    // Ensure user is "active" for idle checks
    markUserActive()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ---- markUserActive ----

  describe('markUserActive', () => {
    it('resets the idle timestamp to current time', () => {
      // We cannot inspect lastUserInput directly since it is module-private,
      // but we can test its effect through auto-reply idle logic.
      // Calling markUserActive should make the user "active" (not idle).
      // This is verified indirectly in auto-reply idle tests below.
      expect(() => markUserActive()).not.toThrow()
    })

    it('makes idle check fail for auto-reply rules with idleMinutes', () => {
      // Set up an auto-reply rule that requires 5 minutes idle
      useAdminStore.setState({
        autoReplyRules: [makeAutoReplyRule({ idleMinutes: 5 })],
      })

      // Mark user as active right now
      markUserActive()

      // Render the hook to start monitoring
      const { unmount } = renderHook(() => useMonitor())

      // Simulate window change for wechat
      const handler = getWindowChangedHandler()
      expect(handler).toBeDefined()
      handler!({ app: 'WeChat', title: 'Chat with Alice' })

      // No reply should be sent because user is not idle
      expect(window.electronAPI!.clipboardWrite).not.toHaveBeenCalled()

      unmount()
    })
  })

  // ---- Hook lifecycle ----

  describe('lifecycle management', () => {
    it('does not start monitor when no rules are enabled', () => {
      const { unmount } = renderHook(() => useMonitor())

      expect(window.electronAPI!.monitorStart).not.toHaveBeenCalled()
      expect(window.electronAPI!.onWindowChanged).not.toHaveBeenCalled()

      unmount()
    })

    it('starts window monitor when an enabled monitor rule exists', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule()],
      })

      const { unmount } = renderHook(() => useMonitor())

      expect(window.electronAPI!.monitorStart).toHaveBeenCalledWith(2000)
      expect(window.electronAPI!.onWindowChanged).toHaveBeenCalled()

      unmount()
    })

    it('starts window monitor when an enabled auto-reply rule exists', () => {
      useAdminStore.setState({
        autoReplyRules: [makeAutoReplyRule()],
      })

      const { unmount } = renderHook(() => useMonitor())

      expect(window.electronAPI!.monitorStart).toHaveBeenCalledWith(2000)

      unmount()
    })

    it('stops monitor on unmount', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule()],
      })

      const { unmount } = renderHook(() => useMonitor())
      expect(window.electronAPI!.monitorStart).toHaveBeenCalled()

      unmount()

      expect(window.electronAPI!.monitorStop).toHaveBeenCalled()
      expect(window.electronAPI!.offWindowChanged).toHaveBeenCalled()
    })

    it('stops monitor when all rules become disabled', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule()],
      })

      const { unmount } = renderHook(() => useMonitor())
      expect(window.electronAPI!.monitorStart).toHaveBeenCalled()

      // Disable all rules
      useAdminStore.setState({
        monitorRules: [makeMonitorRule({ enabled: false })],
      })

      expect(window.electronAPI!.monitorStop).toHaveBeenCalled()

      unmount()
    })

    it('starts vision monitor when content_change rules exist', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule({ trigger: { type: 'content_change', pattern: 'error' } })],
      })

      renderHook(() => useMonitor())

      expect(startVisionMonitor).toHaveBeenCalled()
    })

    it('starts vision monitor when auto-reply rules have triggerKeywords', () => {
      useAdminStore.setState({
        autoReplyRules: [makeAutoReplyRule({ triggerKeywords: ['hello'] })],
      })

      renderHook(() => useMonitor())

      expect(startVisionMonitor).toHaveBeenCalled()
    })

    it('stops vision monitor when vision rules are removed', () => {
      vi.mocked(isVisionMonitorRunning).mockReturnValue(true)

      useAdminStore.setState({
        monitorRules: [],
        autoReplyRules: [],
      })

      renderHook(() => useMonitor())

      expect(stopVisionMonitor).toHaveBeenCalled()
    })
  })

  // ---- matchTrigger (tested indirectly via window change handler) ----

  describe('matchTrigger via window change', () => {
    it('matches app_focus trigger when app name contains pattern (case-insensitive)', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule({ trigger: { type: 'app_focus', pattern: 'chrome' } })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      handler({ app: 'Google Chrome', title: 'Tab' })

      const messages = useChatStore.getState().messages
      expect(messages.some(m => m.content.includes('Detected:'))).toBe(true)

      unmount()
    })

    it('matches window_title trigger with regex', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule({ trigger: { type: 'window_title', pattern: 'err.*fatal' } })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      handler({ app: 'Terminal', title: 'error: fatal crash' })

      const messages = useChatStore.getState().messages
      expect(messages.some(m => m.content.includes('Detected:'))).toBe(true)

      unmount()
    })

    it('falls back to includes when regex pattern is invalid', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule({ trigger: { type: 'window_title', pattern: '[invalid' } })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      // The fallback does case-insensitive includes, so this should match
      handler({ app: 'Terminal', title: 'something [invalid here' })

      const messages = useChatStore.getState().messages
      expect(messages.some(m => m.content.includes('Detected:'))).toBe(true)

      unmount()
    })

    it('does not match content_change trigger on window-change events', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule({ trigger: { type: 'content_change', pattern: '.*' } })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      handler({ app: 'Chrome', title: 'Test' })

      // content_change always returns false for window-change events
      const messages = useChatStore.getState().messages
      expect(messages.filter(m => m.content.includes('Detected:'))).toHaveLength(0)

      unmount()
    })

    it('does not fire when trigger pattern does not match', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule({ trigger: { type: 'app_focus', pattern: 'firefox' } })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      handler({ app: 'Chrome', title: 'Tab' })

      const messages = useChatStore.getState().messages
      expect(messages.filter(m => m.content.includes('Detected:'))).toHaveLength(0)

      unmount()
    })
  })

  // ---- Cooldown ----

  describe('cooldown behavior', () => {
    it('respects cooldown and does not re-fire within cooldown period', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule({ cooldownMs: 10000 })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      // First trigger
      handler({ app: 'Chrome', title: 'Tab' })
      const firstCount = useChatStore.getState().messages.filter(m => m.content.includes('Detected:')).length
      expect(firstCount).toBe(1)

      // Within cooldown — should not fire again
      vi.advanceTimersByTime(5000)
      handler({ app: 'Chrome', title: 'Tab 2' })
      const secondCount = useChatStore.getState().messages.filter(m => m.content.includes('Detected:')).length
      expect(secondCount).toBe(1)

      // After cooldown
      vi.advanceTimersByTime(6000)
      handler({ app: 'Chrome', title: 'Tab 3' })
      const thirdCount = useChatStore.getState().messages.filter(m => m.content.includes('Detected:')).length
      expect(thirdCount).toBe(2)

      unmount()
    })
  })

  // ---- matchAutoReplyApp (tested indirectly) ----

  describe('matchAutoReplyApp via auto-reply', () => {
    it('matches wechat aliases (WeChat, weixin, 微信)', () => {
      useAdminStore.setState({
        autoReplyRules: [makeAutoReplyRule({ app: 'wechat' })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      // Advance time to make user idle (no idleMinutes set, so it skips idle check)
      handler({ app: '微信', title: 'Chat' })

      expect(window.electronAPI!.clipboardWrite).toHaveBeenCalledWith('I am busy now')

      unmount()
    })

    it('does not match unrelated app name', () => {
      useAdminStore.setState({
        autoReplyRules: [makeAutoReplyRule({ app: 'wechat' })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      handler({ app: 'Notepad', title: 'untitled' })

      expect(window.electronAPI!.clipboardWrite).not.toHaveBeenCalled()

      unmount()
    })
  })

  // ---- Auto-reply sensitive keywords ----

  describe('auto-reply sensitive keyword filtering', () => {
    it('skips reply when window title contains a sensitive keyword', () => {
      useAdminStore.setState({
        autoReplyRules: [makeAutoReplyRule({
          sensitiveKeywords: ['password', 'secret'],
        })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      handler({ app: 'WeChat', title: 'Please send me the password' })

      expect(window.electronAPI!.clipboardWrite).not.toHaveBeenCalled()

      // Should have logged it as skipped_sensitive
      const log = useAdminStore.getState().delegationLog
      expect(log.some((e: { action: string }) => e.action === 'skipped_sensitive')).toBe(true)

      unmount()
    })
  })

  // ---- Auto-reply idle check ----

  describe('auto-reply idle check', () => {
    it('skips reply when user is active and idleMinutes is set', () => {
      useAdminStore.setState({
        autoReplyRules: [makeAutoReplyRule({ idleMinutes: 5 })],
      })

      markUserActive()

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      handler({ app: 'WeChat', title: 'Chat with Bob' })

      expect(window.electronAPI!.clipboardWrite).not.toHaveBeenCalled()

      unmount()
    })

    it('sends reply when user has been idle long enough', () => {
      useAdminStore.setState({
        autoReplyRules: [makeAutoReplyRule({ idleMinutes: 5 })],
      })

      // Mark active then advance time beyond idle threshold
      markUserActive()
      vi.advanceTimersByTime(6 * 60 * 1000) // 6 minutes

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      handler({ app: 'WeChat', title: 'Chat with Bob' })

      expect(window.electronAPI!.clipboardWrite).toHaveBeenCalledWith('I am busy now')

      unmount()
    })
  })

  // ---- Auto-reply with confirmation ----

  describe('auto-reply requireConfirm', () => {
    it('shows confirmation prompt instead of auto-sending when requireConfirm is true', () => {
      useAdminStore.setState({
        autoReplyRules: [makeAutoReplyRule({ requireConfirm: true })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      handler({ app: 'WeChat', title: 'Chat' })

      // Should NOT send immediately
      expect(window.electronAPI!.clipboardWrite).not.toHaveBeenCalled()

      // Should set pending confirm
      const pendingConfirm = useChatStore.getState().pendingConfirm
      expect(pendingConfirm).not.toBeNull()
      expect(pendingConfirm?.toolName).toBe('auto_reply')

      unmount()
    })
  })

  // ---- Auto-reply rules with triggerKeywords are skipped ----

  describe('auto-reply triggerKeywords skip', () => {
    it('skips auto-reply rules that have triggerKeywords (handled by vision monitor)', () => {
      useAdminStore.setState({
        autoReplyRules: [makeAutoReplyRule({ triggerKeywords: ['urgent'] })],
      })

      const { unmount } = renderHook(() => useMonitor())
      const handler = getWindowChangedHandler()!

      handler({ app: 'WeChat', title: 'urgent message' })

      // Should not auto-reply — these rules are for the vision monitor
      expect(window.electronAPI!.clipboardWrite).not.toHaveBeenCalled()

      unmount()
    })
  })

  // ---- useMonitorStatus ----

  describe('useMonitorStatus', () => {
    it('returns false when no rules are enabled', () => {
      useAdminStore.setState({
        monitorRules: [],
        autoReplyRules: [],
      })

      const { result } = renderHook(() => useMonitorStatus())
      expect(result.current).toBe(false)
    })

    it('returns true when a monitor rule is enabled', () => {
      useAdminStore.setState({
        monitorRules: [makeMonitorRule({ enabled: true })],
        autoReplyRules: [],
      })

      const { result } = renderHook(() => useMonitorStatus())
      expect(result.current).toBe(true)
    })

    it('returns true when an auto-reply rule is enabled', () => {
      useAdminStore.setState({
        monitorRules: [],
        autoReplyRules: [makeAutoReplyRule({ enabled: true })],
      })

      const { result } = renderHook(() => useMonitorStatus())
      expect(result.current).toBe(true)
    })
  })
})
