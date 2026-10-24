import { ArrowLeft, ArrowRight, FolderGit2, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CausePicker, InterestPicker, RelevancePicker } from '../components/ui'
import { appConfig, causes, paths, salvageKinds } from '../config'
import { advise } from '../engine/advisor'
import { importRepo, parseRepo } from '../lib/github'
import { cx, dateInputToISO, localDate, todayISO, uid } from '../lib/util'
import { ActionZone, DataCard } from '../canvas/Canvas'
import { useGraveyard, useProject } from '../store/useGraveyard'
import { toast } from '../store/useToast'
import { useTitle } from '../lib/useTitle'
import { NotFound } from './NotFound'
import type { Project, ProjectDraft, SalvageKind } from '../types'

const steps = [
  { title: 'The Tombstone', sub: 'What it was and how far it got' },
  { title: 'The Autopsy', sub: 'Why it stopped' },
  { title: 'Assess', sub: 'How you feel about it today' },
]

const blank = (): ProjectDraft => ({
  name: '',
  description: '',
  goal: '',
  done: '',
  unfinished: '',
  completion: 40,
  stack: [],
  repoUrl: '',
  startedAt: todayISO(),
  lastTouchedAt: todayISO(),
  cause: '',
  causeNote: '',
  interest: 3,
  relevance: 'yes',
  salvage: [],
})

const toDraft = (p: Project): ProjectDraft => ({
  name: p.name,
  description: p.description,
  goal: p.goal,
  done: p.done,
  unfinished: p.unfinished,
  completion: p.completion,
  stack: p.stack,
  repoUrl: p.repoUrl ?? '',
  startedAt: localDate(p.startedAt),
  lastTouchedAt: localDate(p.lastTouchedAt),
  cause: p.cause,
  causeNote: p.causeNote,
  interest: p.assessment.interest,
  relevance: p.assessment.relevance,
  salvage: p.salvage,
})

const toISO = (d: string) => dateInputToISO(d)

export function BuryPage() {
  const { id } = useParams()
  const existing = useProject(id)
  if (id && !existing) return <NotFound />
  return <BuryForm key={id ?? 'new'} />
}

