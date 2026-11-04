import { NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { LangSwitch } from './LangSwitch'

const tabs = [
  { to: '/', key: 'nav.home' },
  { to: '/places', key: 'nav.places' },
  { to: '/polls', key: 'nav.polls' },
  { to: '/members', key: 'nav.members' },
] as const

export function Layout() {
  const { t } = useI18n()
  const { member, signOut } = useAuth()

  return (
    <div className="mx-auto min-h-dvh max-w-3xl pb-24">
      <header className="no-print sticky top-0 z-30 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="text-xl font-bold">
            {t('app.name')}
          </NavLink>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <button
              onClick={signOut}
              title={t('nav.signOut')}
              className="max-w-28 truncate rounded-full border border-ink-700 px-3 py-1 text-sm text-ink-300"
            >
              {member?.displayName ?? '—'}
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        <Outlet />
      </main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-sm ${isActive ? 'font-semibold text-accent' : 'text-ink-400'}`
              }
            >
              {t(tab.key)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
