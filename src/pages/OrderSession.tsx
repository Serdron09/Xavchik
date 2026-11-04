import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { useColl, useDocLive } from '../data/hooks'
import {
  addOrderItem,
  deleteOrder,
  deleteOrderItem,
  menuQuery,
  orderItemsQuery,
  orderRef,
  setOrderStatus,
  updateOrder,
  updateOrderItem,
} from '../data/api'
import type { MenuItem, Order, OrderItem } from '../lib/types'
import { dateTimeStr, money, toDate, toLocalInput } from '../lib/format'
import { Button, Card, Empty, Field, Input, Modal, Spinner, Textarea } from '../components/ui'
import { AddOrderItem } from '../components/AddOrderItem'
import { Timestamp } from 'firebase/firestore'

export function OrderSession() {
  const { orderId = '' } = useParams()
  const { t } = useI18n()
  const { user, member, isAdmin } = useAuth()
  const nav = useNavigate()

  const { data: order, loading } = useDocLive<Order>(() => orderRef(orderId), [orderId])
  const { data: items } = useColl<OrderItem>(() => orderItemsQuery(orderId), [orderId])
  const { data: menu } = useColl<MenuItem>(
    () => (order ? menuQuery(order.placeId) : null),
    [order?.placeId],
  )

  const [adding, setAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const [settings, setSettings] = useState(false)

  const mine = useMemo(() => items.filter((i) => i.userId === user?.uid), [items, user?.uid])
  const byUser = useMemo(() => {
    const map = new Map<string, OrderItem[]>()
    for (const i of items) {
      if (!map.has(i.userId)) map.set(i.userId, [])
      map.get(i.userId)!.push(i)
    }
    return [...map.entries()]
  }, [items])

  const sum = items.reduce((s, i) => s + (i.priceEstimate ?? 0), 0)

  if (loading) return <Spinner />
  if (!order) return <Empty>{t('common.empty')}</Empty>

  const isOpen = order.status === 'open'
  const canManage = isAdmin || order.createdBy === user?.uid
  const deadline = toDate(order.deadline)
  const passed = !!deadline && deadline.getTime() < Date.now()

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-ink-400">{t('order.title')}</div>
            <h1 className="truncate text-2xl font-bold">{order.placeNameSnapshot}</h1>
            {order.title && <div className="text-ink-300">{order.title}</div>}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-400">
              <span>
                {t('order.responsible')}: {order.createdByName || '—'}
              </span>
              {deadline && (
                <span className={passed ? 'text-red-400' : ''}>
                  {t('common.deadline')}: {dateTimeStr(order.deadline)}
                  {passed && ` · ${t('order.deadlinePassed')}`}
                </span>
              )}
              <span>
                {t('order.participants')}: {byUser.length}
              </span>
              <span>
                {items.length} {t('order.itemsN')}
              </span>
              {sum > 0 && (
                <span>
                  {t('order.sum')}: {money(sum)}
                </span>
              )}
            </div>
            {order.notes && <p className="mt-2 text-sm text-ink-300">{order.notes}</p>}
            {!isOpen && <p className="mt-2 text-sm text-amber-400">{t('order.lockedNote')}</p>}
          </div>
          <Link to={`/places/${order.placeId}`} className="shrink-0 text-sm text-ink-400 underline">
            {t('menu.title')}
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to={`/order/${orderId}/summary`}>
            <Button variant="primary">{t('order.summary')}</Button>
          </Link>
          {canManage && (
            <>
              <Button size="sm" onClick={() => setOrderStatus(orderId, isOpen ? 'locked' : 'open')}>
                {isOpen ? t('order.lock') : t('order.unlock')}
              </Button>
              <Button size="sm" onClick={() => setSettings(true)}>
                {t('common.edit')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (!confirm(t('order.deleteConfirm'))) return
                  await deleteOrder(orderId)
                  nav('/')
                }}
              >
                {t('common.delete')}
              </Button>
            </>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{t('order.myItems')}</h2>
        <Button variant="primary" size="sm" disabled={!isOpen} onClick={() => setAdding(true)}>
          + {t('order.addItem')}
        </Button>
      </div>

      {!isOpen && <p className="text-sm text-ink-500">{t('order.closedForYou')}</p>}

      {mine.length === 0 ? (
        <Empty>{t('order.myEmpty')}</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {mine.map((item) => (
            <Card key={item.id} className="flex items-start justify-between gap-3 py-3">
              <ItemBody item={item} />
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-sm text-ink-300">{money(item.priceEstimate)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!isOpen}
                  onClick={() => setEditingItem(item)}
                >
                  ✎
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!isOpen}
                  onClick={() => deleteOrderItem(orderId, item.id)}
                >
                  ✕
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mt-2 text-xl font-semibold">{t('order.everyone')}</h2>
      {items.length === 0 ? (
        <Empty>{t('order.nobodyYet')}</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {byUser.map(([uid, list]) => (
            <Card key={uid}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">
                  {list[0].userNameSnapshot}
                  {uid === user?.uid && <span className="ms-2 text-xs text-ink-500">({t('common.you')})</span>}
                </span>
                <span className="text-sm text-ink-400">
                  {money(list.reduce((s, i) => s + (i.priceEstimate ?? 0), 0))}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {list.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3">
                    <ItemBody item={item} />
                    {canManage && uid !== user?.uid && isOpen && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteOrderItem(orderId, item.id)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddOrderItem
        open={adding || !!editingItem}
        menu={menu}
        userId={user?.uid ?? ''}
        userName={member?.displayName ?? ''}
        editing={editingItem}
        onClose={() => {
          setAdding(false)
          setEditingItem(null)
        }}
        onSubmit={async (draft) => {
          if (editingItem) await updateOrderItem(orderId, editingItem.id, draft)
          else await addOrderItem(orderId, draft)
        }}
      />

      <OrderSettings
        open={settings}
        order={order}
        onClose={() => setSettings(false)}
        onSave={(patch) => updateOrder(orderId, patch)}
      />
    </div>
  )
}

function ItemBody({ item }: { item: OrderItem }) {
  return (
    <div className="min-w-0">
      <div className="font-medium">
        {item.qty > 1 && <span className="text-accent">{item.qty}× </span>}
        {item.nameSnapshot}
      </div>
      {item.selectedOptions?.length > 0 && (
        <div className="text-sm text-ink-400">
          {item.selectedOptions.map((o) => o.choiceLabels.join(', ')).join(' · ')}
        </div>
      )}
      {item.specialRequest && (
        <div className="text-sm text-amber-300/80">{item.specialRequest}</div>
      )}
    </div>
  )
}

function OrderSettings({
  open,
  order,
  onClose,
  onSave,
}: {
  open: boolean
  order: Order
  onClose: () => void
  onSave: (patch: Partial<Order>) => Promise<void>
}) {
  const { t } = useI18n()
  const d = toDate(order.deadline)
  const [title, setTitle] = useState(order.title ?? '')
  const [notes, setNotes] = useState(order.notes ?? '')
  const [deadline, setDeadline] = useState(d ? toLocalInput(d) : '')
  const [fee, setFee] = useState<number | ''>(order.deliveryFee ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await onSave({
        title: title.trim(),
        notes: notes.trim(),
        deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
        deliveryFee: fee === '' ? null : Number(fee),
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
        <Field label={t('places.delivery')}>
          <Input
            type="number"
            inputMode="decimal"
            value={fee}
            onChange={(e) => setFee(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </Field>
        <Field label={t('common.notes')}>
          <Textarea
            rows={2}
            placeholder={t('order.notesPh')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          <Button variant="primary" onClick={save} disabled={busy}>
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
