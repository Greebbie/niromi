import { skillRegistry } from './registry'
import { useAdminStore } from '@/stores/adminStore'
import { useSkillConfigStore } from '@/stores/skillConfigStore'
import { useChatStore } from '@/stores/chatStore'
import { useConfigStore } from '@/stores/configStore'
import WeChatDelegateConfig from './wechat-delegate-config'
import { startVisionMonitor, stopVisionMonitor, isVisionMonitorRunning } from '@/hooks/useVisionMonitor'

const SKILL_ID = 'wechat_delegate'
const RULE_ID_PREFIX = 'wechat_delegate_'

const DEFAULT_CONFIG = {
  useAI: true,
  replyTemplate: '我现在不在，稍后回复你',
  idleMinutes: 5,
  requireConfirm: true,
  sensitiveKeywords: ['钱', '银行', '密码', '账号', '转账'],
  sensitiveInstruction: '不要讨论财务信息，不要透露个人联系方式和地址',
  maxRepliesPerContact: 3,
}

function getConfig(): Record<string, unknown> {
  const entry = useSkillConfigStore.getState().getConfig(SKILL_ID)
  return entry?.config && Object.keys(entry.config).length > 0
    ? entry.config
    : { ...DEFAULT_CONFIG }
}

function activateDelegate() {
  const config = getConfig()
  const adminStore = useAdminStore.getState()
  const chatStore = useChatStore.getState()

  // Remove any existing wechat delegate rules
  const existingRules = adminStore.autoReplyRules.filter(
    (r) => r.sourceSkill === SKILL_ID
  )
  for (const rule of existingRules) {
    adminStore.deleteAutoReplyRule(rule.id)
  }

  // Create auto-reply rule from config
  adminStore.addAutoReplyRule({
    name: '微信托管',
    enabled: true,
    app: 'wechat',
    triggerKeywords: ['新消息', '发来', '说', ':', '：'],
    replyTemplate: (config.replyTemplate as string) || DEFAULT_CONFIG.replyTemplate,
    useAI: (config.useAI as boolean) ?? true,
    idleMinutes: (config.idleMinutes as number) ?? 5,
    requireConfirm: (config.requireConfirm as boolean) ?? true,
    sensitiveKeywords: (config.sensitiveKeywords as string[]) ?? DEFAULT_CONFIG.sensitiveKeywords,
    sensitiveInstruction: (config.sensitiveInstruction as string) ?? DEFAULT_CONFIG.sensitiveInstruction,
    maxRepliesPerContact: (config.maxRepliesPerContact as number) ?? 3,
    sourceSkill: SKILL_ID,
  })

  // Set vision target to WeChat window
  useConfigStore.getState().setVisionTarget('微信')

  // Start vision monitor if not running
  if (!isVisionMonitorRunning()) {
    startVisionMonitor()
  }

  chatStore.addMessage({
    role: 'assistant',
    content: '💬 微信托管已启动！我会帮你监控微信消息~',
  })
}

function deactivateDelegate() {
  const adminStore = useAdminStore.getState()
  const chatStore = useChatStore.getState()

  // Remove delegate rules
  const delegateRules = adminStore.autoReplyRules.filter(
    (r) => r.sourceSkill === SKILL_ID
  )
  for (const rule of delegateRules) {
    adminStore.deleteAutoReplyRule(rule.id)
  }

  // Stop vision monitor if no other rules need it
  const remaining = adminStore.autoReplyRules.filter(
    (r) => r.enabled && r.sourceSkill !== SKILL_ID && r.triggerKeywords?.length
  )
  const hasOtherVision = adminStore.monitorRules.some(
    (r) => r.enabled && r.trigger.type === 'content_change'
  )
  if (remaining.length === 0 && !hasOtherVision && isVisionMonitorRunning()) {
    stopVisionMonitor()
  }

  chatStore.addMessage({
    role: 'assistant',
    content: '💬 微信托管已关闭~',
  })
}

export function registerWeChatDelegateSkill() {
  skillRegistry.register({
    id: SKILL_ID,
    name: '微信托管',
    nameEn: 'WeChat Delegation',
    icon: '💬',
    category: 'apps',
    description: 'Auto-reply WeChat while away',
    keywords: ['微信', '托管', '自动回复', 'wechat', 'delegate', 'auto-reply'],
    configurable: true,
    defaultConfig: { ...DEFAULT_CONFIG },
    ConfigPanel: WeChatDelegateConfig,
    execute: async () => {
      const skillConfig = useSkillConfigStore.getState()
      const entry = skillConfig.getConfig(SKILL_ID)
      const isEnabled = entry?.enabled ?? false

      if (isEnabled) {
        // Toggle off
        skillConfig.setEnabled(SKILL_ID, false)
        deactivateDelegate()
      } else {
        // Toggle on
        skillConfig.setEnabled(SKILL_ID, true)
        activateDelegate()
      }
    },
  })
}
