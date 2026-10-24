import { ArrowLeft, Bell, ExternalLink, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActionZone, DataCard } from '../canvas/Canvas'
import { Advisor } from '../components/Advisor'
import { ProjectChip } from '../components/ProjectChip'
import { Timeline } from '../components/Timeline'
import { Empty, InterestPicker, Progress, RelevancePicker, Section, StatusBadge } from '../components/ui'
import { causes, hauntOptions, paths, relevanceOptions, salvageKinds } from '../config'
import { downloadMarkdown } from '../lib/postmortem'
import { useTitle } from '../lib/useTitle'
import { cx, effectiveStatus, formatDate, relativeTime } from '../lib/util'
import { useGraveyard, useProject } from '../store/useGraveyard'
import { toast } from '../store/useToast'
import type { Project, Relevance, SalvageKind } from '../types'
import { NotFound } from './NotFound'

export function ProjectPage() {
  const { id } = useParams()
  const project = useProject(id)
  useTitle(project ? project.name : 'Not found')
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }, [hash])

  if (!project) return <NotFound />
  return <ProjectView key={project.id} project={project} />
}

type AssessmentDraft = { interest: number; relevance: Relevance }

function ProjectView({ project }: { project: Project }) {
  // Unsaved answers preview the advice live; dragging the assessment card records them.
  const [draft, setDraft] = useState<AssessmentDraft | null>(null)
  const assess = useGraveyard((s) => s.assess)
  const current = draft ?? project.assessment
  const dirty = Boolean(draft && (draft.interest !== project.assessment.interest || draft.relevance !== project.assessment.relevance))
  const preview: Project = dirty ? { ...project, assessment: { ...project.assessment, ...draft! } } : project
  const changeDraft = (next: AssessmentDraft) => setDraft(next)
  const record = () => {
    if (!dirty) return
    assess(project.id, draft!.interest, draft!.relevance)
    setDraft(null)
  }
  const assessment = { value: current, dirty, onChange: changeDraft, onRecord: record, onDiscard: () => setDraft(null) }

  const status = effectiveStatus(project)
  const cause = causes.find((c) => c.id === project.cause)

  return (
    <div>
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to the graveyard
      </Link>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {project.hauntAt && project.status === 'resting' && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Bell className="size-3" />{' '}
                {status === 'haunting' ? `Reminder was due ${relativeTime(project.hauntAt)}` : `Haunts you ${relativeTime(project.hauntAt)}`}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{project.name}</h1>
          <p className="mt-1 text-muted">{project.description}</p>
          <p className="mt-2 text-xs text-muted">
            Started {formatDate(project.startedAt)} · Last touched {formatDate(project.lastTouchedAt)} · Buried {formatDate(project.buriedAt)}
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
        <Link to={`/project/${project.id}/edit`} className="btn-ghost self-start sm:self-auto">
          <Pencil className="size-4" /> Edit tombstone
        </Link>
      </header>

      <ActionCanvas project={project} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {project.decision && <DecisionCard key={project.decision.decidedAt} project={project} />}

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

          {/* On phones the sidebar sits far below, so the live assessment comes right before the advice. */}
          <Assessment {...assessment} project={project} instance="inline" className="lg:hidden" />

          <div id="advisor" className="scroll-mt-24">
            <Section title={project.decision ? 'Revival Advisor (change your mind any time)' : 'Revival Advisor'}>
              {dirty && (
                <p className="mb-3 rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-800 dark:text-violet-300">
                  Previewing your new answers. Drag the assessment card into “Record revisit” to keep them. Choosing a path records them too.
                </p>
              )}
              <Advisor project={preview} onBeforeDecide={record} />
            </Section>
          </div>

          <Section title="Timeline">
            <Timeline project={project} />
          </Section>
        </div>

        <aside className="min-w-0 space-y-6">
          <Assessment {...assessment} project={project} instance="side" className="hidden lg:block" />
          <SalvagePanel project={project} />
        </aside>
      </div>
    </div>
  )
}

/** Haunt, export and exhume, all by dragging the project card into a zone. */
function ActionCanvas({ project }: { project: Project }) {
  const navigate = useNavigate()
  const { remove, restore, hauntIn, clearHaunt } = useGraveyard()
  const isThis = (p: { kind: string; id?: string }) => p.kind === 'project' && p.id === project.id

  const exhume = () => {
    const index = useGraveyard.getState().projects.findIndex((p) => p.id === project.id)
    const snapshot = project
    remove(project.id)
    navigate('/')
    toast(`⚰️ ${snapshot.name} was exhumed.`, { label: 'Undo', run: () => restore(snapshot, index) })
  }

  return (
    <section aria-label="Project actions" className="card p-4 sm:p-5">
      <div className="grid items-center gap-4 sm:grid-cols-[13rem_1fr]">
        <div className="flex flex-col items-center gap-1.5">
          <DataCard id={`actions-${project.id}`} payload={{ kind: 'project', id: project.id }} label={project.name} className="w-full max-w-[13rem]" hint={false}>
            <ProjectChip project={project} />
          </DataCard>
          <p className="text-center text-xs text-muted">Drag the card into a zone</p>
        </div>
        <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {project.status === 'resting' &&
            (project.hauntAt ? (
              <ActionZone
                id="stop-haunting"
                label="Stop haunting"
                icon="🔕"
                tone="violet"
                hint="Clear the revisit reminder"
                accepts={isThis}
                onDrop={() => {
                  clearHaunt(project.id)
                  toast('Reminder cleared. It will rest quietly.')
                }}
              />
            ) : (
              <div className="rounded-xl border-2 border-dashed border-violet-500/30 p-3 sm:col-span-2 xl:col-span-1">
                <p className="text-sm font-medium">
                  <span aria-hidden>👻</span> Haunt me in…
                </p>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {hauntOptions.map((d) => (
                    <ActionZone
                      key={d}
                      id={`haunt-${d}`}
                      label={`${d} days`}
                      tone="violet"
                      className="p-2 text-center [&>div]:justify-center"
                      accepts={isThis}
                      onDrop={() => {
                        hauntIn(project.id, d)
                        toast(`👻 ${project.name} will haunt you in ${d} days.`)
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          <ActionZone
            id="export"
            label="Export post-mortem"
            icon="📄"
            hint="Download it as Markdown"
            accepts={isThis}
            onDrop={() => {
              downloadMarkdown(project)
              toast('📄 Post-mortem downloaded as Markdown.')
            }}
          />
          <ActionZone id="exhume" label="Exhume" icon="⚰️" tone="danger" hint="Delete it (you can undo)" accepts={isThis} onDrop={exhume} />
        </div>
      </div>
    </section>
  )
}

/** The chosen fate. Steps and epitaph save as you type; drag the card out to reconsider. */
function DecisionCard({ project }: { project: Project }) {
  const { updateDecision, reopen } = useGraveyard()
  const d = project.decision!
  const cfg = paths.find((p) => p.id === d.path)!
  const rip = cfg.resultStatus === 'rip'
  const [steps, setSteps] = useState(() => [...d.nextSteps, '', '', ''].slice(0, Math.max(3, d.nextSteps.length)))
  const [epitaph, setEpitaph] = useState(d.epitaph ?? '')

  const face = (
    <div className={cx('card w-full max-w-[13rem] p-4 text-center', rip ? 'border-rose-500/50' : 'border-emerald-500/50')}>
      <p className="text-3xl" aria-hidden>
        {cfg.emoji}
      </p>
      <p className="mt-1 font-display text-lg font-semibold">{cfg.label}</p>
      <p className="text-xs text-muted">Decided {formatDate(d.decidedAt)}</p>
    </div>
  )

  return (
    <section id="decision" aria-label="Decision" className={cx('card scroll-mt-24 p-5 sm:p-6', rip ? 'border-rose-500/40' : 'border-emerald-500/40 bg-emerald-500/5')}>
      <div className="grid gap-5 sm:grid-cols-[13rem_1fr]">
        <div className="flex flex-col items-center gap-2.5">
          <DataCard id={`decision-${project.id}`} payload={{ kind: 'decision', id: project.id }} label={`${cfg.label} decision`} className="w-full max-w-[13rem]">
            {face}
          </DataCard>
          <ActionZone
            id="reconsider"
            label="Dig it back up"
            icon="↩️"
            tone="neutral"
            hint="Drop the decision here to reconsider"
            className="w-full max-w-[13rem]"
            accepts={(p) => p.kind === 'decision' && p.id === project.id}
            onDrop={() => {
              reopen(project.id)
              toast(`${project.name} is resting again. Take another look at the advice.`)
            }}
          />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">{rip ? 'Laid to rest' : 'Revived'}</h2>
          {d.path !== d.suggested && (
            <p className="mt-1 text-xs text-muted">You overrode the advisor, which suggested {paths.find((p) => p.id === d.suggested)?.label}.</p>
          )}
          {rip ? (
            <div className="mt-3">
              <label className="label" htmlFor="epitaph">
                Epitaph: what did this project teach you?
              </label>
              <textarea
                id="epitaph"
                rows={3}
                className="field font-display text-base italic"
                placeholder="e.g. Validate with users before building the dashboard."
                value={epitaph}
                onChange={(e) => {
                  setEpitaph(e.target.value)
                  updateDecision(project.id, { epitaph: e.target.value })
                }}
              />
              <p className="mt-1 text-xs text-muted">Saved as you type. It appears on the Insights epitaph wall.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="label">Your next steps</p>
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-right text-sm text-muted">{i + 1}.</span>
                  <input
                    aria-label={`Step ${i + 1}`}
                    className="field"
                    value={s}
                    placeholder={`Step ${i + 1}`}
                    onChange={(e) => {
                      const next = steps.map((x, j) => (j === i ? e.target.value : x))
                      setSteps(next)
                      updateDecision(project.id, { nextSteps: next.map((x) => x.trim()).filter(Boolean) })
                    }}
                  />
                </div>
              ))}
              <p className="text-xs text-muted">Saved as you type.</p>
            </div>
          )}
        </div>
      </div>
    </section>
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

/** Pick new answers to preview the advice; drag the assessment card into a zone to record or drop them. */
function Assessment({
  project,
  value,
  dirty,
  onChange,
  onRecord,
  onDiscard,
  instance,
  className,
}: {
  project: Project
  value: AssessmentDraft
  dirty: boolean
  onChange: (v: AssessmentDraft) => void
  onRecord: () => void
  onDiscard: () => void
  instance: string
  className?: string
}) {
  const relevanceLabel = relevanceOptions.find((r) => r.id === value.relevance)?.label
  return (
    <Section title="Today’s assessment" className={className}>
      <div className="space-y-4">
        <div>
          <span className="label">Interest today</span>
          <InterestPicker value={value.interest} onChange={(v) => onChange({ ...value, interest: v })} />
        </div>
        <div>
          <span className="label">Still relevant?</span>
          <RelevancePicker value={value.relevance} onChange={(v) => onChange({ ...value, relevance: v })} />
        </div>
        {dirty ? (
          <div className="space-y-2 border-t border-line pt-4">
            <DataCard id={`assessment-${instance}`} payload={{ kind: 'assessment', id: project.id }} label={`Assessment: interest ${value.interest} of 5, ${relevanceLabel}`}>
              <div className="rounded-lg border border-violet-500/60 bg-surface p-2.5 pr-8 text-sm shadow-sm">
                <span className="block text-xs text-muted">New assessment</span>
                {'🕯️'.repeat(value.interest)} · {relevanceLabel}
              </div>
            </DataCard>
            <div className="grid grid-cols-2 gap-2">
              <ActionZone
                id={`record-${instance}`}
                label="Record revisit"
                icon="📝"
                tone="violet"
                className="py-2"
                accepts={(p) => p.kind === 'assessment' && p.id === project.id}
                onDrop={() => {
                  onRecord()
                  toast('📝 Revisit recorded. The advice now uses your new answers.')
                }}
              />
              <ActionZone
                id={`discard-assessment-${instance}`}
                label="Keep my old answers"
                icon="↩️"
                tone="neutral"
                className="py-2"
                accepts={(p) => p.kind === 'assessment' && p.id === project.id}
                onDrop={onDiscard}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted">Change an answer to preview how the advice shifts. Last assessed {formatDate(project.assessment.assessedAt)}.</p>
        )}
      </div>
    </Section>
  )
}

/** Type a part, then drag its card into the bin. Drag an existing part to the scrap zone to remove it. */
function SalvagePanel({ project }: { project: Project }) {
  const { addSalvage, removeSalvage, restoreSalvage } = useGraveyard()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [kind, setKind] = useState<SalvageKind>('component')
  const kindCfg = salvageKinds.find((k) => k.id === kind)!

  const newPart = (
    <div className="flex items-start gap-2 rounded-lg border border-lantern/60 bg-surface p-2.5 text-sm shadow-sm">
      <span aria-hidden>{kindCfg.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title.trim() || 'New part'}</span>
        {note.trim() && <span className="block truncate text-xs text-muted">{note.trim()}</span>}
      </span>
    </div>
  )

  return (
    <Section title="Salvage parts">
      <ActionZone
        bare
        id="salvage-bin"
        label="the salvage bin"
        accepts={(p) => p.kind === 'new-salvage' && p.id === project.id}
        onDrop={() => {
          addSalvage(project.id, { kind, title: title.trim(), note: note.trim() || undefined })
          toast(`♻️ Salvaged “${title.trim()}”.`)
          setTitle('')
          setNote('')
        }}
        className="p-2"
      >
        {project.salvage.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted">
            The salvage bin is empty. Describe a reusable part below, then drag its card in here. Parts count towards Repurpose.
          </p>
        ) : (
          <ul className="space-y-2">
            {project.salvage.map((s) => (
              <li key={s.id}>
                <DataCard id={`salvage-${s.id}`} payload={{ kind: 'salvage', id: project.id, itemId: s.id }} label={`Salvaged part ${s.title}`}>
                  <div className="flex items-start gap-2 rounded-lg bg-surface-2 p-2.5 pr-7 text-sm">
                    <span aria-hidden>{salvageKinds.find((k) => k.id === s.kind)?.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{s.title}</span>
                      {s.note && <span className="block text-xs text-muted">{s.note}</span>}
                    </span>
                  </div>
                </DataCard>
              </li>
            ))}
          </ul>
        )}
      </ActionZone>

      {project.salvage.length > 0 && (
        <ActionZone
          id="scrap"
          label="Scrap a part"
          icon="🗑️"
          tone="danger"
          hint="Drag a part here to remove it"
          className="mt-2 py-2"
          accepts={(p) => p.kind === 'salvage' && p.id === project.id}
          onDrop={(p) => {
            if (p.kind !== 'salvage') return
            const index = project.salvage.findIndex((x) => x.id === p.itemId)
            const item = project.salvage[index]
            if (!item) return
            removeSalvage(project.id, p.itemId)
            toast(`🗑️ Scrapped “${item.title}”.`, { label: 'Undo', run: () => restoreSalvage(project.id, item, index) })
          }}
        />
      )}

      <div className="mt-4 space-y-2 border-t border-line pt-4">
        <p className="text-xs font-medium text-muted">New part</p>
        <select aria-label="Kind of part" className="field" value={kind} onChange={(e) => setKind(e.target.value as SalvageKind)}>
          {salvageKinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.emoji} {k.label}
            </option>
          ))}
        </select>
        <input aria-label="Part name" className="field" placeholder="What can be reused?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input aria-label="Note" className="field" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        {title.trim() ? (
          <DataCard id={`new-salvage-${project.id}`} payload={{ kind: 'new-salvage', id: project.id }} label={`New part ${title.trim()}`}>
            {newPart}
            <p className="mt-1 text-center text-xs text-muted">↑ Drag this card into the salvage bin</p>
          </DataCard>
        ) : (
          <Empty>Name the part and its card appears here, ready to drag.</Empty>
        )}
      </div>
    </Section>
  )
}
