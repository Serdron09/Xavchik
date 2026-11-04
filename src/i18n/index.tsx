import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import he from './he'
import ru from './ru'
import type { Lang } from '../lib/types'

export type TKey = keyof typeof he
const dicts = { he, ru } as const

const LS_KEY = 'havchik.lang'

function initialLang(): Lang {
  const stored = localStorage.getItem(LS_KEY)
  if (stored === 'he' || stored === 'ru') return stored
  return 'he'
}

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKey, params?: Record<string, string | number>) => string
  dir: 'rtl' | 'ltr'
}

const Ctx = createContext<I18nCtx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang)

  useEffect(() => {
    localStorage.setItem(LS_KEY, lang)
    const dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang])

  const value = useMemo<I18nCtx>(() => {
    const dict = dicts[lang]
    return {
      lang,
      setLang,
      dir: lang === 'he' ? 'rtl' : 'ltr',
      t: (key, params) => {
        let s: string = dict[key] ?? he[key] ?? String(key)
        if (params) {
          for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v))
        }
        return s
      },
    }
  }, [lang])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n outside provider')
  return ctx
}

export function useT() {
  return useI18n().t
}
