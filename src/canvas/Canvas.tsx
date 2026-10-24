/**
 * The Canvas Protocol: primary actions happen by dragging a data card into an
 * action zone. Works with mouse, touch and keyboard (focus a card, Space to pick
 * it up, arrow keys to jump between zones, Space to drop, Esc to cancel).
 */
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  pointerWithin,
  TouchSensor,
  MouseSensor,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cx } from '../lib/util'
import { useFx, type FxKind } from './fx'
import { FxLayer } from './FxLayer'

/** What is being dragged. */
export type Payload =
  | { kind: 'project'; id: string }
  | { kind: 'draft' }
  | { kind: 'decision'; id: string }
  | { kind: 'new-salvage'; id: string }
  | { kind: 'salvage'; id: string; itemId: string }
  | { kind: 'new-event'; id: string }
  | { kind: 'event'; id: string; eventId: string }
  | { kind: 'graveyard' }
  | { kind: 'assessment'; id: string }
  | { kind: 'backup-file' }
  | { kind: 'tag'; value: string }

interface CardData {
  payload: Payload
  label: string
  preview: () => ReactNode
}

/** Where the dragged card ended up, in viewport coordinates (centre of the card). */
export interface DropInfo {
  x: number
  y: number
}

interface ZoneData {
  label: string
  accepts: (p: Payload) => boolean
  onDrop: (p: Payload, info: DropInfo) => void
  fx?: FxKind
  /** Background zones (like an open field) lose to any zone layered on top of them. */
  priority: number
}

const priorityOf = (c: { data: { current?: unknown } }) => ((c.data.current as ZoneData | undefined)?.priority ?? 0)

/**
 * Mouse and touch: only the zone actually under the pointer counts, so dropping on
 * empty canvas does nothing. Keyboard: only the zone the card has been moved onto
 * (by the arrow keys) counts, so picking a card up and putting it down does nothing.
 */
const collision: CollisionDetection = (args) => {
  if (args.pointerCoordinates) {
    const hits = pointerWithin(args)
    if (hits.length < 2) return hits
    // Nested zones: the most specific one wins over the field underneath.
    const top = Math.max(...hits.map((h) => priorityOf(args.droppableContainers.find((c) => c.id === h.id)!)))
    return hits.filter((h) => priorityOf(args.droppableContainers.find((c) => c.id === h.id)!) === top)
  }
  const { collisionRect: r, droppableRects } = args
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  return args.droppableContainers
    .filter((c) => {
      const z = droppableRects.get(c.id)
      return z && cx >= z.left && cx <= z.left + z.width && cy >= z.top && cy <= z.top + z.height
    })
    .map((c) => ({ id: c.id, data: { droppableContainer: c, value: 0 } }))
}

/**
 * Arrow keys jump straight to the next enabled zone instead of nudging pixels.
 * The target zone is scrolled into view first, so the card never moves off-screen.
 */
