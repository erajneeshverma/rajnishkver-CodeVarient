/**
 * The graveyard as an actual canvas: tombstones stand in a field where you can
 * rearrange them, and the action zones sit around its edges. Everything happens
 * by dragging a tombstone somewhere.
 */
import { useDndMonitor } from '@dnd-kit/core'
import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionZone, DataCard, type DropInfo, type Payload, type Tone } from '../canvas/Canvas'
import type { FxKind } from '../canvas/fx'
import { appConfig, causes, paths } from '../config'
import { advise } from '../engine/advisor'
import { downloadMarkdown } from '../lib/postmortem'
import { cx, effectiveStatus } from '../lib/util'
import { useGraveyard } from '../store/useGraveyard'
import { toast } from '../store/useToast'
import type { Project } from '../types'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Where a stone stands if the user hasn't placed it: a loose, slightly staggered grid
 * with as many columns as the field is wide enough for (two on a phone).
 */
function defaultSpot(i: number, n: number, fieldWidth: number) {
  const fit = Math.max(2, Math.floor(fieldWidth / 190))
  const cols = Math.min(fit, Math.max(2, Math.ceil(Math.sqrt(n * 1.6))))
  const rows = Math.ceil(n / cols)
  const col = i % cols
  const row = Math.floor(i / cols)
  const jitter = ((i * 37) % 7) / 100 - 0.03
  return {
    x: clamp((col + 0.5) / cols + (row % 2 ? 0.04 : -0.04), 0.1, 0.9),
    y: clamp((row + 0.5) / Math.max(rows, 2) + jitter, 0.14, 0.86),
  }
}

interface ZoneSpec {
  id: string
  label: string
  icon: string
  hint: string
  tone: Tone
  fx: FxKind
  accepts: (p: Project) => boolean
  run: (p: Project) => void
}

