import { describe, expect, it } from 'vitest'
import { toMarkdown } from './postmortem'
import { seedProjects } from './seed'

describe('toMarkdown', () => {
  const now = new Date('2026-10-24T12:00:00Z')
  const [studyBuddy, , , , mirror] = seedProjects()

  it('includes every section for a resting project', () => {
    const md = toMarkdown(studyBuddy, now)
    for (const h of ['# StudyBuddy: post-mortem', '## The Tombstone', '## The Autopsy', '## Revival Advisor', '## Salvageable parts', '## Timeline'])
      expect(md).toContain(h)
    expect(md).not.toContain('## Decision')
    expect(md).toMatch(/1\. \*\*Continue\*\*/)
    expect(md).not.toMatch(/\{\w+\}|undefined/)
  })

  it('records the decision and epitaph for an archived project', () => {
    const md = toMarkdown(mirror, now)
    expect(md).toContain('**Chose:** Archive (R.I.P.)')
    expect(md).toContain('Buy two of everything')
  })
})
