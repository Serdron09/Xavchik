import type { Order, OrderItem } from './types'
import { dateStr, money } from './format'

export interface PersonGroup {
  userId: string
  name: string
  items: OrderItem[]
  sum: number
  hasUnpriced: boolean
}

export interface DishGroup {
  key: string
  name: string
  optionText: string
  qty: number
  sum: number
  hasUnpriced: boolean
  notes: { who: string; text: string }[]
}

export function optionText(item: OrderItem): string {
  return (item.selectedOptions ?? [])
    .map((o) => o.choiceLabels.join(', '))
    .filter(Boolean)
    .join(' · ')
}

export function groupByPerson(items: OrderItem[]): PersonGroup[] {
  const map = new Map<string, PersonGroup>()
  for (const i of items) {
    let g = map.get(i.userId)
    if (!g) {
      g = { userId: i.userId, name: i.userNameSnapshot, items: [], sum: 0, hasUnpriced: false }
      map.set(i.userId, g)
    }
    g.items.push(i)
    if (i.priceEstimate == null) g.hasUnpriced = true
    else g.sum += i.priceEstimate
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function groupByDish(items: OrderItem[]): DishGroup[] {
  const map = new Map<string, DishGroup>()
  for (const i of items) {
    const opts = optionText(i)
    const key = `${i.nameSnapshot}|${opts}`
    let g = map.get(key)
    if (!g) {
      g = {
        key,
        name: i.nameSnapshot,
        optionText: opts,
        qty: 0,
        sum: 0,
        hasUnpriced: false,
        notes: [],
      }
      map.set(key, g)
    }
    g.qty += i.qty
    if (i.priceEstimate == null) g.hasUnpriced = true
    else g.sum += i.priceEstimate
    if (i.specialRequest) g.notes.push({ who: i.userNameSnapshot, text: i.specialRequest })
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
}

export function totals(order: Order, items: OrderItem[]) {
  const sum = items.reduce((s, i) => s + (i.priceEstimate ?? 0), 0)
  const fee = order.deliveryFee ?? 0
  return {
    items: items.reduce((s, i) => s + i.qty, 0),
    people: new Set(items.map((i) => i.userId)).size,
    sum,
    fee,
    grand: sum + fee,
    hasUnpriced: items.some((i) => i.priceEstimate == null),
  }
}

/** Plain-text version — what goes to WhatsApp / clipboard. */
export function buildText(
  order: Order,
  items: OrderItem[],
  mode: 'person' | 'dish',
  labels: { deliveryFee: string; grandTotal: string; items: string; people: string; responsible: string },
): string {
  const lines: string[] = []
  lines.push(`*${order.placeNameSnapshot}*${order.title ? ` — ${order.title}` : ''}`)
  lines.push(dateStr(order.createdAt))
  if (order.createdByName) lines.push(`${labels.responsible}: ${order.createdByName}`)
  lines.push('')

  if (mode === 'person') {
    for (const g of groupByPerson(items)) {
      lines.push(`*${g.name}*`)
      for (const i of g.items) {
        const parts = [`${i.qty > 1 ? `${i.qty}× ` : ''}${i.nameSnapshot}`]
        const opts = optionText(i)
        if (opts) parts.push(`(${opts})`)
        if (i.specialRequest) parts.push(`— ${i.specialRequest}`)
        if (i.priceEstimate != null) parts.push(`· ${money(i.priceEstimate)}`)
        lines.push(`  • ${parts.join(' ')}`)
      }
      lines.push('')
    }
  } else {
    for (const g of groupByDish(items)) {
      const head = `${g.qty}× ${g.name}${g.optionText ? ` (${g.optionText})` : ''}`
      lines.push(`• ${head}${g.sum ? ` · ${money(g.sum)}` : ''}`)
      for (const n of g.notes) lines.push(`    — ${n.who}: ${n.text}`)
    }
    lines.push('')
  }

  const tot = totals(order, items)
  lines.push(`${labels.items}: ${tot.items} · ${labels.people}: ${tot.people}`)
  if (tot.fee) lines.push(`${labels.deliveryFee}: ${money(tot.fee)}`)
  lines.push(`${labels.grandTotal} ${money(tot.grand)}${tot.hasUnpriced ? ' +' : ''}`)
  return lines.join('\n')
}

export function buildCsv(items: OrderItem[]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  const rows = [['name', 'dish', 'options', 'special', 'qty', 'price'].join(',')]
  for (const i of items) {
    rows.push(
      [
        esc(i.userNameSnapshot),
        esc(i.nameSnapshot),
        esc(optionText(i)),
        esc(i.specialRequest),
        esc(i.qty),
        esc(i.priceEstimate ?? ''),
      ].join(','),
    )
  }
  return rows.join('\n')
}
