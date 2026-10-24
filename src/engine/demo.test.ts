import { describe, expect, it } from 'vitest'
import { appConfig } from '../config'
import type { Project } from '../types'
import { advise } from './advisor'

// Mirrors the live demo in docs/DEMO.md so the script never lies.
const base: Project = {
  id: 'demo', name: 'Demo', description: '', goal: '', done: '', unfinished: '', completion: 40, stack: [],
  startedAt: '2026-10-24T00:00:00Z', lastTouchedAt: '2026-10-24T00:00:00Z', buriedAt: '2026-10-24T00:00:00Z',
  cause: 'scope', causeNote: '', assessment: { interest: 4, relevance: 'yes', assessedAt: '' }, salvage: [], status: 'resting', events: [],
}
const now = new Date('2026-10-24T12:00:00Z')

describe('demo script', () => {
  it('recommends Restart for a fresh scope-creep project', () => {
    expect(advise(base, appConfig, now)[0].path).toBe('restart')
  })
  it('flips away from Restart after reassessing to interest 1 and not relevant', () => {
    const top = advise({ ...base, assessment: { interest: 1, relevance: 'no', assessedAt: '' } }, appConfig, now)[0].path
    expect(['change', 'archive']).toContain(top)
  })
})
