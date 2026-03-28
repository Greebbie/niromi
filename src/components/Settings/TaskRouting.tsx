import { useConfigStore, type AIProviderType, type AITask } from '@/stores/configStore'
import { useI18n } from '@/i18n/useI18n'

interface ProviderOption {
  id: AIProviderType
  name: string
}

const PROVIDERS: ProviderOption[] = [
  { id: 'claude', name: 'Claude' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'ollama', name: 'Ollama' },
  { id: 'vllm', name: 'vLLM' },
  { id: 'qwen', name: 'Qwen' },
  { id: 'minimax', name: 'Minimax' },
]

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-white/50 text-xs mb-1 mt-2">{children}</p>
}

export default function TaskRouting() {
  const config = useConfigStore()
  const { t } = useI18n()

  return (
    <>
      <Label>{t('settings.ai.routing')}</Label>
      <div className="space-y-1.5">
        {(['chat', 'vision', 'monitoring'] as AITask[]).map((task) => {
          const route = config.modelRouting[task]
          const isOverridden = !!route?.provider
          return (
            <div key={task} className="flex items-center gap-2">
              <span className="text-caption text-white/50 w-14 shrink-0">{t(`settings.ai.task.${task}`)}</span>
              <select
                value={route?.provider || ''}
                onChange={(e) => {
                  const val = e.target.value as AIProviderType | ''
                  if (!val) {
                    config.setTaskRoute(task, undefined)
                  } else {
                    config.setTaskRoute(task, { ...route, provider: val })
                  }
                }}
                className="flex-1 bg-white/10 text-white text-caption rounded px-1.5 py-1 border border-white/10"
              >
                <option value="">{t('settings.ai.routing.inherit')}</option>
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {isOverridden && (
                <input
                  value={route?.apiKey || ''}
                  onChange={(e) => config.setTaskRoute(task, { ...route, apiKey: e.target.value })}
                  placeholder="API Key"
                  type="password"
                  className="w-20 bg-white/10 text-white text-caption rounded px-1.5 py-1 border border-white/10 placeholder:text-white/20"
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