function BuryForm() {
  const { id } = useParams()
  const existing = useProject(id)
  const editing = Boolean(existing)
  useTitle(existing ? `Edit ${existing.name}` : 'Bury a project')
  const { bury, edit, saveDraft, clearDraft } = useGraveyard()
  const savedDraft = useGraveyard((s) => s.draft)
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [d, setD] = useState<ProjectDraft>(() => (existing ? toDraft(existing) : { ...blank(), ...savedDraft }))
  const [touched, setTouched] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const set = <K extends keyof ProjectDraft>(k: K, v: ProjectDraft[K]) => setD((prev) => ({ ...prev, [k]: v }))

  // Autosave new burials so a half-filled form is never lost.
  useEffect(() => {
    if (!editing) saveDraft(d)
  }, [d, editing, saveDraft])

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!d.name.trim()) e.name = 'Give it a name for the tombstone.'
    if (!d.description.trim()) e.description = 'One line on what it was.'
    const today = todayISO()
    if (!d.startedAt) e.startedAt = 'When did you start it?'
    else if (d.startedAt > today) e.startedAt = 'That’s in the future.'
    if (!d.lastTouchedAt) e.lastTouchedAt = 'When did you last work on it?'
    else if (d.lastTouchedAt > today) e.lastTouchedAt = 'That’s in the future.'
    else if (d.startedAt && d.lastTouchedAt < d.startedAt) e.lastTouchedAt = 'Last touched can’t be before it started.'
    if (!d.cause) e.cause = 'Pick the closest cause.'
    return e
  }, [d])
  const stepFields = [['name', 'description', 'startedAt', 'lastTouchedAt'], ['cause'], []]
  const stepValid = (i: number) => stepFields[i].every((f) => !errors[f])

  const next = () => {
    setTouched(true)
    if (!stepValid(step)) return
    setTouched(false)
    setStep((s) => s + 1)
  }

  const submit = () => {
    setTouched(true)
    const firstBad = [0, 1, 2].find((i) => !stepValid(i))
    if (firstBad !== undefined) return setStep(firstBad)
    const final = { ...d, startedAt: toISO(d.startedAt), lastTouchedAt: toISO(d.lastTouchedAt), repoUrl: d.repoUrl || undefined }
    if (existing) {
      edit(existing.id, final)
      toast('Tombstone updated.')
      navigate(`/project/${existing.id}`)
    } else {
      const newId = bury(final)
      toast(`🪦 ${final.name} has been laid to rest. Here’s what the advisor thinks.`)
      navigate(`/project/${newId}#advisor`)
    }
  }

  const preview = useMemo(() => {
    if (step !== 2 || !d.cause) return null
    const fake = {
      ...d,
      lastTouchedAt: toISO(d.lastTouchedAt),
      assessment: { interest: d.interest, relevance: d.relevance, assessedAt: '' },
    } as unknown as Project
    return advise(fake, appConfig)[0]
  }, [d, step])

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold">{editing ? `Edit ${existing!.name}` : 'Bury a project'}</h1>
      <p className="mt-1 text-muted">
        {editing ? 'Update its tombstone.' : 'Three short steps, about two minutes. Your progress is saved as you type.'}
      </p>

      <ol className="my-8 grid grid-cols-3 gap-2" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => (i < step || [...Array(i).keys()].every(stepValid)) && setStep(i)}
              aria-current={i === step ? 'step' : undefined}
              className="w-full text-left"
            >
              <div className={cx('h-1 rounded-full', i <= step ? 'bg-lantern' : 'bg-surface-2')} />
              <div className={cx('mt-2 text-sm font-medium', i === step ? 'text-ink' : 'text-muted')}>
                {i + 1}. {s.title}
              </div>
              <div className="hidden text-xs text-muted sm:block">{s.sub}</div>
            </button>
          </li>
        ))}
      </ol>

      <form
        className="card space-y-5 p-5 sm:p-7"
        onSubmit={(e) => {
          // Enter moves through the steps; laying it to rest is a drag (Canvas Protocol).
          e.preventDefault()
          if (step < 2) next()
        }}
      >
        {step === 0 && <TombstoneStep key={formKey} d={d} set={set} setD={setD} errors={touched ? errors : {}} />}
        {step === 1 && (
          <>
            <div>
              <span className="label">What killed it?</span>
              <CausePicker value={d.cause} onChange={(v) => set('cause', v)} />
              {touched && errors.cause && <p className="mt-1.5 text-xs text-rose-500">{errors.cause}</p>}
            </div>
            <div>
              <label className="label" htmlFor="causeNote">
                The honest version <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="causeNote"
                rows={3}
                className="field"
                placeholder="e.g. The auth flow took three weekends and I lost momentum."
                value={d.causeNote}
                onChange={(e) => set('causeNote', e.target.value)}
              />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div>
              <span className="label">How interested are you in it today?</span>
              <InterestPicker value={d.interest} onChange={(v) => set('interest', v)} />
            </div>
            <div>
              <span className="label">Is the idea still relevant?</span>
              <RelevancePicker value={d.relevance} onChange={(v) => set('relevance', v)} />
            </div>
            <SalvageInput items={d.salvage} onChange={(v) => set('salvage', v)} />
            {preview && (
              <div className="flex items-start gap-3 rounded-xl border border-lantern/40 bg-lantern-soft p-4 text-sm">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-lantern" aria-hidden />
                <p>
                  <strong>Advisor preview:</strong> leaning towards{' '}
                  <strong>{paths.find((p) => p.id === preview.path)?.label}</strong>
                  {preview.pros[0] && <> because {preview.pros[0].text.charAt(0).toLowerCase() + preview.pros[0].text.slice(1)}</>}
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between border-t border-line pt-5">
          {step > 0 ? (
            <button type="button" className="btn-ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" /> Back
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button type="submit" className="btn-primary">
              Next <ArrowRight className="size-4" />
            </button>
          ) : (
            <span className="text-xs text-muted">Drag the tombstone below to finish</span>
          )}
        </div>
      </form>

      {step === 2 && (
        <section aria-label="Finish" className="card mt-4 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">{editing ? 'Save the tombstone' : 'Lay it to rest'}</h2>
          <p className="mt-1 text-sm text-muted">Drag the tombstone into a zone.</p>
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[13rem_1fr]">
            <div className="flex justify-center">
              <DataCard id="draft" payload={{ kind: 'draft' }} label={`Tombstone for ${d.name || 'your project'}`} className="w-full max-w-[13rem]" hint={false}>
                <DraftTombstone d={d} />
              </DataCard>
            </div>
            <div className="grid gap-2.5">
              <ActionZone
                id="grave"
                label={editing ? 'Update the tombstone' : 'The grave: lay it to rest'}
                icon={editing ? '✏️' : '🪦'}
                hint={editing ? 'Saves your changes' : 'Buries it and asks the Revival Advisor'}
                className="py-6"
                accepts={(p) => p.kind === 'draft'}
                onDrop={submit}
              />
              {!editing && (
                <ActionZone
                  id="discard"
                  label="Discard draft"
                  icon="🗑️"
                  tone="danger"
                  hint="Start over with an empty form"
                  accepts={(p) => p.kind === 'draft'}
                  onDrop={() => {
                    const previous = d
                    clearDraft()
                    setD(blank())
                    setTouched(false)
                    setFormKey((k) => k + 1)
                    setStep(0)
                    toast('🗑️ Draft discarded.', {
                      label: 'Undo',
                      run: () => {
                        setD(previous)
                        setFormKey((k) => k + 1)
                        setStep(2)
                      },
                    })
                  }}
                />
              )}
            </div>
          </div>
          {touched && [0, 1].some((i) => !stepValid(i)) && (
            <p role="alert" className="mt-3 text-xs text-rose-500">
              Some earlier answers need fixing first.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

/** Live preview of the tombstone being buried; this is the card you drag. */
function DraftTombstone({ d }: { d: ProjectDraft }) {
  const cause = causes.find((c) => c.id === d.cause)
  return (
    <div className="tombstone w-full border border-line bg-stone px-4 pb-4 pt-7 text-center">
      <p className="font-display text-[10px] tracking-[0.3em] text-muted">HERE LIES</p>
      <p className="mt-1 truncate font-display text-lg font-semibold">{d.name || 'Untitled'}</p>
      <p className="text-xs text-muted">
        {d.startedAt.slice(0, 4)}
        {d.lastTouchedAt.slice(0, 4) !== d.startedAt.slice(0, 4) && ` – ${d.lastTouchedAt.slice(0, 4)}`}
      </p>
      {cause && (
        <p className="mt-1 text-xs text-muted">
          <span aria-hidden>{cause.emoji}</span> {cause.label}
        </p>
      )}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-lantern" style={{ width: `${d.completion}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted">{d.completion}% done</p>
    </div>
  )
}

function TombstoneStep({
  d,
  set,
  setD,
  errors,
}: {
  d: ProjectDraft
  set: <K extends keyof ProjectDraft>(k: K, v: ProjectDraft[K]) => void
  setD: React.Dispatch<React.SetStateAction<ProjectDraft>>
  errors: Record<string, string>
}) {
  const [repo, setRepo] = useState(d.repoUrl ?? '')
  const [loading, setLoading] = useState(false)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [tag, setTag] = useState('')

  const [imported, setImported] = useState(d.repoUrl ?? '')

  const runImport = async (value = repo) => {
    if (!value.trim() || loading) return
    setImported(value.trim())
    setLoading(true)
    setImportMsg(null)
    try {
      const info = await importRepo(value)
      setD((prev) => ({
        ...prev,
        name: prev.name || info.name,
        description: prev.description || info.description || info.readmeExcerpt,
        goal: prev.goal || (info.description ? info.readmeExcerpt : ''),
        stack: [...new Set([...prev.stack, ...info.stack])],
        startedAt: localDate(info.createdAt),
        lastTouchedAt: localDate(info.lastCommitAt),
        repoUrl: info.url,
      }))
      setImportMsg({ ok: true, text: `Imported ${info.name}: stack, dates and README filled in. Check them below.` })
    } catch (e) {
      setImportMsg({ ok: false, text: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // Import starts by itself shortly after a valid repo URL is typed or pasted.
  useEffect(() => {
    const value = repo.trim()
    if (!parseRepo(value) || value === imported) return
    const t = setTimeout(() => runImport(value), 700)
    return () => clearTimeout(t)
  })

  const addTag = () => {
    const t = tag.trim().replace(/,$/, '')
    if (t && !d.stack.includes(t)) set('stack', [...d.stack, t])
    setTag('')
  }

  return (
    <>
      <div className="rounded-xl border border-dashed border-line bg-surface-2/50 p-4">
        <label className="label flex items-center gap-2" htmlFor="repo">
          <FolderGit2 className="size-4" /> Import from GitHub <span className="font-normal text-muted">(optional)</span>
        </label>
        <div className="relative">
          <input
            id="repo"
            className="field pr-9"
            placeholder="Paste github.com/owner/repo and it imports itself"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            // Enter shouldn't jump to the next step from here; import starts on its own.
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          />
          {loading && <Loader2 aria-label="Importing" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />}
        </div>
        {importMsg && (
          <p role="status" className={cx('mt-2 text-xs', importMsg.ok ? 'text-moss' : 'text-rose-500')}>
            {importMsg.text}
          </p>
        )}
      </div>

      <Field label="Project name" error={errors.name}>
        <input id="name" className="field" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. StudyBuddy" />
      </Field>
      <Field label="What was it?" error={errors.description}>
        <input
          id="description"
          className="field"
          value={d.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="One line a stranger would understand"
        />
      </Field>
      <Field label="What did you want to build?" optional>
        <textarea id="goal" rows={2} className="field" value={d.goal} onChange={(e) => set('goal', e.target.value)} placeholder="The full vision" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="What got done" optional>
          <textarea id="done" rows={3} className="field" value={d.done} onChange={(e) => set('done', e.target.value)} />
        </Field>
        <Field label="What’s unfinished" optional>
          <textarea id="unfinished" rows={3} className="field" value={d.unfinished} onChange={(e) => set('unfinished', e.target.value)} />
        </Field>
      </div>
      <div>
        <label className="label" htmlFor="completion">
          How complete is it? <span className="text-lantern">{d.completion}%</span>
        </label>
        <input
          id="completion"
          type="range"
          min={0}
          max={100}
          step={5}
          value={d.completion}
          onChange={(e) => set('completion', Number(e.target.value))}
          className="w-full accent-[var(--lantern)]"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Started" error={errors.startedAt}>
          <input id="startedAt" type="date" className="field" value={d.startedAt} max={todayISO()} onChange={(e) => set('startedAt', e.target.value)} />
        </Field>
        <Field label="Last touched" error={errors.lastTouchedAt}>
          <input
            id="lastTouchedAt"
            type="date"
            className="field"
            value={d.lastTouchedAt}
            max={todayISO()}
            onChange={(e) => set('lastTouchedAt', e.target.value)}
          />
        </Field>
      </div>
      <div>
        <label className="label" htmlFor="stack">
          Stack <span className="font-normal text-muted">(type and press Enter; drag a tag to the bin to remove it)</span>
        </label>
        <div className="flex items-stretch gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-2 focus-within:border-lantern">
          {d.stack.map((s) => (
            <DataCard key={s} id={`tag-${s}`} payload={{ kind: 'tag', value: s }} label={`Tag ${s}`} hint={false}>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs">{s}</span>
            </DataCard>
          ))}
          <input
            id="stack"
            className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
            value={tag}
            placeholder={d.stack.length ? '' : 'React, Firebase…'}
            onChange={(e) => (e.target.value.endsWith(',') ? (setTag(e.target.value), addTag()) : setTag(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              } else if (e.key === 'Backspace' && !tag && d.stack.length) set('stack', d.stack.slice(0, -1))
            }}
            onBlur={addTag}
          />
        </div>
        {d.stack.length > 0 && (
          <ActionZone
            id="tag-bin"
            label="Bin"
            icon="🗑️"
            tone="danger"
            className="grid place-items-center px-3 py-1"
            accepts={(p) => p.kind === 'tag'}
            onDrop={(p) => p.kind === 'tag' && set('stack', d.stack.filter((x) => x !== p.value))}
          />
        )}
        </div>
      </div>
    </>
  )
}

function Field({ label, error, optional, children }: { label: string; error?: string; optional?: boolean; children: React.ReactElement<{ id?: string }> }) {
  return (
    <div>
      <label className="label" htmlFor={children.props.id}>
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
    </div>
  )
}

/** Salvage parts for a new burial: type one, drag its card into the list; drag a part to the bin to drop it. */
export function SalvageInput({ items, onChange }: { items: ProjectDraft['salvage']; onChange: (v: ProjectDraft['salvage']) => void }) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<SalvageKind>('component')
  const emoji = (k: SalvageKind) => salvageKinds.find((x) => x.id === k)?.emoji
  const add = () => {
    if (!title.trim()) return
    onChange([...items, { id: uid(), kind, title: title.trim() }])
    setTitle('')
  }
  return (
    <div>
      <span className="label">
        Anything worth salvaging? <span className="font-normal text-muted">(optional)</span>
      </span>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select aria-label="Kind of part" className="field sm:w-44" value={kind} onChange={(e) => setKind(e.target.value as SalvageKind)}>
          {salvageKinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.emoji} {k.label}
            </option>
          ))}
        </select>
        <input
          aria-label="Salvageable part"
          className="field"
          placeholder="e.g. Auth module, a lesson, an icon set"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <ActionZone
          bare
          id="draft-salvage"
          label="the salvage list"
          accepts={(p) => p.kind === 'new-salvage' && p.id === 'draft'}
          onDrop={add}
          className="min-h-14 p-2"
        >
          {items.length ? (
            <ul className="flex flex-wrap gap-2">
              {items.map((it) => (
                <li key={it.id}>
                  <DataCard id={`draft-salvage-${it.id}`} payload={{ kind: 'salvage', id: 'draft', itemId: it.id }} label={`Part ${it.title}`} hint={false}>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1 text-xs">
                      {emoji(it.kind)} {it.title}
                    </span>
                  </DataCard>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-2 text-center text-xs text-muted">Salvage list: drop part cards here</p>
          )}
        </ActionZone>
        {items.length > 0 && (
          <ActionZone
            id="draft-salvage-bin"
            label="Bin"
            icon="🗑️"
            tone="danger"
            className="grid place-items-center py-2"
            accepts={(p) => p.kind === 'salvage' && p.id === 'draft'}
            onDrop={(p) => p.kind === 'salvage' && onChange(items.filter((x) => x.id !== p.itemId))}
          />
        )}
      </div>
      {title.trim() && (
        <DataCard id="draft-new-salvage" payload={{ kind: 'new-salvage', id: 'draft' }} label={`New part ${title.trim()}`} className="mt-2">
          <div className="flex items-center gap-2 rounded-lg border border-lantern/60 bg-surface p-2.5 pr-8 text-sm shadow-sm">
            <span aria-hidden>{emoji(kind)}</span> <span className="truncate">{title.trim()}</span>
          </div>
          <p className="mt-1 text-center text-xs text-muted">↑ Drag this card into the salvage list</p>
        </DataCard>
      )}
    </div>
  )
}
