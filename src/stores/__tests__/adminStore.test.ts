import { describe, it, expect, beforeEach } from 'vitest'
import { useAdminStore } from '../adminStore'

describe('adminStore', () => {
  beforeEach(() => {
    useAdminStore.setState({
      permissions: [],
      monitorRules: [],
      autoReplyRules: [],
      auditLog: [],
      delegationLog: [],
      isAdminOpen: false,
    })
  })

  describe('permissions', () => {
    it('updatePermission creates new entry with defaults', () => {
      useAdminStore.getState().updatePermission('file_read', {})
      const perm = useAdminStore.getState().permissions[0]
      expect(perm.toolName).toBe('file_read')
      expect(perm.enabled).toBe(true)
      expect(perm.requireConfirm).toBe(false)
      expect(perm.callCount).toBe(0)
    })

    it('updatePermission updates existing entry', () => {
      useAdminStore.getState().updatePermission('file_read', {})
      useAdminStore.getState().updatePermission('file_read', { enabled: false, requireConfirm: true })
      const perms = useAdminStore.getState().permissions
      expect(perms).toHaveLength(1)
      expect(perms[0].enabled).toBe(false)
      expect(perms[0].requireConfirm).toBe(true)
    })

    it('getPermission returns undefined for unknown tool', () => {
      const perm = useAdminStore.getState().getPermission('nonexistent')
      expect(perm).toBeUndefined()
    })

    it('getPermission returns entry for known tool', () => {
      useAdminStore.getState().updatePermission('shell_exec', { dailyLimit: 10 })
      const perm = useAdminStore.getState().getPermission('shell_exec')
      expect(perm).toBeDefined()
      expect(perm!.toolName).toBe('shell_exec')
      expect(perm!.dailyLimit).toBe(10)
    })

    it('checkPermission returns allowed for unknown tool (no entry)', () => {
      const result = useAdminStore.getState().checkPermission('unknown_tool')
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('checkPermission returns not allowed when tool disabled', () => {
      useAdminStore.getState().updatePermission('file_write', { enabled: false })
      const result = useAdminStore.getState().checkPermission('file_write')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('disabled')
    })

    it('checkPermission returns not allowed when daily limit reached', () => {
      useAdminStore.getState().updatePermission('shell_exec', { dailyLimit: 3, callCount: 3 })
      const result = useAdminStore.getState().checkPermission('shell_exec')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Daily limit')
    })

    it('checkPermission returns not allowed when path is blocked', () => {
      useAdminStore.getState().updatePermission('file_read', {
        blockedPaths: ['/etc/secrets'],
      })
      const result = useAdminStore.getState().checkPermission('file_read', '/etc/secrets/api.key')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('blocked')
    })

    it('checkPermission returns not allowed when path not in allowedPaths', () => {
      useAdminStore.getState().updatePermission('file_read', {
        allowedPaths: ['/home/user/projects'],
      })
      const result = useAdminStore.getState().checkPermission('file_read', '/var/log/system.log')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('not in allowed list')
    })

    it('checkPermission normalizes paths (Windows backslashes)', () => {
      useAdminStore.getState().updatePermission('file_read', {
        blockedPaths: ['C:\\Users\\secrets'],
      })
      const result = useAdminStore.getState().checkPermission('file_read', 'C:/Users/secrets/key.pem')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('blocked')
    })

    it('incrementCallCount increases callCount by 1', () => {
      useAdminStore.getState().updatePermission('shell_exec', {})
      useAdminStore.getState().incrementCallCount('shell_exec')
      useAdminStore.getState().incrementCallCount('shell_exec')
      const perm = useAdminStore.getState().getPermission('shell_exec')
      expect(perm!.callCount).toBe(2)
    })

    it('resetDailyCounts resets all callCounts to 0', () => {
      useAdminStore.getState().updatePermission('tool_a', { callCount: 5 })
      useAdminStore.getState().updatePermission('tool_b', { callCount: 12 })
      useAdminStore.getState().resetDailyCounts()
      const perms = useAdminStore.getState().permissions
      expect(perms[0].callCount).toBe(0)
      expect(perms[1].callCount).toBe(0)
    })
  })

  describe('monitorRules', () => {
    const baseRule = {
      name: 'Test Rule',
      enabled: true,
      trigger: { type: 'window_title' as const, pattern: '.*error.*' },
      action: { type: 'notify' as const, payload: 'Error detected' },
      cooldownMs: 5000,
    }

    it('addMonitorRule adds with generated id', () => {
      useAdminStore.getState().addMonitorRule(baseRule)
      const rules = useAdminStore.getState().monitorRules
      expect(rules).toHaveLength(1)
      expect(rules[0].id).toBeTruthy()
      expect(rules[0].name).toBe('Test Rule')
    })

    it('updateMonitorRule updates specific rule', () => {
      useAdminStore.getState().addMonitorRule(baseRule)
      const id = useAdminStore.getState().monitorRules[0].id
      useAdminStore.getState().updateMonitorRule(id, { enabled: false, name: 'Updated' })
      const rule = useAdminStore.getState().monitorRules[0]
      expect(rule.enabled).toBe(false)
      expect(rule.name).toBe('Updated')
    })

    it('deleteMonitorRule removes rule', () => {
      useAdminStore.getState().addMonitorRule(baseRule)
      const id = useAdminStore.getState().monitorRules[0].id
      useAdminStore.getState().deleteMonitorRule(id)
      expect(useAdminStore.getState().monitorRules).toHaveLength(0)
    })

    it('deleteMonitorRule does not affect other rules', () => {
      useAdminStore.getState().addMonitorRule({ ...baseRule, name: 'Rule A' })
      useAdminStore.getState().addMonitorRule({ ...baseRule, name: 'Rule B' })
      const idA = useAdminStore.getState().monitorRules[0].id
      useAdminStore.getState().deleteMonitorRule(idA)
      const rules = useAdminStore.getState().monitorRules
      expect(rules).toHaveLength(1)
      expect(rules[0].name).toBe('Rule B')
    })
  })

  describe('autoReplyRules', () => {
    const baseAutoReply = {
      name: 'WeChat Auto',
      enabled: true,
      app: 'wechat' as const,
      useAI: false,
      requireConfirm: true,
      replyTemplate: 'I am busy',
    }

    it('addAutoReplyRule adds with generated id', () => {
      useAdminStore.getState().addAutoReplyRule(baseAutoReply)
      const rules = useAdminStore.getState().autoReplyRules
      expect(rules).toHaveLength(1)
      expect(rules[0].id).toBeTruthy()
      expect(rules[0].name).toBe('WeChat Auto')
    })

    it('updateAutoReplyRule updates specific rule', () => {
      useAdminStore.getState().addAutoReplyRule(baseAutoReply)
      const id = useAdminStore.getState().autoReplyRules[0].id
      useAdminStore.getState().updateAutoReplyRule(id, { replyTemplate: 'Updated reply' })
      expect(useAdminStore.getState().autoReplyRules[0].replyTemplate).toBe('Updated reply')
    })

    it('deleteAutoReplyRule removes rule', () => {
      useAdminStore.getState().addAutoReplyRule(baseAutoReply)
      const id = useAdminStore.getState().autoReplyRules[0].id
      useAdminStore.getState().deleteAutoReplyRule(id)
      expect(useAdminStore.getState().autoReplyRules).toHaveLength(0)
    })

    it('sourceSkill field preserved for WeChat delegate rules', () => {
      useAdminStore.getState().addAutoReplyRule({
        ...baseAutoReply,
        sourceSkill: 'wechat-delegate',
      })
      const rule = useAdminStore.getState().autoReplyRules[0]
      expect(rule.sourceSkill).toBe('wechat-delegate')
    })
  })

  describe('auditLog', () => {
    const baseEntry = {
      timestamp: Date.now(),
      toolName: 'file_read',
      params: '{ "path": "/tmp/test" }',
      resultSuccess: true,
      resultSummary: 'Read 100 bytes',
      durationMs: 42,
    }

    it('addAuditEntry adds entry', () => {
      useAdminStore.getState().addAuditEntry(baseEntry)
      const log = useAdminStore.getState().auditLog
      expect(log).toHaveLength(1)
      expect(log[0].toolName).toBe('file_read')
      expect(log[0].id).toBeGreaterThan(0)
    })

    it('auditLog capped at 500 entries', () => {
      const store = useAdminStore.getState()
      for (let i = 0; i < 502; i++) {
        store.addAuditEntry({ ...baseEntry, toolName: `tool_${i}` })
      }
      expect(useAdminStore.getState().auditLog).toHaveLength(500)
    })

    it('getAuditLog filters by toolName', () => {
      const store = useAdminStore.getState()
      store.addAuditEntry({ ...baseEntry, toolName: 'file_read' })
      store.addAuditEntry({ ...baseEntry, toolName: 'shell_exec' })
      store.addAuditEntry({ ...baseEntry, toolName: 'file_read' })
      const filtered = useAdminStore.getState().getAuditLog({ toolName: 'file_read' })
      expect(filtered).toHaveLength(2)
      expect(filtered.every((e) => e.toolName === 'file_read')).toBe(true)
    })

    it('clearAuditLog empties the log', () => {
      useAdminStore.getState().addAuditEntry(baseEntry)
      useAdminStore.getState().addAuditEntry(baseEntry)
      useAdminStore.getState().clearAuditLog()
      expect(useAdminStore.getState().auditLog).toHaveLength(0)
    })
  })

  describe('delegationLog', () => {
    const baseLogEntry = {
      timestamp: Date.now(),
      app: 'wechat',
      action: 'replied' as const,
      contact: 'Alice',
      replySent: 'I am busy right now',
    }

    it('addDelegationLog adds entry', () => {
      useAdminStore.getState().addDelegationLog(baseLogEntry)
      const log = useAdminStore.getState().delegationLog
      expect(log).toHaveLength(1)
      expect(log[0].app).toBe('wechat')
      expect(log[0].id).toBeGreaterThan(0)
    })

    it('delegationLog capped at 200', () => {
      const store = useAdminStore.getState()
      for (let i = 0; i < 210; i++) {
        store.addDelegationLog({ ...baseLogEntry, contact: `user_${i}` })
      }
      expect(useAdminStore.getState().delegationLog).toHaveLength(200)
    })

    it('getDelegationLog filters by app', () => {
      const store = useAdminStore.getState()
      store.addDelegationLog({ ...baseLogEntry, app: 'wechat' })
      store.addDelegationLog({ ...baseLogEntry, app: 'discord' })
      store.addDelegationLog({ ...baseLogEntry, app: 'wechat' })
      const filtered = useAdminStore.getState().getDelegationLog('wechat')
      expect(filtered).toHaveLength(2)
      expect(filtered.every((e) => e.app === 'wechat')).toBe(true)
    })
  })
})
