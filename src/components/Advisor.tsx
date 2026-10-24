import { AnimatePresence, m } from 'framer-motion'
import { ChevronDown, Minus, Plus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { appConfig, paths } from '../config'
import { advise, type PathAdvice } from '../engine/advisor'
import { cx } from '../lib/util'
import { useGraveyard } from '../store/useGraveyard'
import { toast } from '../store/useToast'
import type { PathId, Project } from '../types'
import { Modal } from './ui'

export function Advisor({ project }: { project: Project }) {
  const advice = useMemo(() => advise(project, appConfig), [project])
  const top = advice[0]
  const [open, setOpen] = useState<PathId | null>(top.path)
  // When a reassessment changes the top pick, open the new recommendation.
  const [shownTop, setShownTop] = useState(top.path)
  if (shownTop !== top.path) {
    setShownTop(top.path)
    setOpen(top.path)
  }
  const [choosing, setChoosing] = useState<PathId | null>(null)

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Ranked from what you told us: how complete it is, why it stopped, how long it’s been idle, your interest today, whether
        the idea is still relevant, and what you can salvage. You make the final call.
      </p>
      <ol className="space-y-3">
        {advice.map((a, i) => (
          <PathCard
            key={a.path}
            advice={a}
            rank={i + 1}
            recommended={i === 0}
            open={open === a.path}
            onToggle={() => setOpen(open === a.path ? null : a.path)}
            onChoose={() => setChoosing(a.path)}
          />
        ))}
      </ol>
      {choosing && (
        <DecisionModal project={project} path={choosing} suggested={top.path} onClose={() => setChoosing(null)} />
      )}
    </div>
  )
}

function PathCard({
  advice,
  rank,
  recommended,
  open,
  onToggle,
  onChoose,
}: {
  advice: PathAdvice
  rank: number
  recommended: boolean
  open: boolean
  onToggle: () => void
  onChoose: () => void
}) {
  const cfg = paths.find((p) => p.id === advice.path)!
  const panelId = `path-${advice.path}`
  return (
    <li className={cx('overflow-hidden rounded-xl border transition', recommended ? 'border-lantern/60 bg-lantern-soft' : 'border-line bg-surface')}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-muted">{rank}</span>
        <span className="text-xl" aria-hidden>
          {cfg.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{cfg.label}</span>
            {recommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-lantern px-2 py-0.5 text-[11px] font-semibold text-[#1a1306]">
                <Sparkles className="size-3" /> Recommended
              </span>
            )}
          </span>
          <span className="block truncate text-xs text-muted">{advice.pros[0]?.text ?? cfg.summary}</span>
        </span>
        <span className="hidden w-28 shrink-0 sm:block" aria-label={`Fit ${advice.confidence}%`}>
          <span className="mb-1 block text-right text-xs text-muted">{advice.confidence}% fit</span>
          <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-lantern" style={{ width: `${advice.confidence}%` }} />
          </span>
        </span>
        <ChevronDown className={cx('size-4 shrink-0 text-muted transition', open && 'rotate-180')} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div id={panelId} initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-line/60 px-4 pb-4 pt-3 text-sm">
              <p className="text-muted">
                <strong className="text-ink">{cfg.verb}.</strong> {cfg.summary}
              </p>
              <Reasons title="Why" items={advice.pros} positive />
              <Reasons title="Against" items={advice.cons} />
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-muted">Score {advice.score > 0 ? '+' : ''}{advice.score}</span>
                <button type="button" className={recommended ? 'btn-primary' : 'btn-ghost'} onClick={onChoose}>
                  Choose {cfg.label}
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Reasons({ title, items, positive }: { title: string; items: PathAdvice['pros']; positive?: boolean }) {
  if (!items.length) return null
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((r) => (
          <li key={r.text} className="flex items-start gap-2">
            <span
              className={cx(
                'mt-0.5 inline-flex min-w-9 shrink-0 items-center justify-center gap-0.5 rounded px-1 text-xs font-semibold',
                positive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
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

function DecisionModal({ project, path, suggested, onClose }: { project: Project; path: PathId; suggested: PathId; onClose: () => void }) {
  const cfg = paths.find((p) => p.id === path)!
  const decide = useGraveyard((s) => s.decide)
  const [steps, setSteps] = useState<string[]>(() => [...cfg.nextSteps, '', '', ''].slice(0, 3))
  const [epitaph, setEpitaph] = useState('')
  const isArchive = cfg.resultStatus === 'rip'

  const confirm = () => {
    decide(project.id, {
      path,
      suggested,
      nextSteps: isArchive ? [] : steps.map((s) => s.trim()).filter(Boolean),
      epitaph: isArchive ? epitaph.trim() : undefined,
    })
    onClose()
    toast(isArchive ? `🪦 ${project.name} rests in peace.` : `⚡ ${project.name} has been revived: ${cfg.label}.`)
  }

  return (
    <Modal open onClose={onClose} title={isArchive ? `Lay ${project.name} to rest` : `${cfg.label}: ${project.name}`}>
      {path !== suggested && (
        <p className="mb-4 rounded-lg bg-surface-2 p-3 text-xs text-muted">
          You’re going against the advisor’s pick ({paths.find((p) => p.id === suggested)?.label}). That’s fine, it’s your call. We’ll
          note it on the timeline.
        </p>
      )}
      {isArchive ? (
        <div>
          <label className="label" htmlFor="epitaph">
            Epitaph: what did this project teach you?
          </label>
          <textarea
            id="epitaph"
            rows={3}
            className="field"
            placeholder="e.g. Validate with users before building the dashboard."
            value={epitaph}
            onChange={(e) => setEpitaph(e.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="label">Your first three steps</p>
          {steps.map((s, i) => (
            <input
              key={i}
              aria-label={`Step ${i + 1}`}
              className="field"
              value={s}
              placeholder={`Step ${i + 1}`}
              onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={confirm}>
          {isArchive ? 'Rest in peace 🪦' : 'Resurrect ⚡'}
        </button>
      </div>
    </Modal>
  )
}
