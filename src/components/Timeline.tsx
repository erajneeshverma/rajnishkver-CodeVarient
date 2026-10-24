import { Archive, Eye, FolderGit2, Milestone, Pause, Play, Shovel, Signpost, StickyNote, Zap } from 'lucide-react'
import { ActionZone, DataCard } from '../canvas/Canvas'
import { useState, type ComponentType } from 'react'
import { cx, dateInputToISO, formatDate, todayISO } from '../lib/util'
import { useGraveyard } from '../store/useGraveyard'
import { toast } from '../store/useToast'
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
  const { logEvent, removeEvent, restoreEvent } = useGraveyard()
  const [text, setText] = useState('')
  const [type, setType] = useState<'milestone' | 'note'>('milestone')
  const [date, setDate] = useState(todayISO())
  const events = [...project.events].sort((a, b) => a.at.localeCompare(b.at))
  const ready = Boolean(text.trim() && date && date <= todayISO())
  const meta = icons[type]
  const DraftIcon = meta.icon

  const add = () => {
    if (!ready) return
    logEvent(project.id, type, text.trim(), dateInputToISO(date))
    toast(type === 'milestone' ? '📍 Milestone added to the timeline.' : '📝 Note added to the timeline.')
    setText('')
  }

  return (
    <div>
      <ActionZone
        bare
        id="timeline"
        label="the timeline"
        tone="lantern"
        accepts={(p) => p.kind === 'new-event' && p.id === project.id}
        onDrop={add}
        className="p-3"
      >
        <ol className="relative ml-3 border-l border-line">
          {events.map((ev) => {
            const m = icons[ev.type]
            const Icon = m.icon
            const entry = (
              <div className="min-w-0">
                <p className="text-sm">{ev.text}</p>
                <p className="text-xs text-muted">
                  {m.label} · {formatDate(ev.at)}
                </p>
              </div>
            )
            return (
              <li key={ev.id} className="relative mb-4 pl-6 last:mb-0">
                <span className={cx('absolute -left-3 grid size-6 place-items-center rounded-full border border-line bg-surface', m.color)}>
                  <Icon className="size-3.5" />
                </span>
                {ev.type === 'milestone' || ev.type === 'note' ? (
                  <DataCard id={`event-${ev.id}`} payload={{ kind: 'event', id: project.id, eventId: ev.id }} label={`${m.label}: ${ev.text}`} className="rounded-md pr-7">
                    {entry}
                  </DataCard>
                ) : (
                  entry
                )}
              </li>
            )
          })}
        </ol>
      </ActionZone>

      <ActionZone
        id="erase-event"
        label="Erase an entry"
        icon="🧽"
        tone="danger"
        hint="Drag one of your milestones or notes here to remove it"
        className="mt-2 py-2"
        accepts={(p) => p.kind === 'event' && p.id === project.id}
        onDrop={(p) => {
          if (p.kind !== 'event') return
          const ev = project.events.find((e) => e.id === p.eventId)
          if (!ev) return
          removeEvent(project.id, p.eventId)
          toast('🧽 Timeline entry erased.', { label: 'Undo', run: () => restoreEvent(project.id, ev) })
        }}
      />

      <div className="mt-5 grid gap-2 border-t border-line pt-4 sm:grid-cols-[9rem_10rem_1fr]">
        <select aria-label="Entry type" className="field" value={type} onChange={(e) => setType(e.target.value as 'milestone' | 'note')}>
          <option value="milestone">Milestone</option>
          <option value="note">Note</option>
        </select>
        <input aria-label="Entry date" type="date" required className="field" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        <input aria-label="What happened" className="field" placeholder="What happened?" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="mt-2">
        {ready ? (
          <DataCard id={`new-event-${project.id}`} payload={{ kind: 'new-event', id: project.id }} label={`New ${type}: ${text.trim()}`}>
            <div className="flex items-center gap-3 rounded-lg border border-lantern/60 bg-surface p-2.5 pr-8 text-sm shadow-sm">
              <span className={cx('grid size-6 shrink-0 place-items-center rounded-full border border-line', meta.color)}>
                <DraftIcon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate">{text.trim()}</span>
              <span className="shrink-0 text-xs text-muted">{formatDate(dateInputToISO(date))}</span>
            </div>
            <p className="mt-1 text-center text-xs text-muted">↑ Drag this card onto the timeline</p>
          </DataCard>
        ) : (
          <p className="rounded-lg border border-dashed border-line p-2.5 text-center text-xs text-muted">
            Describe a milestone or note and its card appears here, ready to drag onto the timeline.
          </p>
        )}
      </div>
    </div>
  )
}
