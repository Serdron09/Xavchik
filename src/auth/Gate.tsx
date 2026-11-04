import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { useI18n } from '../i18n'
import { Button, Card, Field, Input, Spinner } from '../components/ui'
import { LangSwitch } from '../components/LangSwitch'

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('app.name')}</h1>
          <p className="text-ink-400">{t('app.tagline')}</p>
        </div>
        <LangSwitch />
      </div>
      {children}
    </div>
  )
}

export function SignIn() {
  const { signInGoogle, signInAnon } = useAuth()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setErr('')
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('auth.signInTitle')}</h2>
        <p className="text-sm text-ink-400">{t('auth.signInHint')}</p>
        <Button variant="primary" size="lg" disabled={busy} onClick={() => run(signInGoogle)}>
          {t('auth.google')}
        </Button>
        <Button size="lg" disabled={busy} onClick={() => run(signInAnon)}>
          {t('auth.anon')}
        </Button>
        {err && <p className="text-sm text-red-400">{err}</p>}
      </Card>
    </Shell>
  )
}

export function Join() {
  const { join, signOut, user } = useAuth()
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [name, setName] = useState(user?.displayName ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    setBusy(true)
    setErr('')
    try {
      await join(code, name)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setErr(msg.includes('permission') || msg.includes('insufficient') ? t('auth.join.badCode') : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('auth.join.title')}</h2>
        <Field label={t('auth.join.name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('auth.join.code')}>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            className="tracking-[0.3em] uppercase"
          />
        </Field>
        <Button variant="primary" size="lg" disabled={busy || !code.trim()} onClick={submit}>
          {t('auth.join.submit')}
        </Button>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <Button variant="ghost" size="sm" onClick={signOut}>
          {t('auth.signOut')}
        </Button>
      </Card>
    </Shell>
  )
}

export function Loading() {
  const { t } = useI18n()
  return (
    <Shell>
      <Spinner label={t('common.loading')} />
    </Shell>
  )
}
