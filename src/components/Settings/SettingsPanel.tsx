import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConfigStore, type AIProviderType } from '@/stores/configStore'
import { testConnection } from '@/core/ai/testConnection'
import { humanizeError } from '@/core/errors/humanize'
import { isVisionCapable } from '@/core/ai/createProvider'
import ModelSelect from '@/components/ui/ModelSelect'
import Toggle from '@/components/ui/Toggle'
import { useI18n } from '@/i18n/useI18n'
import MemoryViewer from './MemoryViewer'
import STTSetup from './STTSetup'
import TaskRouting from './TaskRouting'
import PersonalityTab from './PersonalityTab'

type Tab = 'ai' | 'personality' | 'memory' | 'general'

interface ProviderOption {
  id: AIProviderType
  name: string
  needsKey: boolean
  needsBaseUrl: boolean
  needsGroupId: boolean
}

const PROVIDERS: ProviderOption[] = [
  { id: 'claude', name: 'Claude', needsKey: true, needsBaseUrl: false, needsGroupId: false },
  { id: 'openai', name: 'OpenAI', needsKey: true, needsBaseUrl: false, needsGroupId: false },
  { id: 'deepseek', name: 'DeepSeek', needsKey: true, needsBaseUrl: false, needsGroupId: false },
  { id: 'ollama', name: 'Ollama', needsKey: false, needsBaseUrl: true, needsGroupId: false },
  { id: 'vllm', name: 'vLLM', needsKey: false, needsBaseUrl: true, needsGroupId: false },
  { id: 'qwen', name: 'Qwen', needsKey: true, needsBaseUrl: false, needsGroupId: false },
  { id: 'minimax', name: 'Minimax', needsKey: true, needsBaseUrl: false, needsGroupId: true },
]

