import { AnimatePresence, m } from 'framer-motion'
import { X } from 'lucide-react'
import { useToast } from '../store/useToast'

/** Toasts sit bottom-right and let the pointer through (except their buttons), so they never block a card. */
export function Toaster() {
  const { toasts, dismiss } = useToast()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:left-auto sm:items-end">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <m.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            role="status"
            className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-surface/95 px-4 py-3 text-sm shadow-2xl backdrop-blur"
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="pointer-events-auto font-medium text-lantern hover:underline"
                onClick={() => {
                  t.action!.run()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="pointer-events-auto text-muted hover:text-ink">
              <X className="size-4" />
            </button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
