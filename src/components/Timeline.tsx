import { Archive, Eye, Flag, FolderGit2, Milestone, Pause, Play, Shovel, Signpost, StickyNote, Trash2, Zap } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { cx, formatDate, todayISO } from '../lib/util'
import { useGraveyard } from '../store/useGraveyard'
import type { EventType, Project } from '../types'

const icons: Record<EventType, { icon: ComponentType<{ className?: string }>; color: string; label: string }> = {
  started: { icon: Play, color: 'text-emerald-500', label: 'Started' },
  milestone: { icon: Milestone, color: 'text-lantern', label: 'Milestone' },
  abandoned: { icon: Pause, color: 'text-slate-400', label: 'Abandoned' },
  buried: { icon: Shovel, color: 'text-muted', label: 'Buried' },
  imported: { icon: FolderGit2, color: 'text-muted', label: 'Imported' },
  assessed: { icon: Eye, color: 'text-violet-400', label: 'Assessed' },
  revisited: { icon: Eye, color: 'text-violet-400', label: 'Revisited' },
  decided: { icon: Signpost, color: 'text-lantern', label: 'Decided' },
  revived: { icon: Zap, color: 'text-emerald-400', label: 'Revived' },
  archived: { icon: Archive, color: 'text-rose-400', label: 'Archived' },
  note: { icon: StickyNote, color: 'text-muted', label: 'Note' },
}

export function Timeline({ project }: { project: Project }) {
  const { logEvent, removeEvent } = useGraveyard()
  const [text, setText] = useState('')
  const [type, setType] = useState<'milestone' | 'note'>('milestone')
  const [date, setDate] = useState(todayISO())
  const events = [...project.events].sort((a, b) => a.at.localeCompare(b.at))

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    logEvent(project.id, type, text.trim(), new Date(date + 'T12:00:00').toISOString())
    setText('')
  }

  return (
    <div>
      <ol className="relative ml-3 border-l border-line">
        {events.map((ev) => {
          const meta = icons[ev.type]
          const Icon = meta.icon
          return (
            <li key={ev.id} className="group relative mb-5 pl-6 last:mb-0">
              <span className={cx('absolute -left-3 grid size-6 place-items-center rounded-full border border-line bg-surface', meta.color)}>
                <Icon className="size-3.5" />
              </span>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm">{ev.text}</p>
                  <p className="text-xs text-muted">
                    {meta.label} · {formatDate(ev.at)}
                  </p>
                </div>
                {(ev.type === 'milestone' || ev.type === 'note') && (
                  <button
                    type="button"
                    aria-label="Delete entry"
                    onClick={() => removeEvent(project.id, ev.id)}
                    className="rounded p-1 text-muted opacity-0 transition hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <form onSubmit={add} className="mt-6 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <select aria-label="Entry type" className="field sm:w-36" value={type} onChange={(e) => setType(e.target.value as 'milestone' | 'note')}>
          <option value="milestone">Milestone</option>
          <option value="note">Note</option>
        </select>
        <input aria-label="Entry date" type="date" className="field sm:w-40" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        <input aria-label="What happened" className="field" placeholder="What happened?" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn-ghost shrink-0" disabled={!text.trim()}>
          <Flag className="size-4" /> Add
        </button>
      </form>
    </div>
  )
}
