import { m } from 'framer-motion'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataCard } from '../canvas/Canvas'
import { ProjectChip } from './ProjectChip'
import { causes } from '../config'
import { effectiveStatus, formatDate, relativeTime } from '../lib/util'
import type { Project } from '../types'
import { Progress, StatusBadge } from './ui'

export function Tombstone({ project }: { project: Project }) {
  const status = effectiveStatus(project)
  const cause = causes.find((c) => c.id === project.cause)
  const startYear = new Date(project.startedAt).getFullYear()
  const endYear = new Date(project.lastTouchedAt).getFullYear()

  return (
    <m.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <DataCard
        id={`tomb-${project.id}`}
        payload={{ kind: 'project', id: project.id }}
        label={project.name}
        className="h-full"
        hint={false}
        preview={() => <ProjectChip project={project} className="w-60 shadow-2xl" />}
      >
      <Link
        to={`/project/${project.id}`}
        className="tombstone group relative flex h-full flex-col border border-line bg-stone px-5 pb-5 pt-10 text-center shadow-sm transition hover:-translate-y-1 hover:border-lantern/60 hover:shadow-lg hover:shadow-lantern/5"
      >
        <span className="absolute left-1/2 top-4 -translate-x-1/2 font-display text-xs tracking-[0.3em] text-muted">
          {status === 'rip' ? 'R.I.P.' : status === 'revived' ? 'RISEN' : 'HERE LIES'}
        </span>
        <h3 className="mt-2 font-display text-xl font-semibold group-hover:text-lantern">{project.name}</h3>
        <p className="mt-0.5 text-xs text-muted">
          {startYear === endYear ? startYear : `${startYear} – ${endYear}`}
        </p>
        <p className="mt-3 line-clamp-2 text-sm text-muted">{project.description}</p>

        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-muted">
            <span aria-hidden>{cause?.emoji}</span>
            <span>{cause?.label}</span>
          </div>
          <Progress value={project.completion} />
          <div className="mt-1.5 flex justify-between text-xs text-muted">
            <span>{project.completion}% done</span>
            <span>touched {relativeTime(project.lastTouchedAt)}</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <StatusBadge status={status} />
            {project.hauntAt && status === 'resting' && (
              <span className="inline-flex items-center gap-1 text-xs text-muted" title={`Haunts you on ${formatDate(project.hauntAt)}`}>
                <Bell className="size-3" /> {relativeTime(project.hauntAt)}
              </span>
            )}
          </div>
        </div>
      </Link>
      </DataCard>
    </m.div>
  )
}
