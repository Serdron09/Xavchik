import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { useColl } from '../data/hooks'
import {
  createOrder,
  createPoll,
  openPollsQuery,
  orderItemsQuery,
  ordersQuery,
  placesQuery,
} from '../data/api'
import type { OrderItem, Order, Place, Poll } from '../lib/types'
import { dateStr, dateTimeStr, money, toDate } from '../lib/format'
import { Button, Card, Empty, Field, Input, Modal, Spinner } from '../components/ui'
import { NewPoll } from './Polls'

export function Home() {
  const { t } = useI18n()
  const { user, member } = useAuth()
  const nav = useNavigate()
  const [newOrder, setNewOrder] = useState(false)
  const [newPoll, setNewPoll] = useState(false)

  const { data: orders, loading } = useColl<Order>(() => ordersQuery(10), [])
  const { data: polls } = useColl<Poll>(() => openPollsQuery(), [])

  const open = orders.filter((o) => o.status === 'open')
  const past = orders.filter((o) => o.status !== 'open')

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <Spinner />
      ) : open.length > 0 ? (
        <>
          <h1 className="text-2xl font-bold">{t('home.openOrder')}</h1>
          {open.map((o) => (
            <OpenOrderCard key={o.id} order={o} />
          ))}
        </>
      ) : (
        <Card className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">{t('home.nothing')}</h1>
          <p className="text-sm text-ink-400">{t('home.nothingHint')}</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => setNewOrder(true)}>
          + {t('home.newOrder')}
        </Button>
        <Button onClick={() => setNewPoll(true)}>+ {t('home.newPoll')}</Button>
      </div>

      {polls.length > 0 && (
        <>
          <h2 className="mt-2 text-xl font-semibold">{t('home.activePoll')}</h2>
          {polls.map((p) => (
            <Link key={p.id} to={`/polls/${p.id}`}>
              <Card className="transition-colors hover:border-ink-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{p.title}</span>
                  <span className="shrink-0 text-sm text-ink-400">{p.createdByName}</span>
                </div>
              </Card>
            </Link>
          ))}
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-2 text-xl font-semibold">{t('home.recent')}</h2>
          <div className="flex flex-col gap-2">
            {past.slice(0, 5).map((o) => (
              <Link key={o.id} to={`/order/${o.id}/summary`}>
                <Card className="flex items-center justify-between gap-3 py-3 transition-colors hover:border-ink-700">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{o.placeNameSnapshot}</span>
                    <span className="text-sm text-ink-400">{dateStr(o.createdAt)}</span>
                  </span>
                  <span className="shrink-0 text-sm text-ink-400">{t('order.summary')} →</span>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      <NewOrder open={newOrder} onClose={() => setNewOrder(false)} />
      <NewPoll
        open={newPoll}
        onClose={() => setNewPoll(false)}
        onCreate={async (data) => {
          if (!user) return
          const id = await createPoll(user.uid, member?.displayName ?? '', data)
          nav(`/polls/${id}`)
        }}
      />
    </div>
  )
}

function OpenOrderCard({ order }: { order: Order }) {
  const { t } = useI18n()
  const { data: items } = useColl<OrderItem>(() => orderItemsQuery(order.id), [order.id])
  const people = new Set(items.map((i) => i.userId)).size
  const sum = items.reduce((s, i) => s + (i.priceEstimate ?? 0), 0)
  const deadline = toDate(order.deadline)
  const passed = !!deadline && deadline.getTime() < Date.now()

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <div className="text-2xl font-bold">{order.placeNameSnapshot}</div>
        {order.title && <div className="text-ink-300">{order.title}</div>}
        <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-400">
          <span>{t('home.peopleOrdered', { n: people })}</span>
          <span>
            {items.length} {t('order.itemsN')}
          </span>
          {sum > 0 && <span>{money(sum)}</span>}
          {deadline && (
            <span className={passed ? 'text-red-400' : ''}>{dateTimeStr(order.deadline)}</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`/order/${order.id}`}>
          <Button variant="primary">{t('home.addMine')}</Button>
        </Link>
        <Link to={`/order/${order.id}/summary`}>
          <Button size="sm">{t('order.summary')}</Button>
        </Link>
      </div>
    </Card>
  )
}

function NewOrder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const { user, member } = useAuth()
  const nav = useNavigate()
  const { data: places } = useColl<Place>(() => placesQuery(false), [])
  const [placeId, setPlaceId] = useState('')
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const place = places.find((p) => p.id === placeId)
    if (!user || !place) return
    setBusy(true)
    try {
      const id = await createOrder(
        user.uid,
        member?.displayName ?? '',
        { id: place.id, name: place.name, deliveryFee: place.deliveryFee ?? null },
        { title: title.trim(), deadline: deadline ? new Date(deadline) : null },
      )
      onClose()
      nav(`/order/${id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('order.new')}>
      <div className="flex flex-col gap-3">
        {places.length === 0 ? (
          <Empty>
            {t('places.empty')}{' '}
            <Link to="/places" className="underline" onClick={onClose}>
              {t('places.new')}
            </Link>
          </Empty>
        ) : (
          <>
            <Field label={t('order.pickPlace')}>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-ink-800">
                {places.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlaceId(p.id)}
                    className={`block w-full border-b border-ink-800 p-3 text-start last:border-0 ${
                      placeId === p.id ? 'bg-accent/15 font-medium' : 'hover:bg-ink-800'
                    }`}
                  >
                    {p.name}
                    {p.nameNote && <span className="text-sm text-ink-500"> · {p.nameNote}</span>}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('common.name')}>
              <Input
                placeholder={t('order.titlePh')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label={t('common.deadline')}>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </Field>
            <Button variant="primary" size="lg" onClick={submit} disabled={busy || !placeId}>
              {t('common.create')}
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
