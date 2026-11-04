import type { Timestamp } from 'firebase/firestore'

export function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  const rounded = Math.round(n * 100) / 100
  return `${rounded % 1 === 0 ? rounded : rounded.toFixed(2)} ₪`
}

export function toDate(ts: Timestamp | Date | null | undefined): Date | null {
  if (!ts) return null
  if (ts instanceof Date) return ts
  if (typeof (ts as Timestamp).toDate === 'function') return (ts as Timestamp).toDate()
  return null
}

export function dateStr(ts: Timestamp | Date | null | undefined): string {
  const d = toDate(ts)
  if (!d) return ''
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function timeStr(ts: Timestamp | Date | null | undefined): string {
  const d = toDate(ts)
  if (!d) return ''
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

export function dateTimeStr(ts: Timestamp | Date | null | undefined): string {
  const d = toDate(ts)
  if (!d) return ''
  return `${dateStr(d)} ${timeStr(d)}`
}

/** value for <input type="datetime-local"> */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