interface SettingsPanelProps {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('ai')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const config = useConfigStore()
  const currentProvider = PROVIDERS.find((p) => p.id === config.provider)
  const { t, lang } = useI18n()

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const error = await testConnection(config.provider, config.apiKey, config.baseUrl, config.groupId)
    if (error) {
      setTestResult({ ok: false, msg: humanizeError(error, lang) })
    } else {
      setTestResult({ ok: true, msg: t('settings.ai.testOk') })
    }
    setTesting(false)
  }

  const tabLabels: Record<Tab, string> = {
    ai: t('settings.tab.ai'),
    personality: t('settings.tab.personality'),
    memory: t('settings.tab.memory'),
    general: t('settings.tab.general'),
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      role="dialog"
      aria-modal="true"
      className="w-[360px] max-h-[500px] rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <span className="text-white text-sm font-medium">{t('settings.title')}</span>
        <button onClick={onClose} className="text-white/40 hover:text-white/80 text-lg">{'\u00D7'}</button>
      </div>
      <div className="flex border-b border-white/10">
        {(['ai', 'personality', 'memory', 'general'] as Tab[]).map((tabId) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={`flex-1 py-2 text-xs transition-colors ${
              tab === tabId ? 'text-white border-b-2 border-blue-400' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tabLabels[tabId]}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence mode="wait">
          {tab === 'ai' && (
            <TabContent key="ai">
              <Label>{t('settings.ai.service')}</Label>
              <div className="space-y-1">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { config.setProvider(p.id); setTestResult(null) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                      config.provider === p.id
                        ? 'bg-blue-500/30 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {currentProvider?.needsKey && (
                <>
                  <Label>{t('settings.ai.apiKey')}</Label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => config.setApiKey(e.target.value)}
                    className="nr-input"
                    placeholder="sk-..."
                  />
                </>
              )}
              {currentProvider?.needsBaseUrl && (
                <>
                  <Label>{t('settings.ai.baseUrl')}</Label>
                  <input
                    value={config.baseUrl}
                    onChange={(e) => config.setBaseUrl(e.target.value)}
                    className="nr-input"
                    placeholder="http://localhost:11434/v1"
                  />
                </>
              )}
              {currentProvider?.needsGroupId && (
                <>
                  <Label>{t('settings.ai.groupId')}</Label>
                  <input
                    value={config.groupId}
                    onChange={(e) => config.setGroupId(e.target.value)}
                    className="nr-input"
                    placeholder="Group ID"
                  />
                </>
              )}
              <Label>{t('settings.ai.model')}</Label>
              <ModelSelect
                provider={config.provider}
                value={config.model}
                onChange={(model) => config.setModel(model)}
              />
              <Label>{t('settings.ai.tokenBudget')}</Label>
              <div className="flex gap-1">
                {(['minimal', 'balanced', 'smart'] as const).map((budget) => (
                  <button
                    key={budget}
                    onClick={() => config.setTokenBudget(budget)}
                    className={`flex-1 px-3 py-1 rounded-full text-xs transition-colors ${
                      config.tokenBudget === budget
                        ? 'bg-blue-500/30 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {t(`settings.ai.budget.${budget}`)}
                  </button>
                ))}
              </div>

              <TaskRouting />
              {testResult && (
                <p className={`text-xs mt-2 ${testResult.ok ? 'text-green-400/80' : 'text-yellow-400/80'}`}>
                  {testResult.ok ? '\u2705 ' : ''}{testResult.msg}
                </p>
              )}
              <button
                onClick={handleTest}
                disabled={testing}
                className="btn-primary w-full mt-3 disabled:opacity-40"
              >
                {testing ? t('settings.ai.testing') : t('settings.ai.test')}
              </button>
            </TabContent>
          )}

          {tab === 'personality' && (
            <TabContent key="personality">
              <PersonalityTab />
            </TabContent>
          )}

          {tab === 'memory' && (
            <TabContent key="memory">
              <MemoryViewer />
            </TabContent>
          )}

          {tab === 'general' && (
            <TabContent key="general">
              <Label>{t('settings.general.language')}</Label>
              <select
                value={config.language}
                onChange={(e) => config.setLanguage(e.target.value as 'zh' | 'en' | 'auto')}
                className="nr-select"
              >
                <option value="auto">{t('settings.general.auto')}</option>
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
              <div className="flex items-center justify-between mt-2">
                <span className="text-white/60 text-xs">{t('settings.general.sound')}</span>
                <Toggle value={config.soundEnabled} onChange={() => config.setSoundEnabled(!config.soundEnabled)} />
              </div>
              <Label>{t('settings.general.screenTime')}</Label>
              <select
                value={config.screenTimeReminder}
                onChange={(e) => config.setScreenTimeReminder(Number(e.target.value))}
                className="nr-select"
              >
                <option value={0}>{t('settings.general.screenTime.off')}</option>
                <option value={30}>{t('settings.general.screenTime.30')}</option>
                <option value={60}>{t('settings.general.screenTime.60')}</option>
                <option value={120}>{t('settings.general.screenTime.120')}</option>
              </select>
              <div className="flex items-center justify-between mt-2">
                <span className="text-white/60 text-xs">{t('settings.general.tts')}</span>
                <Toggle value={config.ttsEnabled} onChange={() => config.setTtsEnabled(!config.ttsEnabled)} />
              </div>

              <FeatureSection
                title={lang === 'zh' ? '\u89C6\u89C9\u529F\u80FD / Vision' : 'Vision'}
                description={lang === 'zh' ? '\u5141\u8BB8 Niromi \u67E5\u770B\u5C4F\u5E55\u5185\u5BB9\uFF08\u9700\u8981\u652F\u6301\u89C6\u89C9\u7684 AI \u6A21\u578B\uFF09' : 'Allow Niromi to see screen content (requires vision-capable AI model)'}
              >
                {!isVisionCapable() && (
                  <p className="text-caption text-yellow-400/80 mb-1.5">
                    {lang === 'zh' ? '\u26A0 \u5F53\u524D\u6A21\u578B\u4E0D\u652F\u6301\u89C6\u89C9' : '\u26A0 Current model does not support vision'}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-caption text-white/50">{lang === 'zh' ? '\u542F\u7528\u89C6\u89C9' : 'Enable vision'}</span>
                  <Toggle value={config.visionTarget !== 'off'} onChange={() => config.setVisionTarget(config.visionTarget === 'off' ? 'fullscreen' : 'off')} />
                </div>
                {config.visionTarget !== 'off' && (
                  <p className="text-caption text-white/30 mt-1">
                    {lang === 'zh' ? '\u5F53\u524D\u6A21\u5F0F: ' : 'Current mode: '}
                    <span className={config.visionTarget === 'fullscreen' ? 'text-blue-400' : 'text-green-400'}>
                      {config.visionTarget === 'fullscreen'
                        ? (lang === 'zh' ? '\u5168\u5C4F' : 'Fullscreen')
                        : config.visionTarget}
                    </span>
                    {' '}
                    <span className="text-white/20">
                      ({lang === 'zh' ? '\u5728\u804A\u5929\u7A97\u53E3\u70B9\u51FB\u773C\u775B\u56FE\u6807\u5207\u6362' : 'Click eye icon in chat to change'})
                    </span>
                  </p>
                )}
              </FeatureSection>

              <FeatureSection
                title={lang === 'zh' ? '\u8BED\u97F3\u8F93\u5165 (Whisper)' : 'Voice Input (Whisper)'}
                description={lang === 'zh' ? '\u4E0B\u8F7D\u6A21\u578B\u540E\u53EF\u7528 Alt+M' : 'Download model to enable Alt+M'}
              >
                <STTSetup />
              </FeatureSection>
            </TabContent>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  )
}
function TabContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )
}
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-white/50 text-xs mb-1 mt-2">{children}</p>
}
function FeatureSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 p-2.5 rounded-lg bg-white/5 border border-white/5">
      <p className="text-white/80 text-xs font-medium">{title}</p>
      <p className="text-white/30 text-caption mb-2">{description}</p>
      {children}
    </div>
  )
}
