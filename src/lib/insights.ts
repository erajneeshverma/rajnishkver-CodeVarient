/**
 * Graveyard-wide patterns: what kills your projects, how far they get, and what
 * you end up doing with them. Pure functions over the project list.
 */
import { causes, paths } from '../config'
import { monthsBetween } from '../engine/advisor'
import type { Project } from '../types'

export interface Bar {
  id: string
  label: string
  emoji?: string
  value: number
  /** Extra line for the tooltip */
  detail?: string
}

export interface Insights {
  total: number
  revived: number
  archived: number
  undecided: number
  /** Revived / decided, 0–100. null when nothing is decided yet. */
  revivalRate: number | null
  avgCompletion: number
  avgMonthsIdle: number
  salvageCount: number
  /** Share of decisions that followed the advisor's top pick, 0–100 */
  advisorAgreement: number | null
  byCause: Bar[]
  byPath: Bar[]
  byCompletion: Bar[]
  byStack: Bar[]
  epitaphs: { project: Project; text: string }[]
  headlines: string[]
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)
const caps = (s: string) => s.replace(/[^A-Z]/g, '').length
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export const completionBuckets = [
  { id: '0-25', label: '0–25%', min: 0, max: 25 },
  { id: '26-50', label: '26–50%', min: 26, max: 50 },
  { id: '51-75', label: '51–75%', min: 51, max: 75 },
  { id: '76-100', label: '76–100%', min: 76, max: 100 },
]

export function computeInsights(projects: Project[], now = new Date()): Insights {
  const total = projects.length
  const decided = projects.filter((p) => p.decision)
  const revived = projects.filter((p) => p.status === 'revived').length
  const archived = projects.filter((p) => p.status === 'rip').length

  const byCause: Bar[] = causes
    .map((c) => {
      const ps = projects.filter((p) => p.cause === c.id)
      return {
        id: c.id,
        label: c.label,
        emoji: c.emoji,
        value: ps.length,
        detail: ps.length ? `Avg ${Math.round(avg(ps.map((p) => p.completion)))}% complete when it stopped` : undefined,
      }
    })
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value)

  const byPath: Bar[] = paths
    .map((p) => {
      const ds = decided.filter((x) => x.decision!.path === p.id)
      const followed = ds.filter((x) => x.decision!.suggested === p.id).length
      return {
        id: p.id,
        label: p.label,
        emoji: p.emoji,
        value: ds.length,
        detail: ds.length ? `${followed} of ${ds.length} matched the advisor` : undefined,
      }
    })
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value)

  const byCompletion: Bar[] = completionBuckets.map((b) => {
    const ps = projects.filter((p) => p.completion >= b.min && p.completion <= b.max)
    return { id: b.id, label: b.label, value: ps.length, detail: ps.map((p) => p.name).join(', ') || undefined }
  })

  // Count each stack once per project, ignoring case; show the most common spelling.
  const stacks = new Map<string, { n: number; spellings: Map<string, number> }>()
  for (const p of projects) {
    const seen = new Set<string>()
    for (const raw of p.stack) {
      const name = raw.trim()
      const key = name.toLowerCase()
      if (!name || seen.has(key)) continue
      seen.add(key)
      const entry = stacks.get(key) ?? { n: 0, spellings: new Map() }
      entry.n++
      entry.spellings.set(name, (entry.spellings.get(name) ?? 0) + 1)
      stacks.set(key, entry)
    }
  }
  const byStack: Bar[] = [...stacks.entries()]
    .map(([key, { n, spellings }]) => ({ id: key, label: [...spellings.entries()].sort((a, b) => b[1] - a[1] || caps(a[0]) - caps(b[0]))[0][0], value: n }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 6)

  const agreed = decided.filter((p) => p.decision!.path === p.decision!.suggested).length

  const insights: Insights = {
    total,
    revived,
    archived,
    undecided: total - decided.length,
    revivalRate: decided.length ? pct(revived, decided.length) : null,
    avgCompletion: Math.round(avg(projects.map((p) => p.completion))),
    avgMonthsIdle: Math.round(avg(projects.map((p) => monthsBetween(p.lastTouchedAt, now))) * 10) / 10,
    salvageCount: projects.reduce((n, p) => n + p.salvage.length, 0),
    advisorAgreement: decided.length ? pct(agreed, decided.length) : null,
    byCause,
    byPath,
    byCompletion,
    byStack,
    epitaphs: projects.filter((p) => p.decision?.epitaph).map((p) => ({ project: p, text: p.decision!.epitaph! })),
    headlines: [],
  }
  insights.headlines = headlines(projects, insights)
  return insights
}

/** Plain-language findings, most useful first. */
function headlines(projects: Project[], i: Insights): string[] {
  const out: string[] = []
  if (!projects.length) return out

  const top = i.byCause[0]
  if (top) {
    const tied = i.byCause.filter((b) => b.value === top.value)
    if (tied.length === 1) out.push(`${top.label} is your #1 project killer, behind ${pct(top.value, i.total)}% of your graveyard.`)
    else if (tied.length === 2) out.push(`${tied[0].label} and ${tied[1].label.toLowerCase()} are tied as your top causes of death.`)
    else out.push(`No single cause dominates: ${tied.length} causes are tied at ${plural(top.value, 'project')} each.`)
  }

  const nearlyDone = projects.filter((p) => p.completion >= 60 && p.status === 'resting')
  if (nearlyDone.length)
    out.push(
      `${plural(nearlyDone.length, 'resting project')} ${nearlyDone.length === 1 ? 'is' : 'are'} already 60%+ done: ${nearlyDone
        .map((p) => p.name)
        .join(', ')}. ${nearlyDone.length === 1 ? 'It’s your cheapest revival' : 'They’re your cheapest revivals'}.`,
    )

  const timeDeaths = projects.filter((p) => p.cause === 'time')
  const others = projects.filter((p) => p.cause !== 'time')
  if (timeDeaths.length && others.length) {
    const a = Math.round(avg(timeDeaths.map((p) => p.completion)))
    const b = Math.round(avg(others.map((p) => p.completion)))
    if (a > b) out.push(`Projects that ran out of time got further (${a}% on average) than the rest (${b}%). The idea wasn’t the problem.`)
  }

  const scopeLike = projects.filter((p) => p.cause === 'scope' || p.cause === 'debt').length
  if (scopeLike >= 2) out.push(`${plural(scopeLike, 'project')} died of scope creep or tech debt. Try writing the one-sentence MVP before starting the next one.`)

  if (i.advisorAgreement !== null)
    out.push(
      i.advisorAgreement === 100
        ? 'You’ve followed the advisor on every decision so far.'
        : `You followed the advisor on ${i.advisorAgreement}% of decisions and overrode it on the rest.`,
    )

  if (i.undecided > 0) out.push(`${plural(i.undecided, 'project')} still ${i.undecided === 1 ? 'needs' : 'need'} a decision.`)
  return out.slice(0, 4)
}
