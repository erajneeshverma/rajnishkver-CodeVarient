import { statuses } from '../config'
import type { Project, StatusId } from '../types'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const todayISO = () => new Date().toISOString().slice(0, 10)

export function addDays(days: number, from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function relativeTime(iso: string, now = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime()
  const days = Math.round(diff / 86_400_000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (Math.abs(days) < 30) return rtf.format(days, 'day')
  const months = Math.round(days / 30.44)
  if (Math.abs(months) < 18) return rtf.format(months, 'month')
  return rtf.format(Math.round(days / 365), 'year')
}

/** "Haunting" is not stored: it is a resting project whose reminder is due. */
export function effectiveStatus(p: Project, now = new Date()): StatusId {
  if (p.status === 'resting' && p.hauntAt && new Date(p.hauntAt) <= now) return 'haunting'
  return p.status
}

export const statusConfig = (id: StatusId) => statuses.find((s) => s.id === id)!

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
