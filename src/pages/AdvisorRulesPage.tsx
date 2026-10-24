import { Download, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Modal, Section } from '../components/ui'
import { causes, paths, rules, type Condition } from '../config'
import { useGraveyard } from '../store/useGraveyard'
import type { Project } from '../types'

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">How the Revival Advisor thinks</h1>
        <p className="mt-1 max-w-2xl text-muted">
          No black box. Each project is turned into six signals, and every rule below adds or removes points from one revival
          path. The path with the most points is recommended, and each point comes with the sentence you see on the project page.
        </p>
      </div>

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
        <Section title="Your data">
          <DataTools />
        </Section>
      </div>
    </div>
  )
}

function DataTools() {
  const { projects, replaceAll, resetDemo, clearAll } = useGraveyard()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, projects }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `project-graveyard-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as { projects?: Project[] }
      if (!Array.isArray(data.projects) || data.projects.some((p) => !p.id || !p.name || !p.assessment)) throw new Error()
      replaceAll(data.projects)
      setMsg(`Imported ${data.projects.length} projects.`)
    } catch {
      setMsg('That file doesn’t look like a graveyard export.')
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <p className="mb-3 text-muted">Everything is stored in this browser only. Export to back it up or move it.</p>
      <button type="button" className="btn-ghost w-full" onClick={exportJson}>
        <Download className="size-4" /> Export JSON
      </button>
      <button type="button" className="btn-ghost w-full" onClick={() => fileRef.current?.click()}>
        <Upload className="size-4" /> Import JSON
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
      />
      <button type="button" className="btn-ghost w-full" onClick={() => setConfirm('reset')}>
        <RotateCcw className="size-4" /> Load demo projects
      </button>
      <button type="button" className="btn-danger w-full" onClick={() => setConfirm('clear')}>
        Empty the graveyard
      </button>
      {msg && (
        <p role="status" className="text-xs text-muted">
          {msg}
        </p>
      )}
      <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'reset' ? 'Load demo projects?' : 'Empty the graveyard?'}>
        <p className="text-sm text-muted">This replaces all {projects.length} projects currently in your graveyard.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirm(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (confirm === 'reset') resetDemo()
              else clearAll()
              setConfirm(null)
            }}
          >
            Replace
          </button>
        </div>
      </Modal>
    </div>
  )
}
