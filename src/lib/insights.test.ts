import { describe, expect, it } from 'vitest'
import { computeInsights } from './insights'
import { seedProjects } from './seed'

describe('computeInsights', () => {
  it('handles an empty graveyard', () => {
    const i = computeInsights([])
    expect(i.total).toBe(0)
    expect(i.revivalRate).toBeNull()
    expect(i.headlines).toEqual([])
  })

  it('summarises the demo graveyard', () => {
    const i = computeInsights(seedProjects())
    expect(i.total).toBe(5)
    expect(i.revived).toBe(1)
    expect(i.archived).toBe(1)
    expect(i.revivalRate).toBe(50)
    expect(i.advisorAgreement).toBe(100)
    expect(i.byCause.reduce((n, b) => n + b.value, 0)).toBe(5)
    expect(i.byCompletion.reduce((n, b) => n + b.value, 0)).toBe(5)
    expect(i.epitaphs).toHaveLength(1)
    expect(i.headlines.length).toBeGreaterThan(0)
  })
})

describe('stack counting', () => {
  it('merges stacks that differ only by case', () => {
    const [a, b] = seedProjects()
    const i = computeInsights([
      { ...a, stack: ['FIrebase', 'React'] },
      { ...b, stack: ['Firebase', 'firebase'] },
    ])
    expect(i.byStack.find((s) => s.id === 'firebase')).toMatchObject({ label: 'Firebase', value: 2 })
  })
})