export function GraveyardCanvas({ projects }: { projects: Project[] }) {
  const navigate = useNavigate()
  const store = useGraveyard()
  const { positions, place, remove, restore, hauntIn, decide, put } = store
  const fieldRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [fieldWidth, setFieldWidth] = useState(800)
  useLayoutEffect(() => {
    const el = fieldRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setFieldWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const snapshotUndo = (before: Project) => ({ label: 'Undo', run: () => put(before) })

  const zones: { left: ZoneSpec[]; right: ZoneSpec[] } = {
    left: [
      {
        id: 'seance',
        label: 'Séance',
        icon: '🔮',
        hint: 'Ask the advisor',
        tone: 'lantern',
        fx: 'spark',
        accepts: () => true,
        run: (p) => navigate(`/project/${p.id}#advisor`),
      },
      {
        id: 'postmortem',
        label: 'Post-mortem',
        icon: '📄',
        hint: 'Download its report',
        tone: 'neutral',
        fx: 'paper',
        accepts: () => true,
        run: (p) => {
          downloadMarkdown(p)
          toast(`📄 ${p.name}’s post-mortem downloaded.`)
        },
      },
      {
        id: 'resurrect',
        label: 'Resurrection Circle',
        icon: '⚡',
        hint: 'Revive with the advisor’s best path',
        tone: 'emerald',
        fx: 'revive',
        accepts: (p) => p.status !== 'revived',
        run: (p) => {
          const advice = advise(p, appConfig)
          const best = advice.find((a) => paths.find((x) => x.id === a.path)?.resultStatus === 'revived') ?? advice[0]
          const cfg = paths.find((x) => x.id === best.path)!
          decide(p.id, { path: cfg.id, suggested: advice[0].path, nextSteps: cfg.nextSteps })
          toast(`⚡ ${p.name} rises: ${cfg.label}. Its next steps are on its page.`, snapshotUndo(p))
        },
      },
    ],
    right: [
      {
        id: 'haunting-ground',
        label: 'Haunting Ground',
        icon: '👻',
        hint: 'Remind me in 30 days',
        tone: 'violet',
        fx: 'ghost',
        accepts: (p) => p.status === 'resting',
        run: (p) => {
          hauntIn(p.id, 30)
          toast(`👻 ${p.name} will haunt you in 30 days.`, snapshotUndo(p))
        },
      },
      {
        id: 'exhume-field',
        label: 'Exhume',
        icon: '⚰️',
        hint: 'Delete it (you can undo)',
        tone: 'danger',
        fx: 'dust',
        accepts: () => true,
        run: (p) => {
          const index = useGraveyard.getState().projects.findIndex((x) => x.id === p.id)
          remove(p.id)
          toast(`⚰️ ${p.name} was exhumed.`, { label: 'Undo', run: () => restore(p, index) })
        },
      },
      {
        id: 'eternal-rest',
        label: 'Eternal Rest',
        icon: '🪦',
        hint: 'Archive it, R.I.P.',
        tone: 'danger',
        fx: 'rest',
        accepts: (p) => p.status !== 'rip',
        run: (p) => {
          decide(p.id, { path: 'archive', suggested: advise(p, appConfig)[0].path, nextSteps: [], epitaph: '' })
          toast(`🪦 ${p.name} rests in peace. Add its epitaph on its page.`, snapshotUndo(p))
        },
      },
    ],
  }

  const find = (pl: Payload) => (pl.kind === 'project' ? projects.find((x) => x.id === pl.id) : undefined)
  const renderZone = (z: ZoneSpec) => (
    <ActionZone
      key={z.id}
      bare
      id={z.id}
      label={z.label}
      tone={z.tone}
      fx={z.fx}
      overText={`Release: ${z.hint.toLowerCase()}`}
      className={cx('flex-1 bg-surface/70 p-2 backdrop-blur-sm lg:p-3', z.id === 'resurrect' && 'rounded-[2rem]')}
      accepts={(pl) => {
        const p = find(pl)
        return Boolean(p && z.accepts(p))
      }}
      onDrop={(pl) => {
        const p = find(pl)
        if (p) z.run(p)
      }}
    >
      <div className="flex h-full flex-col items-center justify-center gap-1 py-2 text-center">
        <span aria-hidden className="text-2xl drop-shadow lg:text-4xl">
          {z.icon}
        </span>
        <span className="font-display text-xs font-semibold leading-tight sm:text-sm lg:text-base">{z.label}</span>
        <span className="hidden text-xs text-muted sm:block">{z.hint}</span>
      </div>
    </ActionZone>
  )

  const move = (pl: Payload, info: DropInfo) => {
    const rect = fieldRef.current?.getBoundingClientRect()
    if (!rect || pl.kind !== 'project') return
    place(pl.id, { x: clamp((info.x - rect.left) / rect.width, 0.08, 0.92), y: clamp((info.y - rect.top) / rect.height, 0.12, 0.88) })
  }

  return (
    <section ref={sectionRef} aria-label="Graveyard canvas" className="relative">
      <div className="grid gap-3 lg:grid-cols-[11rem_1fr_11rem]">
        <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-col">{zones.left.map(renderZone)}</div>

        <ActionZone
          bare
          id="field"
          label="the field"
          priority={-1}
          fx={null}
          tone="neutral"
          overText=""
          accepts={(pl) => Boolean(find(pl))}
          onDrop={move}
          className="border-solid border-line p-0"
        >
          <div ref={fieldRef} className="relative h-[26rem] overflow-hidden rounded-[10px] sm:h-[30rem] lg:h-[34rem]">
            <Scenery />
            {projects.map((p, i) => {
              const pos = positions[p.id] ?? defaultSpot(i, projects.length, fieldWidth)
              return (
                <div
                  key={p.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-300 ease-out"
                  // Keep the whole stone inside the field, whatever the screen width.
                  style={{ left: `clamp(3.75rem, ${pos.x * 100}%, calc(100% - 3.75rem))`, top: `clamp(3rem, ${pos.y * 100}%, calc(100% - 3rem))` }}
                >
                  <Stone project={p} />
                </div>
              )
            })}
            {projects.length === 0 && (
              <p className="absolute inset-0 grid place-items-center text-sm text-muted">Nothing matches. The field is quiet.</p>
            )}
          </div>
        </ActionZone>

        <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-col">{zones.right.map(renderZone)}</div>
      </div>
      <DragHint containerRef={sectionRef} enabled={projects.length > 0} />
      <p className="mt-2 text-center text-xs text-muted">
        Drag a tombstone into a zone to act on it, or drop it anywhere in the field to rearrange your graveyard. Click one to open it.
      </p>
    </section>
  )
}

function Stone({ project }: { project: Project }) {
  const status = effectiveStatus(project)
  const cause = causes.find((c) => c.id === project.cause)
  const face = (
    <div
      className={cx(
        'tombstone relative w-28 border px-2.5 pb-2.5 pt-5 text-center shadow-lg transition sm:w-40 sm:px-3 sm:pb-3 sm:pt-6',
        status === 'rip' && 'rotate-[-3deg] border-line bg-stone opacity-75 grayscale',
        status === 'revived' && 'border-emerald-500/60 bg-stone shadow-emerald-500/20',
        status === 'haunting' && 'border-violet-500/60 bg-stone shadow-violet-500/30',
        status === 'resting' && 'border-line bg-stone',
      )}
    >
      {status === 'haunting' && (
        <span aria-hidden className="absolute -top-4 right-2 animate-bounce text-xl">
          👻
        </span>
      )}
      {status === 'revived' && (
        <span aria-hidden className="absolute -top-4 right-2 text-xl">
          ⚡
        </span>
      )}
      <p className="font-display text-[9px] tracking-[0.28em] text-muted">{status === 'rip' ? 'R.I.P.' : status === 'revived' ? 'RISEN' : 'HERE LIES'}</p>
      <p className="mt-0.5 truncate font-display text-xs font-semibold sm:text-sm">{project.name}</p>
      <p className="truncate text-[10px] text-muted sm:text-[11px]">
        <span aria-hidden>{cause?.emoji}</span> {cause?.label}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-lantern" style={{ width: `${project.completion}%` }} />
      </div>
    </div>
  )
  return (
    <DataCard id={`stone-${project.id}`} payload={{ kind: 'project', id: project.id }} label={project.name} handle preview={() => face}>
      <Link to={`/project/${project.id}`} className="block rounded-[inherit] hover:brightness-110" draggable={false}>
        {face}
      </Link>
    </DataCard>
  )
}

/** Moon, hills and fog. Decorative only. */
function Scenery() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-b from-[#dfe6f0] via-[#ece8dd] to-[#dcd8c4] dark:from-[#121a2b] dark:via-[#141a24] dark:to-[#1a1f17]" />
      <div className="absolute right-[12%] top-[8%] size-16 rounded-full bg-[#f6efd2] opacity-80 shadow-[0_0_60px_20px_rgba(246,239,210,0.25)]" />
      <svg className="absolute inset-x-0 bottom-0 h-1/3 w-full" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path d="M0 18 Q 20 8 40 16 T 75 13 T 100 15 V30 H0Z" className="fill-[#c9cfae] dark:fill-[#1f2a1c]" opacity="0.9" />
        <path d="M0 24 Q 25 17 50 23 T 100 21 V30 H0Z" className="fill-[#b9c098] dark:fill-[#243121]" />
      </svg>
      <div className="absolute inset-x-0 bottom-[18%] h-16 animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent blur-xl" />
    </div>
  )
}

/**
 * First visit only: a ghost tombstone glides from the first stone to the
 * Resurrection Circle to show the gesture. Gone as soon as anything is dragged.
 */
function DragHint({ containerRef, enabled }: { containerRef: React.RefObject<HTMLElement | null>; enabled: boolean }) {
  const seen = useGraveyard((s) => s.hintsSeen.includes('canvas'))
  const seeHint = useGraveyard((s) => s.seeHint)
  const [path, setPath] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null)
  const show = enabled && !seen

  useDndMonitor({ onDragStart: () => show && seeHint('canvas') })

  useLayoutEffect(() => {
    if (!show) return
    const measure = () => {
      const field = containerRef.current?.getBoundingClientRect()
      const stone = containerRef.current?.querySelector('[data-card]')?.getBoundingClientRect()
      const zone = document.querySelector('[data-zone="resurrect"]')?.getBoundingClientRect()
      if (!field || !stone || !zone) return
      setPath({
        from: { x: stone.left + stone.width / 2 - field.left, y: stone.top + stone.height / 2 - field.top },
        to: { x: zone.left + zone.width / 2 - field.left, y: zone.top + zone.height / 2 - field.top },
      })
    }
    const t = setTimeout(measure, 400)
    return () => clearTimeout(t)
  }, [show, containerRef])

  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => seeHint('canvas'), 9000)
    return () => clearTimeout(t)
  }, [show, seeHint])

  return (
    <AnimatePresence>
      {show && path && (
        <m.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-20 -translate-x-1/2 -translate-y-1/2"
          initial={{ x: path.from.x, y: path.from.y, opacity: 0 }}
          animate={{ x: [path.from.x, path.from.x, path.to.x, path.to.x], y: [path.from.y, path.from.y, path.to.y, path.to.y], opacity: [0, 0.9, 0.9, 0] }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 2.6, times: [0, 0.15, 0.8, 1], repeat: 2, repeatDelay: 0.4, ease: 'easeInOut' }}
        >
          <HintGhost />
        </m.div>
      )}
    </AnimatePresence>
  )
}

function HintGhost(): ReactNode {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="tombstone h-16 w-14 border-2 border-dashed border-lantern bg-lantern-soft" />
      <span className="rounded-full bg-lantern px-2 py-0.5 text-[11px] font-semibold text-on-lantern shadow-lg">drag me ✋</span>
    </div>
  )
}
