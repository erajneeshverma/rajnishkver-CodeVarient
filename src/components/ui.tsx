import { AnimatePresence, m } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { causes, relevanceOptions } from '../config'
import { cx, statusConfig } from '../lib/util'
import type { Relevance, StatusId } from '../types'

export function StatusBadge({ status, className }: { status: StatusId; className?: string }) {
  const s = statusConfig(status)
  return (
    <span
      title={s.description}
      className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', s.badge, className)}
    >
      <span className={cx('size-1.5 rounded-full', s.dot, status === 'haunting' && 'animate-pulse')} />
      {s.label}
    </span>
  )
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${value}% complete`}
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <div className="h-full rounded-full bg-lantern" style={{ width: `${value}%` }} />
    </div>
  )
}

/** 1–5 interest rating shown as candles. */
export function InterestPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labels = ['', 'None', 'A little', 'Some', 'Quite a lot', 'Can’t stop thinking about it']
  return (
    <div>
      <div role="radiogroup" aria-label="Interest today" className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of 5: ${labels[n]}`}
            onClick={() => onChange(n)}
            className={cx(
              'grid size-11 place-items-center rounded-lg border text-lg transition',
              n <= value ? 'border-lantern bg-lantern-soft' : 'border-line bg-surface opacity-50 grayscale hover:opacity-80',
            )}
          >
            🕯️
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {value}/5 · {labels[value]}
      </p>
    </div>
  )
}

export function RelevancePicker({ value, onChange }: { value: Relevance; onChange: (v: Relevance) => void }) {
  return (
    <div role="radiogroup" aria-label="Is the idea still relevant?" className="flex flex-wrap gap-2">
      {relevanceOptions.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            'rounded-lg border px-3 py-2 text-sm transition',
            value === o.id ? 'border-lantern bg-lantern-soft text-ink' : 'border-line bg-surface text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function CausePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Cause of death" className="grid gap-2 sm:grid-cols-2">
      {causes.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          onClick={() => onChange(c.id)}
          className={cx(
            'flex items-start gap-3 rounded-xl border p-3 text-left transition',
            value === c.id ? 'border-lantern bg-lantern-soft' : 'border-line bg-surface hover:bg-surface-2',
          )}
        >
          <span className="text-xl" aria-hidden>
            {c.emoji}
          </span>
          <span>
            <span className="block text-sm font-medium">{c.label}</span>
            <span className="block text-xs text-muted">{c.hint}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('input, textarea, button:not([aria-label="Close"])')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <m.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl"
            initial={{ y: 16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 16, scale: 0.98 }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="font-display text-xl font-semibold">{title}</h2>
              <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-muted hover:text-ink">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('card p-5 sm:p-6', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>
}
