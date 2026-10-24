/** Public GitHub import: no auth, so it is subject to the 60 requests/hour limit. */
export interface RepoInfo {
  name: string
  description: string
  stack: string[]
  createdAt: string
  lastCommitAt: string
  readmeExcerpt: string
  url: string
}

export function parseRepo(input: string): { owner: string; repo: string } | null {
  const m = input
    .trim()
    .replace(/\.git$/, '')
    .match(/(?:github\.com[/:])?([\w.-]+)\/([\w.-]+)\/?$/)
  return m ? { owner: m[1], repo: m[2] } : null
}

async function gh<T>(path: string, accept = 'application/vnd.github+json'): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, { headers: { Accept: accept } })
  if (res.status === 404) throw new Error('Repository not found. Is it public?')
  if (res.status === 403 || res.status === 429) throw new Error('GitHub rate limit reached. Try again in a few minutes.')
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`)
  return accept.includes('raw') ? ((await res.text()) as T) : res.json()
}

/** First real paragraph of a README (skipping headings, badges and short taglines), with markdown noise stripped. */
export function readmeExcerpt(md: string, max = 400): string {
  const clean = (block: string) =>
    block
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  const blocks = md
    .replace(/<[^>]+>/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b && !b.startsWith('#') && !b.startsWith('|') && !/^[-=*_]{3,}$/.test(b))
    .map(clean)
    .filter(Boolean)
  const para = blocks.find((b) => b.length >= 40) ?? blocks[0] ?? ''
  return para.length > max ? para.slice(0, max - 1) + '…' : para
}

export async function importRepo(input: string): Promise<RepoInfo> {
  const parsed = parseRepo(input)
  if (!parsed) throw new Error('Paste a GitHub URL like github.com/owner/repo')
  const base = `/repos/${parsed.owner}/${parsed.repo}`

  const repo = await gh<{
    name: string
    description: string | null
    created_at: string
    pushed_at: string
    html_url: string
    topics?: string[]
  }>(base)

  const [languages, readme] = await Promise.all([
    gh<Record<string, number>>(`${base}/languages`).catch(() => ({}) as Record<string, number>),
    gh<string>(`${base}/readme`, 'application/vnd.github.raw+json').catch(() => ''),
  ])

  const stack = [
    ...Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang),
    ...(repo.topics ?? []).slice(0, 3),
  ]

  return {
    name: repo.name,
    description: repo.description ?? '',
    stack: [...new Set(stack)],
    createdAt: repo.created_at,
    lastCommitAt: repo.pushed_at,
    readmeExcerpt: readmeExcerpt(readme),
    url: repo.html_url,
  }
}
