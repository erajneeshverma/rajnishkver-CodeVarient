import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  /** An undoable change: the toast becomes a card you drag into the Undo zone. */
  action?: { label: string; run: () => void }
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, action?: Toast['action']) => void
  dismiss: (id: number) => void
  /** Run a toast's action once and remove the toast. */
  runAction: (id: number) => void
  /** Pause / resume the auto-dismiss timer (while the toast is being dragged). */
  hold: (id: number) => void
  release: (id: number) => void
}

let nextId = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const lifetime = (t: Toast) => (t.action ? 9000 : 3500)

export const useToast = create<ToastState>()((set, get) => {
  const schedule = (t: Toast) => {
    clearTimeout(timers.get(t.id))
    timers.set(t.id, setTimeout(() => get().dismiss(t.id), lifetime(t)))
  }
  return {
    toasts: [],
    show: (message, action) => {
      const t = { id: nextId++, message, action }
      // Keep the stack small so it never covers much of the page: newest two only, and only
      // the latest change stays undoable (older ones become plain, click-through messages).
      set((s) => ({ toasts: [...s.toasts.slice(-1).map((x) => (action ? { ...x, action: undefined } : x)), t] }))
      schedule(t)
    },
    dismiss: (id) => {
      clearTimeout(timers.get(id))
      timers.delete(id)
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    },
    runAction: (id) => {
      const t = get().toasts.find((x) => x.id === id)
      if (!t?.action) return
      get().dismiss(id)
      t.action.run()
    },
    hold: (id) => clearTimeout(timers.get(id)),
    release: (id) => {
      const t = get().toasts.find((x) => x.id === id)
      if (t) schedule(t)
    },
  }
})

/** Shorthand for components that only need to show a message. */
export const toast = (message: string, action?: Toast['action']) => useToast.getState().show(message, action)
