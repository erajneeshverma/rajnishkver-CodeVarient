import { statuses } from '../config'
import type { Project, StatusId } from '../types'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

/** YYYY-MM-DD in the viewer's own time zone (what a date input shows). */
export function localDate(from: Date | string = new Date()): string {
  const d = typeof from === 'string' ? new Date(from) : from
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const todayISO = () => localDate()

/**
 * A date input's YYYY-MM-DD as an ISO timestamp at local noon, never later than now,
 * so a project "started today" always sorts before the moment it was buried.
 */
export function dateInputToISO(day: string, now = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day
  const noon = new Date(day + 'T12:00:00')
  return new Date(Math.min(noon.getTime(), now.getTime() - 1000)).toISOString()
}

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
