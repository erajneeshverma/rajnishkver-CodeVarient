import { Search } from 'lucide-react'
import { useTitle } from '../lib/useTitle'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty } from '../components/ui'
import { salvageKinds } from '../config'
import { cx } from '../lib/util'
import { useGraveyard } from '../store/useGraveyard'
import type { SalvageKind } from '../types'

export function SalvagePage() {
  useTitle('Salvage Yard')
  const projects = useGraveyard((s) => s.projects)
  const [kind, setKind] = useState<SalvageKind | 'all'>('all')
  const [query, setQuery] = useState('')

  const parts = useMemo(
    () => projects.flatMap((p) => p.salvage.map((s) => ({ ...s, project: p }))),
    [projects],
  )
  const q = query.trim().toLowerCase()
  const visible = parts.filter(
    (s) => (kind === 'all' || s.kind === kind) && (!q || `${s.title} ${s.note ?? ''} ${s.project.name}`.toLowerCase().includes(q)),
  )

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Salvage Yard</h1>
      <p className="mt-1 max-w-2xl text-muted">
        The parts worth keeping from every project: code, lessons and assets. Dead projects can still power new ones.
      </p>

      <div className="my-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
          {[{ id: 'all' as const, label: 'All', emoji: '' }, ...salvageKinds].map((k) => {
            const count = k.id === 'all' ? parts.length : parts.filter((p) => p.kind === k.id).length
            return (
              <button
                key={k.id}
                type="button"
                aria-pressed={kind === k.id}
                onClick={() => setKind(k.id)}
                className={cx('rounded-full border px-3 py-1.5 text-sm', kind === k.id ? 'border-lantern bg-lantern-soft' : 'border-line text-muted hover:text-ink')}
              >
                {k.emoji} {k.label} <span className="text-muted">{count}</span>
              </button>
            )
          })}
        </div>
        <label className="relative sm:ml-auto sm:w-64">
          <span className="sr-only">Search parts</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className="field pl-9" placeholder="Search parts…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {visible.length === 0 ? (
        <Empty>{parts.length ? 'No parts match.' : 'No parts salvaged yet. Open a project and mark what can be reused.'}</Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <li key={s.id} className="card flex flex-col p-5">
              <span className="text-2xl" aria-hidden>
                {salvageKinds.find((k) => k.id === s.kind)?.emoji}
              </span>
              <h2 className="mt-2 font-medium">{s.title}</h2>
              {s.note && <p className="mt-1 text-sm text-muted">{s.note}</p>}
              <Link to={`/project/${s.project.id}`} className="mt-auto pt-4 text-xs text-lantern hover:underline">
                From {s.project.name} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
