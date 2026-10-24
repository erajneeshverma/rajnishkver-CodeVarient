import { causes } from '../config'
import { cx, effectiveStatus } from '../lib/util'
import type { Project } from '../types'
import { Progress, StatusBadge } from './ui'

/** The compact "data card" face of a project, used wherever it can be dragged. */
export function ProjectChip({ project, className }: { project: Project; className?: string }) {
  const cause = causes.find((c) => c.id === project.cause)
  return (
    <div className={cx('tombstone w-full max-w-[15rem] border border-line bg-stone px-4 pb-4 pt-7 text-center', className)}>
      <p className="font-display text-[10px] tracking-[0.3em] text-muted">HERE LIES</p>
      <p className="mt-1 truncate font-display text-lg font-semibold">{project.name}</p>
      <p className="mt-1 text-xs text-muted">
        <span aria-hidden>{cause?.emoji}</span> {cause?.label}
      </p>
      <Progress value={project.completion} className="mt-3" />
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
        <span>{project.completion}% done</span>
        <StatusBadge status={effectiveStatus(project)} />
      </div>
    </div>
  )
}
