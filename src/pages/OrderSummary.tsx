import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useColl, useDocLive } from '../data/hooks'
import { orderItemsQuery, orderRef } from '../data/api'
import type { Order, OrderItem } from '../lib/types'
import { dateStr, money } from '../lib/format'
import { buildCsv, buildText, groupByDish, groupByPerson, optionText, totals } from '../lib/summary'
import { Button, Empty, Spinner } from '../components/ui'

export function OrderSummary() {
  const { orderId = '' } = useParams()
  const { t } = useI18n()
  const nav = useNavigate()
  const [mode, setMode] = useState<'person' | 'dish'>('person')
  const [copied, setCopied] = useState(false)

  const { data: order, loading } = useDocLive<Order>(() => orderRef(orderId), [orderId])
  const { data: items } = useColl<OrderItem>(() => orderItemsQuery(orderId), [orderId])

  const labels = useMemo(
    () => ({
      deliveryFee: t('summary.deliveryFee'),
      grandTotal: t('summary.grandTotal'),
      items: t('summary.totalItems'),
      people: t('summary.totalPeople'),
      responsible: t('order.responsible'),
    }),
    [t],
  )

  if (loading) return <Spinner />
  if (!order) return <Empty>{t('common.empty')}</Empty>

  const tot = totals(order, items)
  const text = buildText(order, items, mode, labels)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — the text is on screen anyway */
    }
  }

  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noreferrer')
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: order!.placeNameSnapshot, text })
      } catch {
        /* user dismissed the sheet */
      }
    } else {
      void copy()
    }
  }

  function csv() {
    const blob = new Blob(['﻿' + buildCsv(items)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${order!.placeNameSnapshot}-${dateStr(order!.createdAt).replaceAll('.', '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <div className="no-print mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav(`/order/${orderId}`)}>
            ← {t('common.back')}
          </Button>
          <div className="flex overflow-hidden rounded-xl border border-ink-700 text-sm">
            {(['person', 'dish'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 ${mode === m ? 'bg-accent font-semibold text-ink-950' : 'text-ink-300'}`}
              >
                {m === 'person' ? t('summary.byPerson') : t('summary.byDish')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            {t('summary.print')}
          </Button>
          <Button size="sm" onClick={whatsapp}>
            {t('summary.whatsapp')}
          </Button>
          <Button size="sm" onClick={copy}>
            {copied ? t('common.copied') : t('summary.copy')}
          </Button>
          <Button size="sm" onClick={share}>
            {t('summary.share')}
          </Button>
          <Button size="sm" onClick={csv}>
            {t('summary.csv')}
          </Button>
        </div>
        <p className="text-xs text-ink-500">{t('summary.printHint')}</p>
      </div>

      <div className="print-sheet rounded-2xl border border-ink-800 bg-ink-900 p-5">
        <div className="flex items-baseline justify-between gap-3 border-b border-ink-700 pb-2">
          <h1 className="text-2xl font-bold">
            {order.placeNameSnapshot}
            {order.title && <span className="text-base font-normal text-ink-400"> — {order.title}</span>}
          </h1>
          <span className="shrink-0 text-sm text-ink-400">{dateStr(order.createdAt)}</span>
        </div>

        {order.createdByName && (
          <p className="pt-2 text-sm text-ink-400">
            {t('order.responsible')}: {order.createdByName}
          </p>
        )}
        {order.notes && <p className="text-sm text-ink-400">{order.notes}</p>}

        {items.length === 0 ? (
          <p className="py-8 text-center text-ink-400">{t('summary.empty')}</p>
        ) : mode === 'person' ? (
          <div className="mt-3 flex flex-col gap-3">
            {groupByPerson(items).map((g) => (
              <div key={g.userId} className="print-row border-b border-ink-800 pb-2 last:border-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{g.name}</span>
                  <span className="text-sm text-ink-400">
                    {money(g.sum)}
                    {g.hasUnpriced && ' +'}
                  </span>
                </div>
                <ul className="mt-1 flex flex-col gap-1">
                  {g.items.map((i) => (
                    <li key={i.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span>
                        {i.qty > 1 && <span className="font-medium">{i.qty}× </span>}
                        {i.nameSnapshot}
                        {optionText(i) && <span className="text-ink-400"> · {optionText(i)}</span>}
                        {i.specialRequest && (
                          <span className="text-amber-300/90"> — {i.specialRequest}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-ink-400">
                        {i.priceEstimate == null ? '—' : money(i.priceEstimate)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {groupByDish(items).map((g) => (
              <div key={g.key} className="print-row border-b border-ink-800 pb-2 last:border-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className="font-semibold">{g.qty}× </span>
                    {g.name}
                    {g.optionText && <span className="text-ink-400"> · {g.optionText}</span>}
                  </span>
                  <span className="shrink-0 text-sm text-ink-400">
                    {g.sum ? money(g.sum) : '—'}
                    {g.hasUnpriced && ' +'}
                  </span>
                </div>
                {g.notes.length > 0 && (
                  <ul className="mt-1 text-sm text-amber-300/90">
                    {g.notes.map((n, idx) => (
                      <li key={idx}>
                        — {n.who}: {n.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-3 border-t border-ink-700 pt-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-400">
                {t('summary.totalItems')}: {tot.items} · {t('summary.totalPeople')}: {tot.people}
              </span>
            </div>
            {tot.fee > 0 && (
              <div className="flex justify-between text-ink-400">
                <span>{t('summary.deliveryFee')}</span>
                <span>{money(tot.fee)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between text-base font-semibold">
              <span>{t('summary.grandTotal')}</span>
              <span>
                {money(tot.grand)}
                {tot.hasUnpriced && ' +'}
              </span>
            </div>
            {tot.hasUnpriced && (
              <p className="mt-1 text-xs text-ink-500">+ = {t('summary.noPrice')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
