import { m } from 'framer-motion'
import { useFx, type FxKind } from './fx'

const particles: Record<FxKind, { glyphs: string[]; ring: string; rise: number; spread: number }> = {
  revive: { glyphs: ['⚡', '✨', '🌱', '✨', '⚡', '✨'], ring: 'border-emerald-400', rise: -90, spread: 70 },
  rest: { glyphs: ['🪦', '🥀', '🕯️', '🥀'], ring: 'border-rose-400', rise: 50, spread: 40 },
  ghost: { glyphs: ['👻', '👻', '✨'], ring: 'border-violet-400', rise: -110, spread: 40 },
  dust: { glyphs: ['🟫', '🪨', '🟫', '🪨', '🟫'], ring: 'border-rose-500', rise: 30, spread: 80 },
  paper: { glyphs: ['📄', '📄', '✨'], ring: 'border-lantern', rise: -100, spread: 50 },
  spark: { glyphs: ['✨', '✨', '✨', '✨'], ring: 'border-lantern', rise: -60, spread: 60 },
  ring: { glyphs: [], ring: 'border-muted', rise: 0, spread: 0 },
}

/** Plays the drop effects. Purely decorative, so hidden from assistive tech and skipped with reduced motion. */
export function FxLayer() {
  const items = useFx((s) => s.items)
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden motion-reduce:hidden">
      {items.map((f) => {
        const p = particles[f.kind]
        return (
          <div key={f.id} className="absolute" style={{ left: f.x, top: f.y }}>
            <m.span
              className={`absolute -left-8 -top-8 size-16 rounded-full border-4 ${p.ring}`}
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
            {p.glyphs.map((g, i) => {
              const angle = (i / Math.max(1, p.glyphs.length)) * Math.PI * 2
              return (
                <m.span
                  key={i}
                  className="absolute -left-3 -top-3 text-2xl"
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                  animate={{ x: Math.cos(angle) * p.spread, y: p.rise + Math.sin(angle) * p.spread * 0.4, opacity: 0, scale: 1.2, rotate: (i % 2 ? 1 : -1) * 25 }}
                  transition={{ duration: 1.1, ease: 'easeOut', delay: i * 0.03 }}
                >
                  {g}
                </m.span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
