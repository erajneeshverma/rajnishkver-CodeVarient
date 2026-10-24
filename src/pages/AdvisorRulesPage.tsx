import { useTitle } from '../lib/useTitle'
import { useEffect, useRef, useState } from 'react'
import { ActionZone, DataCard, type Payload } from '../canvas/Canvas'
import { Section } from '../components/ui'
import { causes, paths, rules, type Condition } from '../config'
import { downloadFile } from '../lib/download'
import { cx, localDate } from '../lib/util'
import { parseExport } from '../lib/validate'
import { useGraveyard } from '../store/useGraveyard'
import { toast } from '../store/useToast'

const signalLabels: Record<string, string> = {
  completion: 'Completion',
  cause: 'Cause',
  monthsIdle: 'Months idle',
  interest: 'Interest',
  relevance: 'Relevance',
  salvageCount: 'Salvaged parts',
}

function describe(c: Condition): string {
  const name = signalLabels[c.signal] ?? c.signal
  const val = (v: string) => causes.find((x) => x.id === v)?.label ?? v
  switch (c.op) {
    case 'is':
      return `${name} is “${val(c.value)}”`
    case 'not':
      return `${name} is not “${val(c.value)}”`
    case 'in':
      return `${name} is ${c.value.map((v) => `“${val(v)}”`).join(' or ')}`
    default:
      return `${name} ${c.op.replace('>=', '≥').replace('<=', '≤')} ${c.value}${c.signal === 'completion' ? '%' : ''}`
  }
}

export function AdvisorRulesPage() {
  useTitle('How advice works')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">How the Revival Advisor thinks</h1>
        <p className="mt-1 max-w-2xl text-muted">
          No black box. Each project is turned into six signals, and every rule below adds or removes points from one revival
          path. The path with the most points is recommended, and each point comes with the sentence you see on the project page.
        </p>
      </div>

      <section aria-label="How you act" className="card flex flex-col gap-3 border-lantern/40 bg-lantern-soft p-5 text-sm sm:flex-row sm:items-center">
        <span className="text-3xl" aria-hidden>
          🎨
        </span>
        <p>
          <strong>Canvas Protocol:</strong> there are no action buttons. Pick up a card and drop it into an action zone: the
          project onto a revival path, a tombstone onto the dock, the graveyard card below onto a data action. Keyboard:
          focus a card, press <kbd className="rounded border border-line px-1">Space</kbd>, use the arrow keys to choose a zone,
          then <kbd className="rounded border border-line px-1">Space</kbd> again.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paths.map((p) => {
          const pathRules = rules.filter((r) => r.path === p.id)
          return (
            <Section key={p.id} title={`${p.emoji} ${p.label}`}>
              <p className="mb-3 text-sm text-muted">{p.summary}</p>
              <ul className="space-y-2 text-sm">
                {pathRules.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={
                        r.weight > 0
                          ? 'mt-0.5 min-w-8 rounded bg-emerald-500/15 px-1 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300'
                          : 'mt-0.5 min-w-8 rounded bg-rose-500/15 px-1 text-center text-xs font-semibold text-rose-700 dark:text-rose-300'
                      }
                    >
                      {r.weight > 0 ? '+' : '−'}
                      {Math.abs(r.weight)}
                    </span>
                    <span>{r.when.map(describe).join(' and ')}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )
        })}
      </div>

      <Section title="Your data">
        <DataTools />
      </Section>
    </div>
  )
}

