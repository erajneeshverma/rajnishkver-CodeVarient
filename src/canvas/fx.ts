import { create } from 'zustand'

/** Little celebrations played where a card lands. */
export type FxKind = 'revive' | 'rest' | 'ghost' | 'dust' | 'paper' | 'spark' | 'ring'

export interface Fx {
  id: number
  kind: FxKind
  x: number
  y: number
}

let next = 1

export const useFx = create<{ items: Fx[]; play: (kind: FxKind, x: number, y: number) => void; done: (id: number) => void }>()((set) => ({
  items: [],
  play: (kind, x, y) => {
    const id = next++
    set((s) => ({ items: [...s.items.slice(-5), { id, kind, x, y }] }))
    setTimeout(() => set((s) => ({ items: s.items.filter((f) => f.id !== id) })), 1400)
  },
  done: (id) => set((s) => ({ items: s.items.filter((f) => f.id !== id) })),
}))
