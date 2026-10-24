import { describe, expect, it } from 'vitest'
import { appConfig } from '../config'
import type { Project } from '../types'
import { advise, formatDuration } from './advisor'

const NOW = new Date('2026-10-24T12:00:00Z')
const monthsAgo = (m: number) => new Date(NOW.getTime() - m * 30.44 * 86_400_000).toISOString()

function project(over: Partial<Project> & { interest?: number; relevance?: Project['assessment']['relevance'] } = {}): Project {
  const { interest = 3, relevance = 'yes', ...rest } = over
  return {
    id: 'p',
    name: 'Test',
    description: '',
    goal: '',
    done: '',
    unfinished: '',
    completion: 50,
    stack: [],
    startedAt: monthsAgo(12),
    lastTouchedAt: monthsAgo(3),
    buriedAt: monthsAgo(1),
    cause: 'time',
    causeNote: '',
    assessment: { interest, relevance, assessedAt: '' },
    salvage: [],
    status: 'resting',
    events: [],
    ...rest,
  }
}

const top = (p: Project) => advise(p, appConfig, NOW)[0].path

describe('Revival Advisor', () => {
  it('suggests Continue when mostly done, stopped for time, interest high', () => {
    expect(top(project({ completion: 75, cause: 'time', interest: 5 }))).toBe('continue')
  })

  it('suggests Restart when scope creep killed a still-relevant idea', () => {
    expect(top(project({ completion: 35, cause: 'scope', interest: 4, lastTouchedAt: monthsAgo(14) }))).toBe('restart')
  })

  it('suggests Change the idea when interest is high but the idea is no longer relevant', () => {
    expect(top(project({ cause: 'users', interest: 5, relevance: 'no' }))).toBe('change')
  })

  it('suggests Repurpose when interest is low but parts are reusable', () => {
    const salvage = [{ id: 's', kind: 'component' as const, title: 'Auth' }]
    expect(top(project({ cause: 'interest', interest: 2, relevance: 'partly', salvage }))).toBe('repurpose')
  })

  it('suggests Archive when interest is low and the idea is irrelevant', () => {
    expect(top(project({ completion: 20, cause: 'blocker', interest: 1, relevance: 'no', lastTouchedAt: monthsAgo(30) }))).toBe('archive')
  })

  it('explains every point with a reason', () => {
    for (const a of advise(project({ completion: 75, interest: 5 }), appConfig, NOW)) {
      expect(a.pros.reduce((s, r) => s + r.weight, 0) + a.cons.reduce((s, r) => s + r.weight, 0)).toBe(a.score)
      for (const r of [...a.pros, ...a.cons]) expect(r.text).not.toMatch(/\{\w+\}/)
    }
  })

  it('ranks all five paths', () => {
    expect(advise(project(), appConfig, NOW).map((a) => a.path).sort()).toEqual(['archive', 'change', 'continue', 'repurpose', 'restart'])
  })

  it('formats idle time readably', () => {
    expect(formatDuration(0.2)).toBe('1 week')
    expect(formatDuration(3)).toBe('3 months')
    expect(formatDuration(30)).toBe('2.5 years')
  })
})

describe('lost interest', () => {
  it('does not suggest Restart when interest never came back', () => {
    expect(top(project({ cause: 'interest', interest: 3, completion: 40 }))).not.toBe('restart')
  })
})
