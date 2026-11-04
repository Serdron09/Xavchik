import { doc } from 'firebase/firestore'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { useColl, useDocLive } from '../data/hooks'
import { membersQuery, removeMember, setMemberRole } from '../data/api'
import { db } from '../lib/firebase'
import type { Member } from '../lib/types'
import { Button, Card, Field, Input, Spinner } from '../components/ui'

export function Members() {
  const { t } = useI18n()
  const { user, member, isAdmin, updateMe } = useAuth()
  const { data: members, loading } = useColl<Member>(() => membersQuery(), [])
  // readable by admins only (see firestore.rules)
  const { data: invite } = useDocLive<{ code: string }>(
    () => (isAdmin ? doc(db, 'config', 'invite') : null),
    [isAdmin],
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('members.title')}</h1>

      <Card className="flex flex-col gap-3">
        <Field label={t('profile.name')}>
          <Input
            defaultValue={member?.displayName ?? ''}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== member?.displayName) void updateMe({ displayName: v })
            }}
          />
        </Field>
        {isAdmin && invite?.code && (
          <Field label={t('members.inviteCode')} hint={t('members.inviteHint')}>
            <div className="rounded-xl border border-ink-700 bg-ink-950/60 px-3 py-2 font-mono text-lg tracking-[0.3em]">
              {invite.code}
            </div>
          </Field>
        )}
      </Card>

      {loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <Card key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {m.displayName}
                  {m.id === user?.uid && (
                    <span className="ms-2 text-xs text-ink-500">({t('common.you')})</span>
                  )}
                </div>
                <div className="text-sm text-ink-400">
                  {m.role === 'admin' ? t('members.role.admin') : t('members.role.member')}
                </div>
              </div>
              {isAdmin && m.id !== user?.uid && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    onClick={() => setMemberRole(m.id, m.role === 'admin' ? 'member' : 'admin')}
                  >
                    {m.role === 'admin' ? t('members.makeMember') : t('members.makeAdmin')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm(t('members.removeConfirm'))) void removeMember(m.id)
                    }}
                  >
                    {t('common.remove')}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {!isAdmin && <p className="text-xs text-ink-500">{t('members.adminOnly')}</p>}
    </div>
  )
}
