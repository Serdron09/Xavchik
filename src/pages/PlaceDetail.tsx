import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { useColl, useDocLive } from '../data/hooks'
import {
  addMenuItem,
  bulkAddMenuItems,
  createOrder,
  deleteMenuItem,
  deletePlace,
  menuQuery,
  parseMenuLines,
  placeRef,
  updateMenuItem,
  updatePlace,
} from '../data/api'
import type { MenuItem, Place } from '../lib/types'
import { matches } from '../lib/text'
import { money } from '../lib/format'
import { Button, Card, Empty, Field, Input, Modal, Spinner, Textarea } from '../components/ui'
import { MenuItemEditor, type MenuDraft } from '../components/MenuItemEditor'

export function PlaceDetail() {
  const { placeId = '' } = useParams()
  const { t } = useI18n()
  const { user, member, isAdmin } = useAuth()
  const nav = useNavigate()

  const { data: place, loading } = useDocLive<Place>(() => placeRef(placeId), [placeId])
  const { data: items } = useColl<MenuItem>(() => menuQuery(placeId), [placeId])

  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<MenuItem | null | undefined>(undefined)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkCat, setBulkCat] = useState('')
  const [editPlace, setEditPlace] = useState(false)
  const [busy, setBusy] = useState(false)

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))].sort(),
    [items],
  )

  const grouped = useMemo(() => {
    const shown = items.filter((i) => matches(i.name, q) || matches(i.description ?? '', q))
    const map = new Map<string, MenuItem[]>()
    for (const i of shown) {
      const key = i.category || ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [items, q])

  if (loading) return <Spinner />
  if (!place) return <Empty>{t('common.empty')}</Empty>

  async function saveItem(draft: MenuDraft) {
    if (!user) return
    if (editing) await updateMenuItem(placeId, editing.id, user.uid, draft)
    else await addMenuItem(placeId, user.uid, draft)
  }

  async function applyBulk() {
    if (!user) return
    const rows = parseMenuLines(bulkText)
    if (rows.length === 0) return
    setBusy(true)
    try {
      await bulkAddMenuItems(placeId, user.uid, rows, bulkCat.trim())
      setBulkText('')
      setBulkOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function orderHere() {
    if (!user || !place) return
    setBusy(true)
    try {
      const id = await createOrder(user.uid, member?.displayName ?? '', {
        id: place.id,
        name: place.name,
        deliveryFee: place.deliveryFee ?? null,
      })
      nav(`/order/${id}`)
    } finally {
      setBusy(false)
    }
  }

  const canDelete = isAdmin || place.createdBy === user?.uid

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" onClick={() => nav('/places')}>
          ← {t('common.back')}
        </Button>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{place.name}</h1>
            {place.nameNote && <p className="text-sm text-ink-400">{place.nameNote}</p>}
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-ink-400">
              {place.phone && <a href={`tel:${place.phone}`} className="underline">{place.phone}</a>}
              {place.url && (
                <a href={place.url} target="_blank" rel="noreferrer" className="underline">
                  {t('common.link')}
                </a>
              )}
              {place.deliveryFee != null && (
                <span>
                  {t('places.delivery')}: {money(place.deliveryFee)}
                </span>
              )}
              {place.minOrder != null && (
                <span>
                  {t('places.minOrder')}: {money(place.minOrder)}
                </span>
              )}
            </div>
            {place.notes && <p className="mt-2 text-sm text-ink-300">{place.notes}</p>}
          </div>
          <Button size="sm" onClick={() => setEditPlace(true)}>
            {t('common.edit')}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={orderHere} disabled={busy}>
            {t('places.orderHere')}
          </Button>
          <Button
            size="sm"
            onClick={() => user && updatePlace(place.id, user.uid, { isArchived: !place.isArchived })}
          >
            {place.isArchived ? t('common.restore') : t('common.archive')}
          </Button>
          {canDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (!confirm(t('places.deleteConfirm'))) return
                await deletePlace(place.id)
                nav('/places')
              }}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">
          {t('menu.title')} <span className="text-sm text-ink-500">({items.length})</span>
        </h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setBulkOpen(true)}>
            {t('menu.bulk')}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setEditing(null)}>
            + {t('menu.add')}
          </Button>
        </div>
      </div>

      {items.length > 6 && (
        <Input placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      )}

      {items.length === 0 ? (
        <Empty>{t('menu.empty')}</Empty>
      ) : (
        grouped.map(([cat, list]) => (
          <div key={cat} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-ink-400">{cat || t('menu.noCategory')}</h3>
            {list.map((item) => (
              <Card key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className={`font-medium ${item.isAvailable ? '' : 'text-ink-500 line-through'}`}>
                    {item.name}
                  </div>
                  {item.description && (
                    <div className="text-sm text-ink-400">{item.description}</div>
                  )}
                  {item.options?.length > 0 && (
                    <div className="mt-1 text-xs text-ink-500">
                      {item.options.map((o) => o.label).filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm text-ink-300">{money(item.price)}</span>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(item)}>
                    ✎
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMenuItem(placeId, item.id)}
                  >
                    ✕
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ))
      )}

      <MenuItemEditor
        open={editing !== undefined}
        item={editing}
        categories={categories}
        onClose={() => setEditing(undefined)}
        onSave={saveItem}
      />

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={t('menu.bulk')}>
        <div className="flex flex-col gap-3">
          <Field label={t('common.category')}>
            <Input value={bulkCat} onChange={(e) => setBulkCat(e.target.value)} />
          </Field>
          <Field hint={t('menu.bulkHint')}>
            <Textarea rows={8} value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
          </Field>
          {bulkText.trim() && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-ink-800 p-2 text-sm">
              {parseMenuLines(bulkText).map((r, i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-ink-800 py-1 last:border-0">
                  <span>{r.name}</span>
                  <span className="text-ink-400">{money(r.price)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="primary" onClick={applyBulk} disabled={busy || !bulkText.trim()}>
              {t('menu.bulkApply')}
            </Button>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Modal>

      <PlaceEditModal
        open={editPlace}
        place={place}
        onClose={() => setEditPlace(false)}
        onSave={async (patch) => {
          if (user) await updatePlace(place.id, user.uid, patch)
        }}
      />
    </div>
  )
}

function PlaceEditModal({
  open,
  place,
  onClose,
  onSave,
}: {
  open: boolean
  place: Place
  onClose: () => void
  onSave: (patch: Partial<Place>) => Promise<void>
}) {
  const { t } = useI18n()
  const [form, setForm] = useState({
    name: place.name,
    nameNote: place.nameNote ?? '',
    phone: place.phone ?? '',
    url: place.url ?? '',
    tags: (place.tags ?? []).join(', '),
    deliveryFee: place.deliveryFee ?? ('' as number | ''),
    minOrder: place.minOrder ?? ('' as number | ''),
    notes: place.notes ?? '',
  })
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await onSave({
        name: form.name.trim(),
        nameNote: form.nameNote.trim(),
        phone: form.phone.trim(),
        url: form.url.trim(),
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        deliveryFee: form.deliveryFee === '' ? null : Number(form.deliveryFee),
        minOrder: form.minOrder === '' ? null : Number(form.minOrder),
        notes: form.notes.trim(),
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('common.edit')}>
      <div className="flex flex-col gap-3">
        <Field label={t('common.name')}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={t('places.nameNote')} hint={t('places.nameNotePh')}>
          <Input
            value={form.nameNote}
            onChange={(e) => setForm({ ...form, nameNote: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.phone')}>
            <Input
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label={t('common.link')}>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </Field>
        </div>
        <Field label={t('common.tags')} hint={t('places.tagsPh')}>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('places.delivery')}>
            <Input
              type="number"
              inputMode="decimal"
              value={form.deliveryFee}
              onChange={(e) =>
                setForm({ ...form, deliveryFee: e.target.value === '' ? '' : Number(e.target.value) })
              }
            />
          </Field>
          <Field label={t('places.minOrder')}>
            <Input
              type="number"
              inputMode="decimal"
              value={form.minOrder}
              onChange={(e) =>
                setForm({ ...form, minOrder: e.target.value === '' ? '' : Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <Field label={t('common.notes')}>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <div className="flex gap-2">
          <Button variant="primary" onClick={save} disabled={busy || !form.name.trim()}>
            {t('common.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
