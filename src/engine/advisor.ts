/**
 * The Revival Advisor. A pure, rule-based scorer: it reads a project, turns it
 * into a handful of signals, and runs the rules from config over them. Every
 * point a path gains or loses comes with the sentence that explains it.
 */
import type { AppConfig, Condition, Signal } from '../config'
import type { PathId, Project } from '../types'

export type Signals = Record<Signal, number | string>

export interface Reason {
  text: string
  weight: number
}

export interface PathAdvice {
  path: PathId
  score: number
  /** 0–100, score on a scale shared by every path, so it always agrees with the ranking */
  confidence: number
  pros: Reason[]
  cons: Reason[]
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44

export function monthsBetween(from: string, to: Date): number {
  return Math.max(0, (to.getTime() - new Date(from).getTime()) / MS_PER_MONTH)
}

export function getSignals(project: Project, now = new Date()): Signals {
  return {
    completion: project.completion,
    cause: project.cause,
    monthsIdle: Math.round(monthsBetween(project.lastTouchedAt, now) * 10) / 10,
    interest: project.assessment.interest,
    relevance: project.assessment.relevance,
    salvageCount: project.salvage.length,
  }
}

function matches(c: Condition, signals: Signals): boolean {
  const actual = signals[c.signal]
  switch (c.op) {
    case '>=':
      return Number(actual) >= c.value
    case '<=':
      return Number(actual) <= c.value
    case '>':
      return Number(actual) > c.value
    case '<':
      return Number(actual) < c.value
    case 'is':
      return actual === c.value
    case 'not':
      return actual !== c.value
    case 'in':
      return c.value.includes(String(actual))
  }
}

export function formatDuration(months: number): string {
  if (months < 0.5) {
    const weeks = Math.max(1, Math.round(months * 4.35))
    return weeks === 1 ? '1 week' : `${weeks} weeks`
  }
  if (months < 18) {
    const m = Math.round(months)
    return m === 1 ? '1 month' : `${m} months`
  }
  const y = Math.round((months / 12) * 2) / 2
  return y === 1 ? '1 year' : `${y} years`
}

function fill(template: string, signals: Signals, config: AppConfig): string {
  const salvage = Number(signals.salvageCount)
  const cause = config.causes.find((c) => c.id === signals.cause)
  return template
    .replaceAll('{completion}', String(signals.completion))
    .replaceAll('{interest}', String(signals.interest))
    .replaceAll('{months}', formatDuration(Number(signals.monthsIdle)))
    .replaceAll('{salvage}', `${salvage} salvageable part${salvage === 1 ? '' : 's'}`)
    .replaceAll('{cause}', cause?.label ?? 'Something')
}

export function advise(project: Project, config: AppConfig, now = new Date()): PathAdvice[] {
  const signals = getSignals(project, now)

  // The best score any path could reach. Using one scale for all paths keeps
  // the fit percentages in the same order as the ranking.
  const maxScore = Math.max(
    1,
    ...config.paths.map((p) => config.rules.filter((r) => r.path === p.id).reduce((sum, r) => sum + Math.max(0, r.weight), 0)),
  )

  const results = config.paths.map((p): PathAdvice => {
    const pathRules = config.rules.filter((r) => r.path === p.id)
    const pros: Reason[] = []
    const cons: Reason[] = []
    let score = 0

    for (const rule of pathRules) {
      if (!rule.when.every((c) => matches(c, signals))) continue
      score += rule.weight
      const reason = { text: fill(rule.why, signals, config), weight: rule.weight }
      ;(rule.weight >= 0 ? pros : cons).push(reason)
    }

    pros.sort((a, b) => b.weight - a.weight)
    cons.sort((a, b) => a.weight - b.weight)
    const confidence = Math.min(100, Math.round((Math.max(0, score) / maxScore) * 100))
    return { path: p.id, score, confidence, pros, cons }
  })

  // Highest score first; ties go to the path listed first in config.
  const order = config.paths.map((p) => p.id)
  return results.sort((a, b) => b.score - a.score || order.indexOf(a.path) - order.indexOf(b.path))
}
