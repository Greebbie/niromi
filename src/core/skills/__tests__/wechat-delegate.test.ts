import { describe, it, expect, beforeEach, vi } from 'vitest'
import { skillRegistry } from '../registry'
import { useAdminStore } from '@/stores/adminStore'
import { useSkillConfigStore } from '@/stores/skillConfigStore'
import { useChatStore } from '@/stores/chatStore'
import { useConfigStore } from '@/stores/configStore'

vi.mock('@/hooks/useVisionMonitor', () => ({
  startVisionMonitor: vi.fn(),
  stopVisionMonitor: vi.fn(),
  isVisionMonitorRunning: vi.fn().mockReturnValue(false),
}))

vi.mock('./wechat-delegate-config', () => ({
  default: () => null,
}))

import { registerWeChatDelegateSkill } from '../wechat-delegate'
import { startVisionMonitor, stopVisionMonitor, isVisionMonitorRunning } from '@/hooks/useVisionMonitor'

describe('wechat-delegate', () => {
  beforeEach(() => {
    (skillRegistry as any).skills.clear()
    useAdminStore.setState({
      autoReplyRules: [],
      monitorRules: [],
      permissions: [],
      auditLog: [],
      delegationLog: [],
      isAdminOpen: false,
    })
    useSkillConfigStore.setState({ configs: {} })
    useChatStore.setState({
      messages: [],
      isStreaming: false,
      isChatOpen: false,
      pendingConfirm: null,
      pendingPrompt: null,
    })
    useConfigStore.setState({ visionTarget: 'off', isLoading: false })
    vi.clearAllMocks()
  })

  describe('registerWeChatDelegateSkill', () => {
    it('registers skill in skillRegistry', () => {
      registerWeChatDelegateSkill()
      expect(skillRegistry.get('wechat_delegate')).toBeDefined()
    })

    it('registered skill has correct id', () => {
      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')
      expect(skill!.id).toBe('wechat_delegate')
    })

    it('registered skill has correct category apps', () => {
      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')
      expect(skill!.category).toBe('apps')
    })

    it('registered skill is configurable', () => {
      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')
      expect(skill!.configurable).toBe(true)
    })
  })

  describe('execute toggle', () => {
    it('activates when not enabled', async () => {
      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')!

      await skill.execute!('')

      // Should have set enabled to true
      const entry = useSkillConfigStore.getState().getConfig('wechat_delegate')
      expect(entry?.enabled).toBe(true)

      // Should have created an auto-reply rule
      const rules = useAdminStore.getState().autoReplyRules
      expect(rules).toHaveLength(1)
      expect(rules[0].sourceSkill).toBe('wechat_delegate')

      // Should have started vision monitor
      expect(startVisionMonitor).toHaveBeenCalled()
    })

    it('deactivates when enabled', async () => {
      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')!

      // First activate
      useSkillConfigStore.getState().setEnabled('wechat_delegate', true)

      await skill.execute!('')

      // Should have set enabled to false
      const entry = useSkillConfigStore.getState().getConfig('wechat_delegate')
      expect(entry?.enabled).toBe(false)

      // Should have added deactivation message
      const messages = useChatStore.getState().messages
      expect(messages.some((m) => m.content.includes('关闭'))).toBe(true)
    })
  })

  describe('activateDelegate', () => {
    it('creates auto-reply rule with sourceSkill wechat_delegate', async () => {
      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')!
      await skill.execute!('')

      const rules = useAdminStore.getState().autoReplyRules
      expect(rules).toHaveLength(1)
      expect(rules[0].sourceSkill).toBe('wechat_delegate')
      expect(rules[0].name).toBe('微信托管')
      expect(rules[0].app).toBe('wechat')
    })

    it('removes old delegate rules first', async () => {
      // Pre-populate with an existing delegate rule
      useAdminStore.getState().addAutoReplyRule({
        name: '旧微信托管',
        enabled: true,
        app: 'wechat',
        useAI: true,
        requireConfirm: true,
        sourceSkill: 'wechat_delegate',
      })
      expect(useAdminStore.getState().autoReplyRules).toHaveLength(1)

      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')!
      await skill.execute!('')

      // Old rule removed, new one created
      const rules = useAdminStore.getState().autoReplyRules
      expect(rules).toHaveLength(1)
      expect(rules[0].name).toBe('微信托管')
    })

    it('sets visionTarget to wechat', async () => {
      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')!
      await skill.execute!('')

      expect(useConfigStore.getState().visionTarget).toBe('微信')
    })

    it('starts vision monitor if not running', async () => {
      vi.mocked(isVisionMonitorRunning).mockReturnValue(false)

      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')!
      await skill.execute!('')

      expect(startVisionMonitor).toHaveBeenCalled()
    })

    it('does not start vision monitor if already running', async () => {
      vi.mocked(isVisionMonitorRunning).mockReturnValue(true)

      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')!
      await skill.execute!('')

      expect(startVisionMonitor).not.toHaveBeenCalled()
    })
  })

  describe('deactivateDelegate', () => {
    it('removes only wechat_delegate rules and preserves manual rules', async () => {
      // Add a manual rule
      useAdminStore.getState().addAutoReplyRule({
        name: '手动规则',
        enabled: true,
        app: 'discord',
        useAI: false,
        requireConfirm: false,
      })

      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')!

      // Activate first
      await skill.execute!('')
      expect(useAdminStore.getState().autoReplyRules).toHaveLength(2)

      // Then deactivate
      await skill.execute!('')

      const remaining = useAdminStore.getState().autoReplyRules
      expect(remaining).toHaveLength(1)
      expect(remaining[0].name).toBe('手动规则')
    })

    it('adds chat message confirming deactivation', async () => {
      registerWeChatDelegateSkill()
      const skill = skillRegistry.get('wechat_delegate')!

      // Activate then deactivate
      await skill.execute!('')
      await skill.execute!('')

      const messages = useChatStore.getState().messages
      const deactivateMsg = messages.find((m) => m.content.includes('关闭'))
      expect(deactivateMsg).toBeDefined()
      expect(deactivateMsg!.role).toBe('assistant')
    })
  })
})
