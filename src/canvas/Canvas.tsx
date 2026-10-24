/**
 * The Canvas Protocol: primary actions happen by dragging a data card into an
 * action zone. Works with mouse, touch and keyboard (focus a card, Space to pick
 * it up, arrow keys to jump between zones, Space to drop, Esc to cancel).
 */
import {
  closestCenter,
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
import { createContext, useContext, useState, type ReactNode } from 'react'
import { cx } from '../lib/util'

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

interface CardData {
  payload: Payload
  label: string
  preview: () => ReactNode
}

interface ZoneData {
  label: string
  accepts: (p: Payload) => boolean
  onDrop: (p: Payload) => void
}

/**
 * Mouse and touch: only the zone actually under the pointer counts, so dropping on
 * empty canvas does nothing. Keyboard drags have no pointer, so use the nearest zone.
 */
const collision: CollisionDetection = (args) => (args.pointerCoordinates ? pointerWithin(args) : closestCenter(args))

/** Arrow keys jump straight to the next enabled zone instead of nudging pixels. */
const jumpBetweenZones: KeyboardCoordinateGetter = (event, { context }) => {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
  if (!keys.includes(event.code)) return undefined
  event.preventDefault()
  const zones = context.droppableContainers
    .getEnabled()
    .map((c) => ({ id: c.id, rect: context.droppableRects.get(c.id) }))
    .filter((z): z is { id: typeof z.id; rect: NonNullable<typeof z.rect> } => Boolean(z.rect))
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
  if (!zones.length) return undefined
  const forward = event.code === 'ArrowRight' || event.code === 'ArrowDown'
  const current = zones.findIndex((z) => z.id === context.over?.id)
  const next = zones[current === -1 ? (forward ? 0 : zones.length - 1) : (current + (forward ? 1 : -1) + zones.length) % zones.length]
  const active = context.active ? context.collisionRect : null
  const w = active?.width ?? 0
  const h = active?.height ?? 0
  return { x: next.rect.left + next.rect.width / 2 - w / 2, y: next.rect.top + next.rect.height / 2 - h / 2 }
}

const CanvasState = createContext<{ dragging: CardData | null }>({ dragging: null })
export const useCanvas = () => useContext(CanvasState)

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState<CardData | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: jumpBetweenZones }),
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
    if (card && zone?.accepts(card.payload)) zone.onDrop(card.payload)
  }

  return (
    <CanvasState.Provider value={{ dragging }}>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        // Zones can move while a card is held (page scroll, toasts, sticky panels), so keep their positions fresh.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
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
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
          {dragging ? <div className="rotate-2 scale-105 cursor-grabbing shadow-2xl shadow-black/40">{dragging.preview()}</div> : null}
        </DragOverlay>
      </DndContext>
    </CanvasState.Provider>
  )
}

/** A card the user can pick up. Children are the card face; `preview` is what follows the pointer. */
export function DataCard({
  id,
  payload,
  label,
  children,
  preview,
  className,
  hint = true,
}: {
  id: string
  payload: Payload
  label: string
  children: ReactNode
  preview?: () => ReactNode
  className?: string
  hint?: boolean
}) {
  const render = preview ?? (() => <div className={cx('card p-4', className)}>{children}</div>)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { payload, label, preview: render } satisfies CardData })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`${label}. Drag into an action zone.`}
      className={cx(
        'group relative cursor-grab touch-manipulation select-none outline-none transition',
        'focus-visible:ring-2 focus-visible:ring-lantern',
        isDragging && 'opacity-30',
        className,
      )}
    >
      {hint && (
        <GripVertical aria-hidden className="absolute right-2 top-2 size-4 text-muted opacity-60 transition group-hover:opacity-100" />
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
}: {
  id: string
  label: string
  accepts: (p: Payload) => boolean
  onDrop: (p: Payload) => void
  tone?: Tone
  icon?: ReactNode
  hint?: ReactNode
  children?: ReactNode
  className?: string
  /** Render only the children (for zones with their own layout) */
  bare?: boolean
  /** Shown over a bare zone while a card hovers it */
  overText?: string
}) {
  const { active } = useDndContext()
  const payload = (active?.data.current as CardData | undefined)?.payload
  const ready = Boolean(payload && accepts(payload))
  const { setNodeRef, isOver } = useDroppable({ id, disabled: Boolean(payload) && !ready, data: { label, accepts, onDrop } satisfies ZoneData })
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
      {bare && over && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-bg/60 text-sm font-semibold backdrop-blur-[1px]">
          {overText ?? `Release to drop into ${label}`}
        </span>
      )}
    </div>
  )
}
