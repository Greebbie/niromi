import { create } from 'zustand'

interface SkillConfigEntry {
  enabled: boolean
  config: Record<string, unknown>
}

interface SkillConfigState {
  configs: Record<string, SkillConfigEntry>
  setEnabled: (skillId: string, enabled: boolean) => void
  setConfig: (skillId: string, config: Record<string, unknown>) => void
  getConfig: (skillId: string) => SkillConfigEntry | undefined
  hasAnyEnabled: () => boolean
  init: () => void
}

function persist(configs: Record<string, SkillConfigEntry>) {
  window.electronAPI?.storeSet('skill-configs', configs)
}

export const useSkillConfigStore = create<SkillConfigState>((set, get) => ({
  configs: {},

  init: async () => {
    try {
      const saved = await window.electronAPI?.storeGet('skill-configs') as Record<string, SkillConfigEntry> | undefined
      if (saved) set({ configs: saved })
    } catch {
      // Silent fail, use defaults
    }
  },

  setEnabled: (skillId, enabled) => {
    set((state) => {
      const existing = state.configs[skillId] || { enabled: false, config: {} }
      const newConfigs = { ...state.configs, [skillId]: { ...existing, enabled } }
      persist(newConfigs)
      return { configs: newConfigs }
    })
  },

  setConfig: (skillId, config) => {
    set((state) => {
      const existing = state.configs[skillId] || { enabled: false, config: {} }
      const newConfigs = { ...state.configs, [skillId]: { ...existing, config } }
      persist(newConfigs)
      return { configs: newConfigs }
    })
  },

  getConfig: (skillId) => {
    return get().configs[skillId]
  },

  hasAnyEnabled: () => {
    return Object.values(get().configs).some((c) => c.enabled)
  },
}))

export type { SkillConfigEntry, SkillConfigState }
