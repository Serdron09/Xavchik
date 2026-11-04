import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { useColl } from '../data/hooks'
import { createPlace, placesQuery } from '../data/api'
import type { Place } from '../lib/types'
import { matches } from '../lib/text'
import { Button, Card, Empty, Field, Input, Modal, Spinner, Toggle } from '../components/ui'

export function Places() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [showArchived, setShowArchived] = useState(false)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)

  const { data: places, loading } = useColl<Place>(() => placesQuery(showArchived), [showArchived])

  const shown = useMemo(
    () =>
      places.filter(
        (p) => matches(p.name, q) || p.tags?.some((tag) => matches(tag, q)) || matches(p.nameNote ?? '', q),
      ),
    [places, q],
  )

  async function submit() {
    if (!user || !name.trim()) return
    setBusy(true)
    try {
      await createPlace(user.uid, {
        name: name.trim(),
        tags: tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setName('')
      setTags('')
      setAdding(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('places.title')}</h1>
        <Button variant="primary" onClick={() => setAdding(true)}>
          + {t('places.new')}
        </Button>
      </div>

      <Input placeholder={t('places.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
      <Toggle checked={showArchived} onChange={setShowArchived} label={t('places.showArchived')} />

      {loading ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <Empty>{places.length === 0 ? t('places.empty') : t('common.empty')}</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((p) => (
            <Link key={p.id} to={`/places/${p.id}`}>
              <Card className="transition-colors hover:border-ink-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold">
                      {p.name}
                      {p.isArchived && (
                        <span className="ms-2 text-xs text-ink-500">({t('common.archived')})</span>
                      )}
                    </div>
                    {p.nameNote && <div className="text-sm text-ink-400">{p.nameNote}</div>}
                    {p.tags?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1 text-xs text-ink-400">
                        {p.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-ink-800 px-2 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title={t('places.new')}>
        <div className="flex flex-col gap-3">
          <Field label={t('common.name')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label={t('common.tags')} hint={t('places.tagsPh')}>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button variant="primary" onClick={submit} disabled={busy || !name.trim()}>
              {t('common.create')}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
