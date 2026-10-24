import { ChevronDown, Minus, MoveRight, Plus, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { ActionZone, DataCard } from '../canvas/Canvas'
import { appConfig, paths } from '../config'
import { advise, type PathAdvice } from '../engine/advisor'
import { cx } from '../lib/util'
import { useGraveyard } from '../store/useGraveyard'
import { toast } from '../store/useToast'
import type { PathId, Project } from '../types'
import { ProjectChip } from './ProjectChip'

/**
 * Canvas Protocol: the project card sits on the left, the five revival paths are
 * drop zones on the right, ranked by the advisor. Dropping the card decides its fate.
 */
export function Advisor({ project, onBeforeDecide }: { project: Project; onBeforeDecide?: () => void }) {
  const advice = useMemo(() => advise(project, appConfig), [project])
  const top = advice[0].path
  const decide = useGraveyard((s) => s.decide)

  const choose = (path: PathId) => {
    const cfg = paths.find((p) => p.id === path)!
    // The advice shown may come from unsaved answers; record them with the decision.
    onBeforeDecide?.()
    decide(project.id, { path, suggested: top, nextSteps: cfg.nextSteps, epitaph: cfg.resultStatus === 'rip' ? '' : undefined })
    toast(
      cfg.resultStatus === 'rip'
        ? `🪦 ${project.name} rests in peace. Write its epitaph above.`
        : `⚡ ${project.name} has been revived: ${cfg.label}. Your next steps are above.`,
    )
    setTimeout(() => document.getElementById('decision')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Ranked from what you told us: how complete it is, why it stopped, how long it’s been idle, your interest today, whether
        the idea is still relevant, and what you can salvage. <strong className="text-ink">Drag the project onto the path you choose.</strong>
      </p>
      <div className="grid gap-4 md:grid-cols-[minmax(0,13rem)_1fr]">
        <div className="flex flex-col items-center gap-2 md:sticky md:top-24 md:self-start">
          <DataCard id={`advisor-${project.id}`} payload={{ kind: 'project', id: project.id }} label={project.name} className="w-full max-w-[13rem]" hint={false}>
            <ProjectChip project={project} />
          </DataCard>
          <p className="flex items-center gap-1 text-xs text-muted">
            Drag onto a path <MoveRight className="size-3.5 max-md:rotate-90" aria-hidden />
          </p>
        </div>
        <ol className="min-w-0 space-y-2.5">
          {advice.map((a, i) => (
            <li key={a.path}>
              <PathZone
                advice={a}
                rank={i + 1}
                recommended={i === 0}
                chosen={project.decision?.path === a.path}
                onChoose={() => choose(a.path)}
                projectId={project.id}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function PathZone({
  advice,
  rank,
  recommended,
  chosen,
  onChoose,
  projectId,
}: {
  advice: PathAdvice
  rank: number
  recommended: boolean
  chosen: boolean
  onChoose: () => void
  projectId: string
}) {
  const cfg = paths.find((p) => p.id === advice.path)!
  return (
    <ActionZone
      bare
      overText={`Release to choose ${cfg.label}`}
      id={`path-${advice.path}`}
      label={cfg.label}
      tone={cfg.resultStatus === 'rip' ? 'danger' : recommended ? 'lantern' : 'emerald'}
      fx={cfg.resultStatus === 'rip' ? 'rest' : 'revive'}
      pulse={recommended}
      accepts={(p) => p.kind === 'project' && p.id === projectId && !chosen}
      onDrop={onChoose}
      className={cx('p-0', recommended && 'bg-lantern-soft', chosen && 'border-solid')}
    >
      <div className="flex items-center gap-3 p-3 pr-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-muted">{rank}</span>
        <span className="text-xl" aria-hidden>
          {cfg.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{cfg.label}</span>
            {recommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-lantern px-2 py-0.5 text-[11px] font-semibold text-on-lantern">
                <Sparkles className="size-3" /> Recommended
              </span>
            )}
            {chosen && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold">Your choice</span>}
          </span>
          <span className="block truncate text-xs text-muted">{advice.pros[0]?.text ?? cfg.summary}</span>
        </span>
        <span className="hidden w-24 shrink-0 sm:block" aria-label={`Fit ${advice.confidence}%`}>
          <span className="mb-1 block text-right text-xs text-muted">{advice.confidence}% fit</span>
          <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-lantern" style={{ width: `${advice.confidence}%` }} />
          </span>
        </span>
      </div>
      <details className="group/why border-t border-line/60 px-4 py-2 text-sm" open={recommended}>
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted hover:text-ink">
          <ChevronDown className="size-3.5 transition group-open/why:rotate-180" aria-hidden />
          Why this score ({advice.score > 0 ? '+' : ''}
          {advice.score})
        </summary>
        <div className="space-y-3 pb-1 pt-2">
          <p className="text-muted">
            <strong className="text-ink">{cfg.verb}.</strong> {cfg.summary}
          </p>
          <Reasons title="Why" items={advice.pros} positive />
          <Reasons title="Against" items={advice.cons} />
        </div>
      </details>
    </ActionZone>
  )
}

function Reasons({ title, items, positive }: { title: string; items: PathAdvice['pros']; positive?: boolean }) {
  if (!items.length) return null
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((r) => (
          <li key={r.text} className="flex items-start gap-2">
            <span
              className={cx(
                'mt-0.5 inline-flex min-w-9 shrink-0 items-center justify-center gap-0.5 rounded px-1 text-xs font-semibold',
                positive ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-800 dark:text-rose-300',
              )}
            >
              {positive ? <Plus className="size-3" /> : <Minus className="size-3" />}
              {Math.abs(r.weight)}
            </span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
