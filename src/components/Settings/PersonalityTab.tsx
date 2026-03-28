import { useConfigStore } from '@/stores/configStore'
import { useI18n } from '@/i18n/useI18n'
import Toggle from '@/components/ui/Toggle'
import Slider from '@/components/ui/Slider'

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-white/50 text-xs mb-1 mt-2">{children}</p>
}

export default function PersonalityTab() {
  const config = useConfigStore()
  const { t } = useI18n()

  return (
    <>
      <Label>{t('settings.personality.userName')}</Label>
      <input
        value={config.userName}
        onChange={(e) => config.setUserName(e.target.value)}
        className="nr-input"
        placeholder={t('settings.personality.userNamePlaceholder')}
      />
      <div className="flex items-center justify-between mt-2 mb-3">
        <span className="text-white/60 text-xs">{t('settings.personality.thirdPerson')}</span>
        <Toggle
          value={config.thirdPerson}
          onChange={() => config.setThirdPerson(!config.thirdPerson)}
          size="md"
        />
      </div>
      <Slider
        label={t('settings.personality.concise')}
        value={Math.round(config.verbosity * 100)}
        onChange={(v) => config.setPersonality('verbosity', v / 100)}
      />
      <Slider
        label={t('settings.personality.formal')}
        value={Math.round(config.formality * 100)}
        onChange={(v) => config.setPersonality('formality', v / 100)}
      />
      <Slider
        label={t('settings.personality.cautious')}
        value={Math.round(config.proactivity * 100)}
        onChange={(v) => config.setPersonality('proactivity', v / 100)}
      />
      <div className="flex flex-wrap gap-1 mt-3">
        {[
          { name: t('settings.personality.default'), v: 0.3, f: 0.7, p: 0.3 },
          { name: t('settings.personality.professional'), v: 0.2, f: 0.2, p: 0.2 },
          { name: t('settings.personality.lively'), v: 0.8, f: 0.9, p: 0.7 },
          { name: t('settings.personality.minimal'), v: 0.1, f: 0.3, p: 0.1 },
        ].map((preset) => (
          <button
            key={preset.name}
            onClick={() => {
              config.setPersonality('verbosity', preset.v)
              config.setPersonality('formality', preset.f)
              config.setPersonality('proactivity', preset.p)
            }}
            className="px-3 py-1 rounded-full text-xs bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>
    </>
  )
}
