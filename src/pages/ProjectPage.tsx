import { ArrowLeft, Bell, BellOff, ExternalLink, FileDown, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Advisor } from '../components/Advisor'
import { Timeline } from '../components/Timeline'
import { Empty, InterestPicker, Modal, Progress, RelevancePicker, Section, StatusBadge } from '../components/ui'
import { causes, hauntOptions, paths, relevanceOptions, salvageKinds } from '../config'
import { downloadMarkdown } from '../lib/postmortem'
import { effectiveStatus, formatDate, relativeTime } from '../lib/util'
import { useGraveyard, useProject } from '../store/useGraveyard'
import { toast } from '../store/useToast'
import { useTitle } from '../lib/useTitle'
import type { Relevance, SalvageKind } from '../types'
import { NotFound } from './NotFound'

export function ProjectPage() {
  const { id } = useParams()
  const project = useProject(id)
  useTitle(project ? project.name : 'Not found')
  const { hash } = useLocation()
  const navigate = useNavigate()
  const { remove, restore, hauntIn, clearHaunt, reopen } = useGraveyard()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [assessing, setAssessing] = useState(false)
  const [hauntOpen, setHauntOpen] = useState(false)

  useEffect(() => {
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }, [hash])

  if (!project) return <NotFound />

  const status = effectiveStatus(project)
  const cause = causes.find((c) => c.id === project.cause)
  const decision = project.decision
  const decisionCfg = decision && paths.find((p) => p.id === decision.path)

  return (
    <div>
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to the graveyard
      </Link>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {project.hauntAt && project.status === 'resting' && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Bell className="size-3" /> {status === 'haunting' ? `Reminder was due ${relativeTime(project.hauntAt)}` : `Haunts you ${relativeTime(project.hauntAt)}`}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{project.name}</h1>
          <p className="mt-1 text-muted">{project.description}</p>
          <p className="mt-2 text-xs text-muted">
            Started {formatDate(project.startedAt)} · Last touched {formatDate(project.lastTouchedAt)} · Buried{' '}
            {formatDate(project.buriedAt)}
          </p>
          {(project.stack.length > 0 || project.repoUrl) && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {project.stack.map((s) => (
                <span key={s} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs">
                  {s}
                </span>
              ))}
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-lantern hover:underline">
                  Repository <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {project.status === 'resting' &&
            (project.hauntAt ? (
              <button type="button" className="btn-ghost" onClick={() => {
                  clearHaunt(project.id)
                  toast('Reminder cleared. It will rest quietly.')
                }}>
                <BellOff className="size-4" /> Stop haunting
              </button>
            ) : (
              <button type="button" className="btn-ghost" onClick={() => setHauntOpen(true)}>
                <Bell className="size-4" /> Haunt me later
              </button>
            ))}
          <button
            type="button"
            className="btn-ghost"
            title="Download a Markdown post-mortem"
            onClick={() => {
              downloadMarkdown(project)
              toast('Post-mortem downloaded as Markdown.')
            }}
          >
            <FileDown className="size-4" /> Export
          </button>
          <Link to={`/project/${project.id}/edit`} className="btn-ghost">
            <Pencil className="size-4" /> Edit
          </Link>
          <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)} aria-label="Delete project">
            <Trash2 className="size-4" />
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {decision && decisionCfg && (
            <section
              className={
                decisionCfg.resultStatus === 'rip'
                  ? 'card border-rose-500/40 p-6'
                  : 'card border-emerald-500/40 bg-emerald-500/5 p-6'
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Decided {formatDate(decision.decidedAt)}</p>
                  <h2 className="mt-1 font-display text-xl font-semibold">
                    {decisionCfg.emoji} {decisionCfg.label}
                  </h2>
                  {decision.path !== decision.suggested && (
                    <p className="mt-1 text-xs text-muted">
                      You overrode the advisor, which suggested {paths.find((p) => p.id === decision.suggested)?.label}.
                    </p>
                  )}
                </div>
                <button type="button" className="btn-ghost" onClick={() => {
                    reopen(project.id)
                    toast(`${project.name} is resting again. Take another look below.`)
                  }}>
                  <RotateCcw className="size-4" /> Reconsider
                </button>
              </div>
              {decision.epitaph ? (
                <blockquote className="mt-4 border-l-2 border-rose-400/60 pl-4 font-display text-lg italic">“{decision.epitaph}”</blockquote>
              ) : (
                decision.nextSteps.length > 0 && (
                  <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
                    {decision.nextSteps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                )
              )}
            </section>
          )}

          <Section title="The Tombstone">
            <dl className="grid gap-5 text-sm sm:grid-cols-2">
              <Detail label="What you wanted to build" value={project.goal} wide />
              <Detail label="What got done" value={project.done} />
              <Detail label="What’s unfinished" value={project.unfinished} />
            </dl>
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>Completion</span>
                <span>{project.completion}%</span>
              </div>
              <Progress value={project.completion} />
            </div>
          </Section>

          <Section title="The Autopsy">
            <div className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden>
                {cause?.emoji}
              </span>
              <div>
                <p className="font-medium">{cause?.label}</p>
                <p className="text-xs text-muted">{cause?.hint}</p>
                {project.causeNote && <p className="mt-3 text-sm">“{project.causeNote}”</p>}
              </div>
            </div>
          </Section>

          {/* On phones the assessment card sits far below, so show a compact version next to the advice. */}
          <div className="card flex items-center gap-3 p-4 text-sm lg:hidden">
            <span className="flex-1">
              <span className="block text-xs text-muted">Today’s assessment</span>
              Interest {project.assessment.interest}/5 · {relevanceOptions.find((r) => r.id === project.assessment.relevance)?.label}
            </span>
            <button type="button" className="btn-ghost py-1.5" onClick={() => setAssessing(true)}>
              Reassess
            </button>
          </div>

          <div id="advisor" className="scroll-mt-24">
            <Section title={decision ? 'Revival Advisor (for reference)' : 'Revival Advisor'}>
              <Advisor project={project} />
            </Section>
          </div>

          <Section title="Timeline">
            <Timeline project={project} />
          </Section>
        </div>

        <aside className="min-w-0 space-y-6">
          <Section
            className="hidden lg:block"
            title="Today’s assessment"
            action={
              <button type="button" className="btn-ghost py-1.5" onClick={() => setAssessing(true)}>
                Reassess
              </button>
            }
          >
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Interest</dt>
                <dd>
                  {'🕯️'.repeat(project.assessment.interest)}
                  <span className="opacity-25 grayscale">{'🕯️'.repeat(5 - project.assessment.interest)}</span>{' '}
                  <span className="text-muted">{project.assessment.interest}/5</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Still relevant?</dt>
                <dd>{relevanceOptions.find((r) => r.id === project.assessment.relevance)?.label}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Last assessed</dt>
                <dd>{formatDate(project.assessment.assessedAt)}</dd>
              </div>
            </dl>
          </Section>

          <SalvagePanel projectId={project.id} />
        </aside>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Exhume ${project.name}?`}>
        <p className="text-sm text-muted">This removes the project and its whole history from your graveyard. You’ll have a few seconds to undo it.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)}>
            Keep it
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              const index = useGraveyard.getState().projects.findIndex((p) => p.id === project.id)
              const snapshot = project
              remove(project.id)
              navigate('/')
              toast(`${snapshot.name} was exhumed.`, { label: 'Undo', run: () => restore(snapshot, index) })
            }}
          >
            Delete
          </button>
        </div>
      </Modal>

      <Modal open={hauntOpen} onClose={() => setHauntOpen(false)} title="Haunt me later">
        <p className="mb-4 text-sm text-muted">
          We’ll mark {project.name} as <strong>Haunting</strong> and surface it on your graveyard when it’s time to take another look.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {hauntOptions.map((d) => (
            <button
              key={d}
              type="button"
              className="btn-ghost"
              onClick={() => {
                hauntIn(project.id, d)
                setHauntOpen(false)
                toast(`👻 ${project.name} will haunt you in ${d} days.`)
              }}
            >
              {d} days
            </button>
          ))}
        </div>
      </Modal>

      {assessing && (
        <AssessModal
          id={project.id}
          interest={project.assessment.interest}
          relevance={project.assessment.relevance}
          onClose={() => setAssessing(false)}
        />
      )}
    </div>
  )
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="mb-1 text-xs text-muted">{label}</dt>
      <dd className="whitespace-pre-line">{value || <span className="text-muted">Not recorded</span>}</dd>
    </div>
  )
}

function AssessModal({ id, interest: i0, relevance: r0, onClose }: { id: string; interest: number; relevance: Relevance; onClose: () => void }) {
  const assess = useGraveyard((s) => s.assess)
  const [interest, setInterest] = useState(i0)
  const [relevance, setRelevance] = useState(r0)
  return (
    <Modal open onClose={onClose} title="Take another look">
      <div className="space-y-5">
        <div>
          <span className="label">How interested are you today?</span>
          <InterestPicker value={interest} onChange={setInterest} />
        </div>
        <div>
          <span className="label">Is the idea still relevant?</span>
          <RelevancePicker value={relevance} onChange={setRelevance} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            assess(id, interest, relevance)
            onClose()
            toast('Assessment updated. The advice below has been re-ranked.')
          }}
        >
          Update advice
        </button>
      </div>
    </Modal>
  )
}

function SalvagePanel({ projectId }: { projectId: string }) {
  const project = useProject(projectId)!
  const { addSalvage, removeSalvage } = useGraveyard()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [kind, setKind] = useState<SalvageKind>('component')

  return (
    <Section title="Salvage parts">
      {project.salvage.length === 0 ? (
        <Empty>Nothing salvaged yet. Code, lessons and assets you can reuse go here, and they count towards Repurpose.</Empty>
      ) : (
        <ul className="space-y-2">
          {project.salvage.map((s) => (
            <li key={s.id} className="group flex items-start gap-2 rounded-lg bg-surface-2 p-2.5 text-sm">
              <span aria-hidden>{salvageKinds.find((k) => k.id === s.kind)?.emoji}</span>
              <span className="flex-1">
                <span className="block font-medium">{s.title}</span>
                {s.note && <span className="block text-xs text-muted">{s.note}</span>}
              </span>
              <button
                type="button"
                aria-label={`Remove ${s.title}`}
                onClick={() => removeSalvage(project.id, s.id)}
                className="text-muted opacity-0 hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-4 space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          addSalvage(project.id, { kind, title: title.trim(), note: note.trim() || undefined })
          toast(`♻️ Salvaged “${title.trim()}”.`)
          setTitle('')
          setNote('')
        }}
      >
        <select aria-label="Kind of part" className="field" value={kind} onChange={(e) => setKind(e.target.value as SalvageKind)}>
          {salvageKinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.emoji} {k.label}
            </option>
          ))}
        </select>
        <input aria-label="Part name" className="field" placeholder="What can be reused?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input aria-label="Note" className="field" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="btn-ghost w-full" disabled={!title.trim()}>
          Salvage it
        </button>
      </form>
    </Section>
  )
}
