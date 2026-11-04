import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { useColl } from '../data/hooks'
import { createPoll, placesQuery, pollsQuery } from '../data/api'
import type { Place, Poll } from '../lib/types'
import { dateStr } from '../lib/format'
import { Button, Card, Chip, Empty, Field, Input, Modal, Spinner, Toggle } from '../components/ui'

export function Polls() {
  const { t } = useI18n()
  const { user, member } = useAuth()
  const { data: polls, loading } = useColl<Poll>(() => pollsQuery(), [])
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('poll.title')}</h1>
        <Button variant="primary" onClick={() => setOpen(true)}>
          + {t('poll.new')}
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : polls.length === 0 ? (
        <Empty>{t('poll.empty')}</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {polls.map((p) => (
            <Link key={p.id} to={`/polls/${p.id}`}>
              <Card className="transition-colors hover:border-ink-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{p.title}</div>
                    <div className="text-sm text-ink-400">
                      {dateStr(p.createdAt)} · {p.createdByName}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      p.status === 'open' ? 'bg-accent text-ink-950' : 'bg-ink-800 text-ink-400'
                    }`}
                  >
                    {p.status === 'open' ? t('poll.vote') : t('poll.closedLabel')}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <NewPoll
        open={open}
        onClose={() => setOpen(false)}
        onCreate={async (data) => {
          if (!user) return
          await createPoll(user.uid, member?.displayName ?? '', data)
        }}
      />
    </div>
  )
}

export function NewPoll({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (data: {
    title: string
    candidatePlaceIds: string[]
    allowMultiple: boolean
    deadline?: Date | null
  }) => Promise<void>
}) {
  const { t } = useI18n()
  const { data: places } = useColl<Place>(() => placesQuery(false), [])
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [multi, setMulti] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [busy, setBusy] = useState(false)

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function submit() {
    if (picked.length < 2) return
    setBusy(true)
    try {
      await onCreate({
        title: title.trim() || new Date().toLocaleDateString('he-IL'),
        candidatePlaceIds: picked,
        allowMultiple: multi,
        deadline: deadline ? new Date(deadline) : null,
      })
      setTitle('')
      setPicked([])
      setDeadline('')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('poll.new')}>
      <div className="flex flex-col gap-3">
        <Field label={t('common.name')}>
          <Input
            placeholder={t('poll.titlePh')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label={t('poll.candidates')} hint={t('poll.pickCandidates')}>
          <div className="mt-1 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
            {places.map((p) => (
              <Chip key={p.id} active={picked.includes(p.id)} onClick={() => toggle(p.id)}>
                {p.name}
              </Chip>
            ))}
          </div>
        </Field>

        <Toggle checked={multi} onChange={setMulti} label={t('poll.allowMultiple')} />

        <Field label={t('common.deadline')}>
          <Input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>

        <div className="flex gap-2">
          <Button variant="primary" onClick={submit} disabled={busy || picked.length < 2}>
            {t('common.create')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
