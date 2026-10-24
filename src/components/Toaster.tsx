import { useDndMonitor } from '@dnd-kit/core'
import { AnimatePresence, m } from 'framer-motion'
import { Undo2, X } from 'lucide-react'
import { ActionZone, DataCard, type Payload } from '../canvas/Canvas'
import { useToast } from '../store/useToast'

const undoId = (e: { active: { data: { current?: unknown } } }) => {
  const p = (e.active.data.current as { payload?: Payload } | undefined)?.payload
  return p?.kind === 'undo' ? p.toast : null
}

/**
 * Toasts sit bottom-right and let the pointer through, so they never block a card.
 * An undoable toast is itself a card: drag it into the Undo zone below the stack (Canvas Protocol).
 * The zone sits at the bottom so it never moves when older toasts expire.
 */
export function Toaster() {
  const { toasts, dismiss, runAction, hold, release } = useToast()
  const undoable = toasts.some((t) => t.action)

  // While a change is being dragged to Undo, freeze every toast so nothing shifts or expires.
  const all = (fn: (id: number) => void) => useToast.getState().toasts.forEach((t) => fn(t.id))
  useDndMonitor({
    onDragStart: (e) => undoId(e) !== null && all(hold),
    onDragEnd: (e) => undoId(e) !== null && all(release),
    onDragCancel: (e) => undoId(e) !== null && all(release),
  })

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:left-auto sm:items-end">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const body = (
            <div className="w-full rounded-xl border border-line bg-surface/95 py-2 pl-3 pr-7 text-sm shadow-2xl backdrop-blur">
              <span className="block leading-snug">{t.message}</span>
              {t.action && (
                <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-lantern">
                  <Undo2 aria-hidden className="size-3.5" /> Drag me into Undo to take it back
                </span>
              )}
            </div>
          )
          return (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              role="status"
              className={t.action ? 'pointer-events-auto relative w-full max-w-xs' : 'relative w-full max-w-xs'}
            >
              {t.action ? (
                <DataCard id={`toast-${t.id}`} payload={{ kind: 'undo', toast: t.id }} label={`${t.message} Undoable change`} hint={false} preview={() => <div className="w-72">{body}</div>}>
                  {body}
                </DataCard>
              ) : (
                body
              )}
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="pointer-events-auto absolute right-2 top-2 rounded p-0.5 text-muted hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </m.div>
          )
        })}
        {undoable && (
          <m.div key="undo-zone" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-auto w-full max-w-xs">
            <ActionZone
              id="undo"
              label="Undo"
              icon={<Undo2 className="size-4" />}
              hint="Drop the change here"
              tone="lantern"
              fx="spark"
              className="bg-surface/95 py-1.5 shadow-xl backdrop-blur"
              accepts={(p) => p.kind === 'undo' && toasts.some((t) => t.id === p.toast && t.action)}
              onDrop={(p) => p.kind === 'undo' && runAction(p.toast)}
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
