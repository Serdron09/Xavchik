import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'

export function LangSwitch() {
  const { lang, setLang } = useI18n()
  const auth = useAuth()

  function pick(l: 'he' | 'ru') {
    setLang(l)
    if (auth.member) void auth.updateMe({ lang: l })
  }

  return (
    <div className="flex overflow-hidden rounded-full border border-ink-700 text-sm">
      {(['he', 'ru'] as const).map((l) => (
        <button
          key={l}
          onClick={() => pick(l)}
          className={`px-3 py-1 ${lang === l ? 'bg-accent font-semibold text-ink-950' : 'text-ink-300'}`}
        >
          {l === 'he' ? 'עב' : 'RU'}
        </button>
      ))}
    </div>
  )
}
