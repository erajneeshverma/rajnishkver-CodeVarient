import { ArrowLeft, ArrowRight, Check, FolderGit2, Loader2, Plus, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CausePicker, InterestPicker, RelevancePicker } from '../components/ui'
import { appConfig, paths, salvageKinds } from '../config'
import { advise } from '../engine/advisor'
import { importRepo } from '../lib/github'
import { cx, todayISO, uid } from '../lib/util'
import { useGraveyard, useProject } from '../store/useGraveyard'
import { toast } from '../store/useToast'
import { useTitle } from '../lib/useTitle'
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
  startedAt: p.startedAt.slice(0, 10),
  lastTouchedAt: p.lastTouchedAt.slice(0, 10),
  cause: p.cause,
  causeNote: p.causeNote,
  interest: p.assessment.interest,
  relevance: p.assessment.relevance,
  salvage: p.salvage,
})

const toISO = (d: string) => (d.length === 10 ? new Date(d + 'T12:00:00').toISOString() : d)

export function BuryPage() {
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
  const set = <K extends keyof ProjectDraft>(k: K, v: ProjectDraft[K]) => setD((prev) => ({ ...prev, [k]: v }))

  // Autosave new burials so a half-filled form is never lost.
  useEffect(() => {
    if (!editing) saveDraft(d)
  }, [d, editing, saveDraft])

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!d.name.trim()) e.name = 'Give it a name for the tombstone.'
    if (!d.description.trim()) e.description = 'One line on what it was.'
    if (d.lastTouchedAt < d.startedAt) e.lastTouchedAt = 'Last touched can’t be before it started.'
    if (!d.cause) e.cause = 'Pick the closest cause.'
    return e
  }, [d])
  const stepFields = [['name', 'description', 'lastTouchedAt'], ['cause'], []]
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
          e.preventDefault()
          if (step < 2) next()
          else submit()
        }}
      >
        {step === 0 && <TombstoneStep d={d} set={set} setD={setD} errors={touched ? errors : {}} />}
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
          ) : !editing && savedDraft?.name ? (
            <button
              type="button"
              className="btn text-muted hover:text-ink"
              onClick={() => {
                clearDraft()
                setD(blank())
              }}
            >
              Clear draft
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button type="submit" className="btn-primary">
              Next <ArrowRight className="size-4" />
            </button>
          ) : (
            <button type="submit" className="btn-primary">
              <Check className="size-4" /> {editing ? 'Save changes' : 'Lay it to rest'}
            </button>
          )}
        </div>
      </form>
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

  const runImport = async () => {
    setLoading(true)
    setImportMsg(null)
    try {
      const info = await importRepo(repo)
      setD((prev) => ({
        ...prev,
        name: prev.name || info.name,
        description: prev.description || info.description || info.readmeExcerpt,
        goal: prev.goal || (info.description ? info.readmeExcerpt : ''),
        stack: [...new Set([...prev.stack, ...info.stack])],
        startedAt: info.createdAt.slice(0, 10),
        lastTouchedAt: info.lastCommitAt.slice(0, 10),
        repoUrl: info.url,
      }))
      setImportMsg({ ok: true, text: `Imported ${info.name}: stack, dates and README filled in. Check them below.` })
    } catch (e) {
      setImportMsg({ ok: false, text: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

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
        <div className="flex gap-2">
          <input
            id="repo"
            className="field"
            placeholder="github.com/owner/repo"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (repo.trim()) runImport()
              }
            }}
          />
          <button type="button" className="btn-ghost shrink-0" disabled={!repo.trim() || loading} onClick={runImport}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : 'Import'}
          </button>
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
        <Field label="Started">
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
          Stack <span className="font-normal text-muted">(press Enter to add)</span>
        </label>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-2 focus-within:border-lantern">
          {d.stack.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs">
              {s}
              <button type="button" aria-label={`Remove ${s}`} onClick={() => set('stack', d.stack.filter((x) => x !== s))}>
                <X className="size-3" />
              </button>
            </span>
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

export function SalvageInput({ items, onChange }: { items: ProjectDraft['salvage']; onChange: (v: ProjectDraft['salvage']) => void }) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<SalvageKind>('component')
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" className="btn-ghost shrink-0" onClick={add} disabled={!title.trim()}>
          <Plus className="size-4" /> Add
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((it) => (
            <li key={it.id} className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1 text-xs">
              {salvageKinds.find((k) => k.id === it.kind)?.emoji} {it.title}
              <button type="button" aria-label={`Remove ${it.title}`} onClick={() => onChange(items.filter((x) => x.id !== it.id))}>
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
