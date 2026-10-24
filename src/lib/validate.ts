/**
 * Turns untrusted JSON (an import file, or old saved data) into well-formed projects.
 * Anything missing gets a safe default; anything unusable is dropped, so a bad file
 * can never leave the app unable to render.
 */
import { causes, paths, salvageKinds } from '../config'
import type { EventType, PathId, Project, Relevance, SalvageKind, StoredStatus } from '../types'
import { uid } from './util'

const eventTypes: EventType[] = ['started', 'milestone', 'abandoned', 'buried', 'imported', 'assessed', 'revisited', 'decided', 'revived', 'archived', 'note']
const statuses: StoredStatus[] = ['resting', 'revived', 'rip']
const relevances: Relevance[] = ['yes', 'partly', 'no']

type Raw = Record<string, unknown>
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const date = (v: unknown, fallback: string) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : fallback)
const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)

export function normalizeProject(raw: unknown): Project | null {
  if (!isObj(raw)) return null
  const name = str(raw.name).trim()
  if (!name) return null
  const now = new Date().toISOString()
  const startedAt = date(raw.startedAt, now)
  const lastTouchedAt = date(raw.lastTouchedAt, startedAt)
  const a = isObj(raw.assessment) ? raw.assessment : {}
  const pathIds = paths.map((p) => p.id)
  const d = isObj(raw.decision) ? raw.decision : null
  const decisionPath = d && oneOf<PathId | ''>(d.path, pathIds, '')

  return {
    id: str(raw.id) || uid(),
    name,
    description: str(raw.description),
    goal: str(raw.goal),
    done: str(raw.done),
    unfinished: str(raw.unfinished),
    completion: clamp(raw.completion, 0, 100, 0),
    stack: Array.isArray(raw.stack) ? raw.stack.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : [],
    repoUrl: str(raw.repoUrl) || undefined,
    startedAt,
    lastTouchedAt,
    buriedAt: date(raw.buriedAt, now),
    cause: oneOf(raw.cause, causes.map((c) => c.id), 'other'),
    causeNote: str(raw.causeNote),
    assessment: {
      interest: clamp(a.interest, 1, 5, 3),
      relevance: oneOf(a.relevance, relevances, 'partly'),
      assessedAt: date(a.assessedAt, now),
    },
    salvage: Array.isArray(raw.salvage)
      ? raw.salvage.filter(isObj).flatMap((s) =>
          str(s.title).trim()
            ? [{ id: str(s.id) || uid(), kind: oneOf<SalvageKind>(s.kind, salvageKinds.map((k) => k.id), 'other'), title: str(s.title).trim(), note: str(s.note) || undefined }]
            : [],
        )
      : [],
    status: oneOf(raw.status, statuses, 'resting'),
    decision:
      d && decisionPath
        ? {
            path: decisionPath,
            suggested: oneOf<PathId>(d.suggested, pathIds, decisionPath),
            decidedAt: date(d.decidedAt, now),
            nextSteps: Array.isArray(d.nextSteps) ? d.nextSteps.filter((x): x is string => typeof x === 'string') : [],
            epitaph: str(d.epitaph) || undefined,
          }
        : undefined,
    hauntAt: typeof raw.hauntAt === 'string' && !Number.isNaN(Date.parse(raw.hauntAt)) ? raw.hauntAt : undefined,
    events: Array.isArray(raw.events)
      ? raw.events.filter(isObj).map((e) => ({ id: str(e.id) || uid(), type: oneOf(e.type, eventTypes, 'note'), at: date(e.at, now), text: str(e.text) }))
      : [],
  }
}

/** Parses an export file. Throws with a readable message if it isn't one. */
export function parseExport(json: string): Project[] {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('That file isn’t valid JSON.')
  }
  const list = isObj(data) && Array.isArray(data.projects) ? data.projects : Array.isArray(data) ? data : null
  if (!list) throw new Error('That file doesn’t look like a graveyard export.')
  const projects = list.map(normalizeProject).filter((p): p is Project => p !== null)
  if (list.length && !projects.length) throw new Error('None of the projects in that file could be read.')
  // Duplicate ids would make two tombstones share one page.
  const seen = new Set<string>()
  return projects.map((p) => (seen.has(p.id) ? { ...p, id: uid() } : (seen.add(p.id), p)))
}
