import { describe, expect, it } from 'vitest'
import { seedProjects } from './seed'
import { parseExport } from './validate'

describe('parseExport', () => {
  it('round-trips a real export unchanged', () => {
    const projects = seedProjects()
    expect(parseExport(JSON.stringify({ version: 1, projects }))).toEqual(projects)
  })

  it('repairs a broken project instead of crashing', () => {
    const [p] = parseExport('{"projects":[{"id":"x","name":"x","assessment":{}}]}')
    expect(p).toMatchObject({ status: 'resting', cause: 'other', stack: [], salvage: [], events: [], assessment: { interest: 3, relevance: 'partly' } })
    expect(Number.isNaN(Date.parse(p.startedAt))).toBe(false)
  })

  it('drops nameless entries and de-duplicates ids', () => {
    const out = parseExport(JSON.stringify({ projects: [{ id: 'a', name: 'One' }, { id: 'a', name: 'Two' }, { id: 'b' }, 42] }))
    expect(out.map((p) => p.name)).toEqual(['One', 'Two'])
    expect(new Set(out.map((p) => p.id)).size).toBe(2)
  })

  it('rejects files that are not exports', () => {
    expect(() => parseExport('not json')).toThrow(/valid JSON/)
    expect(() => parseExport('{"hello":1}')).toThrow(/graveyard export/)
    expect(() => parseExport('{"projects":[{"nope":true}]}')).toThrow(/could be read/)
  })
})
