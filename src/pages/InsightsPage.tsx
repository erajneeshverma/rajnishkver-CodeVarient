import { Lightbulb } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, Section } from '../components/ui'
import { formatDuration } from '../engine/advisor'
import { computeInsights, type Bar } from '../lib/insights'
import { cx } from '../lib/util'
import { useGraveyard } from '../store/useGraveyard'

export function InsightsPage() {
  const projects = useGraveyard((s) => s.projects)
  const i = useMemo(() => computeInsights(projects), [projects])

  if (!projects.length)
    return (
      <div>
        <Header />
        <Empty>
          No projects yet, so no patterns either.{' '}
          <Link to="/bury" className="text-lantern underline">
            Bury your first one
          </Link>
          .
        </Empty>
      </div>
    )

  return (
    <div className="space-y-6">
      <Header />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Projects buried" value={String(i.total)} />
        <Stat
          label="Revival rate"
          value={i.revivalRate === null ? '—' : `${i.revivalRate}%`}
          sub={i.revivalRate === null ? 'No decisions yet' : `${i.revived} revived · ${i.archived} laid to rest`}
        />
        <Stat label="Avg completion at death" value={`${i.avgCompletion}%`} />
        <Stat label="Avg time idle" value={formatDuration(i.avgMonthsIdle)} />
        <Stat className="col-span-2 lg:col-span-1" label="Parts salvaged" value={String(i.salvageCount)} sub={<Link to="/salvage" className="hover:text-ink">Open the Salvage Yard →</Link>} />
      </div>

      {i.headlines.length > 0 && (
        <section className="card border-lantern/40 bg-lantern-soft p-5 sm:p-6" aria-label="What your graveyard says">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Lightbulb className="size-5 text-lantern" aria-hidden /> What your graveyard says
          </h2>
          <ul className="space-y-2 text-sm">
            {i.headlines.map((h) => (
              <li key={h} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-lantern" />
                {h}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Why your projects die">
          <BarList bars={i.byCause} total={i.total} unit="project" />
        </Section>
        <Section title="How far they got">
          <BarList bars={i.byCompletion} total={i.total} unit="project" />
        </Section>
        <Section title="What you decided">
          {i.byPath.length ? (
            <>
              <BarList bars={i.byPath} total={i.byPath.reduce((n, b) => n + b.value, 0)} unit="decision" />
              {i.advisorAgreement !== null && (
                <p className="mt-4 text-xs text-muted">You followed the advisor’s top pick on {i.advisorAgreement}% of decisions.</p>
              )}
            </>
          ) : (
            <Empty>No decisions yet. Open a resting project and pick a revival path.</Empty>
          )}
        </Section>
        <Section title="Stacks in the graveyard">
          {i.byStack.length ? <BarList bars={i.byStack} total={i.total} unit="project" /> : <Empty>No stacks recorded yet.</Empty>}
        </Section>
      </div>

      {i.epitaphs.length > 0 && (
        <Section title="The epitaph wall">
          <p className="mb-4 text-sm text-muted">Lessons from the projects you laid to rest.</p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {i.epitaphs.map((e) => (
              <li key={e.project.id} className="rounded-xl border border-line bg-surface-2/50 p-4">
                <blockquote className="font-display text-lg italic">“{e.text}”</blockquote>
                <Link to={`/project/${e.project.id}`} className="mt-2 inline-block text-xs text-muted hover:text-ink">
                  — {e.project.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function Header() {
  return (
    <div className="mb-2">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Graveyard insights</h1>
      <p className="mt-1 max-w-2xl text-muted">Patterns across everything you’ve buried, so the next project doesn’t end up here for the same reason.</p>
    </div>
  )
}

function Stat({ label, value, sub, className }: { label: string; value: string; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('card px-4 py-3', className)}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

/** Single-series horizontal bars: label, bar from a shared baseline, value at the tip. */
function BarList({ bars, total, unit }: { bars: Bar[]; total: number; unit: string }) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(1, ...bars.map((b) => b.value))
  return (
    <ul className="space-y-1">
      {bars.map((b) => {
        const share = total ? Math.round((b.value / total) * 100) : 0
        const summary = `${b.label}: ${b.value} ${unit}${b.value === 1 ? '' : 's'}, ${share}%${b.detail ? `. ${b.detail}` : ''}`
        return (
          <li
            key={b.id}
            tabIndex={0}
            aria-label={summary}
            onMouseEnter={() => setActive(b.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(b.id)}
            onBlur={() => setActive(null)}
            className={cx('relative grid grid-cols-[minmax(7.5rem,42%)_1fr] sm:grid-cols-[minmax(7rem,38%)_1fr] items-center gap-3 rounded-lg px-2 py-1.5 outline-none', active === b.id && 'bg-surface-2')}
          >
            <span className="text-sm leading-snug">
              {b.emoji && (
                <span aria-hidden className="mr-1.5">
                  {b.emoji}
                </span>
              )}
              {b.label}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 rounded-r bg-lantern transition-[width]" style={{ width: `${(b.value / max) * 85}%`, minWidth: b.value ? 4 : 0 }} />
              <span className="text-xs tabular-nums text-muted">{b.value}</span>
            </span>
            {active === b.id && (
              <span role="tooltip" className="pointer-events-none absolute right-2 top-full z-10 mt-1 w-max max-w-[16rem] rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
                <span className="block font-medium text-ink">
                  {b.value} {unit}
                  {b.value === 1 ? '' : 's'} · {share}%
                </span>
                {b.detail && <span className="mt-0.5 block text-muted">{b.detail}</span>}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