/** Data tools as a canvas: drag the graveyard card into a zone, or drop a JSON file to import. */
function DataTools() {
  const { projects, replaceAll, resetDemo, clearAll } = useGraveyard()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [fileOver, setFileOver] = useState(false)
  const [pending, setPending] = useState<File | null>(null)

  // A file dropped just outside the zone must not make the browser open it instead of the app.
  useEffect(() => {
    const stop = (e: DragEvent) => e.dataTransfer?.types.includes('Files') && e.preventDefault()
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => {
      window.removeEventListener('dragover', stop)
      window.removeEventListener('drop', stop)
    }
  }, [])
  const plural = (n: number) => `${n} project${n === 1 ? '' : 's'}`

  const importJson = async (file: File) => {
    try {
      const imported = parseExport(await file.text())
      const previous = projects
      replaceAll(imported)
      setMsg(`Imported ${plural(imported.length)} from ${file.name}.`)
      toast(`📥 Imported ${plural(imported.length)}.`, { label: 'Undo', run: () => replaceAll(previous) })
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  const replaceWith = (action: () => void, message: string) => {
    const previous = projects
    action()
    toast(message, { label: 'Undo', run: () => replaceAll(previous) })
  }

  const isGraveyard = (p: Payload) => p.kind === 'graveyard'

  return (
    <div className="text-sm">
      <p className="mb-4 text-muted">Everything is stored in this browser only. Drag the graveyard card into a zone to back it up, reset it or clear it.</p>
      <div className="grid gap-4 md:grid-cols-[13rem_1fr]">
        <div className="flex justify-center">
          <DataCard id="graveyard" payload={{ kind: 'graveyard' }} label={`Your graveyard, ${plural(projects.length)}`} className="w-full max-w-[13rem]" hint={false}>
            <div className="tombstone border border-line bg-stone px-4 pb-5 pt-8 text-center">
              <p className="text-3xl" aria-hidden>
                🪦
              </p>
              <p className="mt-1 font-display text-lg font-semibold">Your graveyard</p>
              <p className="text-xs text-muted">{plural(projects.length)}</p>
            </div>
          </DataCard>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <ActionZone
            id="export-json"
            label="Export JSON"
            icon="💾"
            hint="Download a backup"
            accepts={isGraveyard}
            onDrop={() => {
              downloadFile(`project-graveyard-${localDate()}.json`, JSON.stringify({ version: 1, projects }, null, 2), 'application/json')
              toast(`💾 Backed up ${plural(projects.length)}.`)
            }}
          />
          <ActionZone
            id="load-demo"
            label="Load demo projects"
            icon="🎭"
            tone="violet"
            hint="Replaces what’s here (you can undo)"
            accepts={isGraveyard}
            onDrop={() => replaceWith(resetDemo, '🎭 Demo projects loaded.')}
          />
          <ActionZone
            id="empty"
            label="Empty the graveyard"
            icon="🧹"
            tone="danger"
            hint="Removes every project (you can undo)"
            accepts={isGraveyard}
            onDrop={() => replaceWith(clearAll, '🧹 The graveyard is empty.')}
          />
          {/* Import takes a file card (chosen below) or a file dragged straight from the desktop. */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setFileOver(true)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFileOver(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setFileOver(false)
              const file = e.dataTransfer.files[0]
              if (file) importJson(file)
            }}
          >
            <ActionZone
              id="import"
              label="Import JSON"
              icon="📥"
              tone="emerald"
              hint={fileOver ? 'Release to import' : 'Drop a backup file or file card here'}
              className={cx('h-full', fileOver && 'scale-[1.02] border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500')}
              accepts={(p) => p.kind === 'backup-file' && pending !== null}
              onDrop={() => {
                if (pending) importJson(pending)
                setPending(null)
              }}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
        <label htmlFor="import-file" className="cursor-pointer text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
          No file manager handy? Choose a backup file to get its card →
        </label>
        <input
          id="import-file"
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            // Reset so picking the same file again still fires a change.
            e.target.value = ''
            if (file) setPending(file)
          }}
        />
        {pending && (
          <DataCard id="backup-file" payload={{ kind: 'backup-file' }} label={`Backup file ${pending.name}`} className="sm:ml-auto">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-surface p-2.5 pr-8 text-sm shadow-sm">
              <span aria-hidden>🗂️</span>
              <span className="truncate">{pending.name}</span>
              <span className="shrink-0 text-xs text-muted">{Math.max(1, Math.round(pending.size / 1024))} KB</span>
            </div>
          </DataCard>
        )}
      </div>
      {msg && (
        <p role="status" className="mt-3 text-xs text-muted">
          {msg}
        </p>
      )}
    </div>
  )
}
