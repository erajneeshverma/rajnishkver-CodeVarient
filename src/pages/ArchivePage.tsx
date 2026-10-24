import { AnimatePresence } from 'framer-motion'
import { useTitle } from '../lib/useTitle'
import { Ghost, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArchiveDock } from '../components/ArchiveDock'
import { GraveyardCanvas } from '../components/GraveyardCanvas'
import { Intro } from '../components/Intro'
import { Tombstone } from '../components/Tombstone'
import { Empty } from '../components/ui'
import { causes, statuses } from '../config'
import { cx, effectiveStatus, statusConfig } from '../lib/util'
import { useGraveyard } from '../store/useGraveyard'
import type { StatusId } from '../types'

type Sort = 'buried' | 'touched' | 'completion' | 'name'

export function ArchivePage() {
  useTitle()
  const projects = useGraveyard((s) => s.projects)
  const view = useGraveyard((s) => s.view)
  const setView = useGraveyard((s) => s.setView)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusId | 'all'>('all')
  const [cause, setCause] = useState('all')
  const [sort, setSort] = useState<Sort>('buried')

  const withStatus = projects.map((p) => ({ p, status: effectiveStatus(p) }))
  const countOf = (s: StatusId) => withStatus.filter((x) => x.status === s).length
  const haunting = withStatus.filter((x) => x.status === 'haunting').map((x) => x.p)

  const q = query.trim().toLowerCase()
  const visible = [...withStatus]
    .filter(({ p, status: s }) => {
      if (status !== 'all' && s !== status) return false
      if (cause !== 'all' && p.cause !== cause) return false
      if (!q) return true
      return [p.name, p.description, p.goal, p.causeNote, ...p.stack].join(' ').toLowerCase().includes(q)
    })
    .map((x) => x.p)
    .sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'completion':
          return b.completion - a.completion
        case 'touched':
          return b.lastTouchedAt.localeCompare(a.lastTouchedAt)
        default:
          return b.buriedAt.localeCompare(a.buriedAt)
      }
    })

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Your graveyard</h1>
        <p className="max-w-2xl text-muted">
          Every unfinished project, laid to rest with the story of why it stopped. Open one to hear what the Revival Advisor
          thinks it deserves, or <strong className="text-ink">drag a tombstone into one of the zones</strong> to act on it.
        </p>
      </div>

      <Intro />

      {haunting.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4 sm:flex-row sm:items-center">
          <Ghost className="size-6 shrink-0 text-violet-500 dark:text-violet-300" aria-hidden />
          <p className="text-sm">
            <strong>{haunting.length === 1 ? 'A project is' : `${haunting.length} projects are`} haunting you.</strong>{' '}
            You asked to be reminded. Time to take another look:
          </p>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {haunting.map((p) => (
              <Link key={p.id} to={`/project/${p.id}#advisor`} className="btn-ghost py-1.5">
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatButton label="All" count={projects.length} active={status === 'all'} onClick={() => setStatus('all')} />
        {statuses.map((s) => (
          <StatButton
            key={s.id}
            label={s.label}
            dot={s.dot}
            count={countOf(s.id)}
            active={status === s.id}
            onClick={() => setStatus(status === s.id ? 'all' : s.id)}
          />
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div role="radiogroup" aria-label="View" className="flex shrink-0 rounded-lg border border-line bg-surface p-1">
          {(['canvas', 'grid'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={cx('rounded-md px-3 py-1 text-sm capitalize transition', view === v ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink')}
            >
              {v === 'canvas' ? '🪦 Canvas' : '▦ Grid'}
            </button>
          ))}
        </div>
        <label className="relative min-w-[min(100%,16rem)] flex-1">
          <span className="sr-only">Search projects</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="search"
            type="search"
            className="field pl-9"
            placeholder="Search by name, idea, stack or note…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="w-full sm:w-auto">
          <span className="sr-only">Filter by cause</span>
          <select className="field w-full sm:w-48" value={cause} onChange={(e) => setCause(e.target.value)}>
            <option value="all">Any cause of death</option>
            {causes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="w-full sm:w-auto">
          <span className="sr-only">Sort</span>
          <select className="field w-full sm:w-44" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="buried">Recently buried</option>
            <option value="touched">Recently touched</option>
            <option value="completion">Most complete</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {projects.length === 0 ? (
        <Empty>
          The graveyard is empty. Lucky you, or you haven’t been honest yet.{' '}
          <Link to="/bury" className="text-lantern underline">
            Bury your first project
          </Link>
          .
        </Empty>
      ) : visible.length === 0 ? (
        <Empty>
          No projects match{status !== 'all' ? ` “${statusConfig(status).label}”` : ''}
          {query ? ` “${query}”` : ''}.
        </Empty>
      ) : view === 'canvas' ? (
        <GraveyardCanvas projects={visible} />
      ) : (
        <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((p) => (
              <Tombstone key={p.id} project={p} />
            ))}
          </AnimatePresence>
        </div>
      )}
      {projects.length > 0 && view === 'grid' && <ArchiveDock />}
    </div>
  )
}

function StatButton({
  label,
  count,
  active,
  dot,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  dot?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'card flex flex-col items-start px-4 py-3 text-left transition',
        active ? 'border-lantern ring-1 ring-lantern' : 'hover:bg-surface-2',
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted">
        {dot && <span className={cx('size-1.5 rounded-full', dot)} />}
        {label}
      </span>
      <span className="font-display text-2xl font-semibold">{count}</span>
    </button>
  )
}
