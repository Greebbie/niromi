import { vi } from 'vitest'
import { useSkillConfigStore } from '../skillConfigStore'

describe('skillConfigStore', () => {
  beforeEach(() => {
    useSkillConfigStore.setState({ configs: {} })
  })

  describe('setEnabled', () => {
    it('creates new entry when skill not configured', () => {
      useSkillConfigStore.getState().setEnabled('wechat-guard', true)
      const configs = useSkillConfigStore.getState().configs
      expect(configs['wechat-guard']).toEqual({ enabled: true, config: {} })
    })

    it('updates existing entry', () => {
      useSkillConfigStore.getState().setEnabled('wechat-guard', true)
      useSkillConfigStore.getState().setEnabled('wechat-guard', false)
      const configs = useSkillConfigStore.getState().configs
      expect(configs['wechat-guard'].enabled).toBe(false)
    })
  })

  describe('setConfig', () => {
    it('stores config for skill', () => {
      useSkillConfigStore.getState().setConfig('wechat-guard', { replyDelay: 5000 })
      const configs = useSkillConfigStore.getState().configs
      expect(configs['wechat-guard'].config).toEqual({ replyDelay: 5000 })
    })

    it('preserves enabled state', () => {
      useSkillConfigStore.getState().setEnabled('wechat-guard', true)
      useSkillConfigStore.getState().setConfig('wechat-guard', { replyDelay: 5000 })
      const configs = useSkillConfigStore.getState().configs
      expect(configs['wechat-guard'].enabled).toBe(true)
      expect(configs['wechat-guard'].config).toEqual({ replyDelay: 5000 })
    })
  })

  describe('getConfig', () => {
    it('returns undefined for unconfigured skill', () => {
      const result = useSkillConfigStore.getState().getConfig('nonexistent')
      expect(result).toBeUndefined()
    })

    it('returns entry for configured skill', () => {
      useSkillConfigStore.getState().setEnabled('code-watch', true)
      useSkillConfigStore.getState().setConfig('code-watch', { interval: 120 })
      const result = useSkillConfigStore.getState().getConfig('code-watch')
      expect(result).toEqual({ enabled: true, config: { interval: 120 } })
    })
  })

  describe('hasAnyEnabled', () => {
    it('returns false when no skills enabled', () => {
      expect(useSkillConfigStore.getState().hasAnyEnabled()).toBe(false)
    })

    it('returns true when at least one skill enabled', () => {
      useSkillConfigStore.getState().setEnabled('wechat-guard', true)
      expect(useSkillConfigStore.getState().hasAnyEnabled()).toBe(true)
    })
  })
})
