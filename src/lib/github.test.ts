import { describe, expect, it } from 'vitest'
import { parseRepo, readmeExcerpt } from './github'

describe('parseRepo', () => {
  it.each([
    ['https://github.com/owner/repo', 'owner', 'repo'],
    ['github.com/owner/repo/', 'owner', 'repo'],
    ['owner/repo', 'owner', 'repo'],
    ['git@github.com:owner/my.repo.git', 'owner', 'my.repo'],
  ])('parses %s', (input, owner, repo) => {
    expect(parseRepo(input)).toEqual({ owner, repo })
  })

  it('rejects garbage', () => {
    expect(parseRepo('not a url !!')).toBeNull()
  })
})

describe('readmeExcerpt', () => {
  it('skips headings, badges and short taglines', () => {
    const md = '# Title\n\n[![build](x.svg)](y)\n\n> Short tagline.\n\nThis is the **real** description of the project, with a [link](z).\n\n## Install'
    expect(readmeExcerpt(md)).toBe('This is the real description of the project, with a link.')
  })

  it('falls back to a short paragraph when that is all there is', () => {
    expect(readmeExcerpt('# T\n\nTiny app.')).toBe('Tiny app.')
  })

  it('ignores code blocks and truncates long text', () => {
    const long = 'word '.repeat(200)
    const out = readmeExcerpt('```\ncode here that is long enough to count as a paragraph\n```\n\n' + long, 50)
    expect(out.length).toBe(50)
    expect(out.endsWith('…')).toBe(true)
  })
})