const jumpBetweenZones: KeyboardCoordinateGetter = (event, { context }) => {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
  if (!keys.includes(event.code)) return undefined
  event.preventDefault()
  const zones = context.droppableContainers
    .getEnabled()
    .filter((c) => priorityOf(c) >= 0)
    .map((c) => ({ id: c.id, rect: context.droppableRects.get(c.id) }))
    .filter((z): z is { id: typeof z.id; rect: NonNullable<typeof z.rect> } => Boolean(z.rect))
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
  if (!zones.length) return undefined
  const forward = event.code === 'ArrowRight' || event.code === 'ArrowDown'
  const current = zones.findIndex((z) => z.id === context.over?.id)
  const next = zones[current === -1 ? (forward ? 0 : zones.length - 1) : (current + (forward ? 1 : -1) + zones.length) % zones.length]
  const node = context.droppableContainers.get(next.id)?.node.current
  node?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  const rect = node?.getBoundingClientRect() ?? next.rect
  const w = context.collisionRect?.width ?? 0
  const h = context.collisionRect?.height ?? 0
  return { x: rect.left + rect.width / 2 - w / 2, y: rect.top + Math.min(rect.height / 2, 28) - h / 2 }
}

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState<CardData | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    // Tab must not drop the card; only Space or Enter does.
    useSensor(KeyboardSensor, {
      coordinateGetter: jumpBetweenZones,
      keyboardCodes: { start: ['Space', 'Enter'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  const name = (id: unknown, data: unknown) => (data as CardData | ZoneData | undefined)?.label ?? String(id)
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${name(active.id, active.data.current)}. Use arrow keys to choose an action zone, Space to drop, Escape to cancel.`,
    onDragOver: ({ active, over }) =>
      over ? `${name(active.id, active.data.current)} is over ${name(over.id, over.data.current)}.` : `${name(active.id, active.data.current)} is not over a zone.`,
    onDragEnd: ({ active, over }) =>
      over ? `Dropped ${name(active.id, active.data.current)} on ${name(over.id, over.data.current)}.` : `Put ${name(active.id, active.data.current)} back.`,
    onDragCancel: ({ active }) => `Cancelled. ${name(active.id, active.data.current)} is back where it was.`,
  }

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current as CardData) ?? null)
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const card = e.active.data.current as CardData | undefined
    const zone = e.over?.data.current as ZoneData | undefined
    if (!card || !zone?.accepts(card.payload)) return
    const r = e.active.rect.current.translated
    const info = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 }
    zone.onDrop(card.payload, info)
    if (zone.fx) useFx.getState().play(zone.fx, info.x, info.y)
  }

  return (
    <DndContext
        sensors={sensors}
        collisionDetection={collision}
        // Zones can move while a card is held (page scroll, toasts, sticky panels), so keep their positions fresh.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        // Only scroll when the card is right at the edge, so aiming at the bottom dock doesn't move the page.
        autoScroll={{ threshold: { x: 0, y: 0.06 }, acceleration: 6 }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: 'To act on this card, press Space to pick it up, use the arrow keys to move between action zones, then press Space to drop it. Press Escape to cancel.',
          },
        }}
      >
        {children}
        <FxLayer />
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
          {dragging ? <div className="rotate-2 scale-105 cursor-grabbing shadow-2xl shadow-black/40">{dragging.preview()}</div> : null}
        </DragOverlay>
    </DndContext>
  )
}

/**
 * A card the user can pick up. Children are the card face; `preview` is what follows the pointer.
 * With `handle`, keyboard focus goes to a small grip instead of the whole card, for cards
 * that contain their own link (a draggable can't wrap another interactive element).
 */
export function DataCard({
  id,
  payload,
  label,
  children,
  preview,
  className,
  hint = true,
  handle = false,
}: {
  id: string
  payload: Payload
  label: string
  children: ReactNode
  preview?: () => ReactNode
  className?: string
  hint?: boolean
  handle?: boolean
}) {
  const render = preview ?? (() => <div className={cx('card p-4', className)}>{children}</div>)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id, data: { payload, label, preview: render } satisfies CardData })
  return (
    <div
      ref={setNodeRef}
      // Pointer and key listeners sit on the whole card; keys from the grip bubble up to them.
      {...listeners}
      {...(handle ? {} : attributes)}
      data-card={label}
      className={cx(
        'group relative cursor-grab touch-manipulation select-none outline-none transition [-webkit-touch-callout:none]',
        !handle && 'focus-visible:ring-2 focus-visible:ring-lantern',
        isDragging && 'opacity-30',
        className,
      )}
    >
      {handle ? (
        <span
          ref={setActivatorNodeRef}
          {...attributes}
          aria-label={`Move ${label}`}
          className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-md text-muted opacity-60 outline-none transition hover:bg-surface-2 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-lantern"
        >
          <GripVertical aria-hidden className="size-4" />
        </span>
      ) : (
        hint && <GripVertical aria-hidden className="absolute right-2 top-2 size-4 text-muted opacity-60 transition group-hover:opacity-100" />
      )}
      {children}
    </div>
  )
}

const tones = {
  lantern: { idle: 'border-lantern/40', ready: 'border-lantern bg-lantern-soft', over: 'border-lantern bg-lantern/20 ring-2 ring-lantern' },
  danger: { idle: 'border-rose-500/30', ready: 'border-rose-500/70 bg-rose-500/5', over: 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500' },
  violet: { idle: 'border-violet-500/30', ready: 'border-violet-500/70 bg-violet-500/5', over: 'border-violet-500 bg-violet-500/15 ring-2 ring-violet-500' },
  emerald: { idle: 'border-emerald-500/30', ready: 'border-emerald-500/70 bg-emerald-500/5', over: 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500' },
  neutral: { idle: 'border-line', ready: 'border-muted bg-surface-2/60', over: 'border-ink bg-surface-2 ring-2 ring-muted' },
}
export type Tone = keyof typeof tones

const toneFx: Record<Tone, FxKind> = { lantern: 'spark', danger: 'dust', violet: 'ghost', emerald: 'revive', neutral: 'ring' }

/** A place to drop a card. It lights up while an acceptable card is being dragged. */
export function ActionZone({
  id,
  label,
  accepts,
  onDrop,
  tone = 'lantern',
  icon,
  hint,
  children,
  className,
  bare,
  overText,
  fx,
  priority = 0,
  pulse,
}: {
  id: string
  label: string
  accepts: (p: Payload) => boolean
  onDrop: (p: Payload, info: DropInfo) => void
  tone?: Tone
  icon?: ReactNode
  hint?: ReactNode
  children?: ReactNode
  className?: string
  /** Render only the children (for zones with their own layout) */
  bare?: boolean
  /** Shown over a bare zone while a card hovers it */
  overText?: string
  /** Effect played where the card lands; defaults from the tone */
  fx?: FxKind | null
  priority?: number
  /** Draw attention while an acceptable card is being dragged (e.g. the advisor's pick) */
  pulse?: boolean
}) {
  const { active } = useDndContext()
  const payload = (active?.data.current as CardData | undefined)?.payload
  const ready = Boolean(payload && accepts(payload))
  const effect = fx === null ? undefined : (fx ?? toneFx[tone])
  const { setNodeRef, isOver } = useDroppable({ id, disabled: Boolean(payload) && !ready, data: { label, accepts, onDrop, fx: effect, priority } satisfies ZoneData })
  const t = tones[tone]
  const over = isOver && ready

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={`${label} action zone`}
      data-zone={id}
      data-ready={ready || undefined}
      className={cx(
        'relative rounded-xl border-2 border-dashed p-3 transition-all duration-150',
        over ? t.over : ready ? t.ready : t.idle,
        payload && !ready && 'opacity-40',
        over && 'scale-[1.02]',
        pulse && ready && !over && 'animate-pulse',
        className,
      )}
    >
      {!bare && (
        <>
          <div className="flex items-center gap-2 text-sm font-medium">
            {icon && (
              <span aria-hidden className="shrink-0">
                {icon}
              </span>
            )}
            <span>{label}</span>
          </div>
          {hint && <div className="mt-0.5 text-xs text-muted">{over ? 'Release to drop' : hint}</div>}
        </>
      )}
      {children}
      {bare && over && overText !== '' && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-bg/60 text-sm font-semibold backdrop-blur-[1px]">
          {overText ?? `Release to drop into ${label}`}
        </span>
      )}
    </div>
  )
}
