import { m } from 'framer-motion'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGraveyard } from '../store/useGraveyard'
import { toast } from '../store/useToast'

const steps = [
  { emoji: '🪦', title: 'Bury it', text: 'Record what it was, how far it got and what’s left. Or import it from GitHub.' },
  { emoji: '🔍', title: 'Autopsy', text: 'Say honestly why it stopped, and how you feel about it today.' },
  { emoji: '⚡', title: 'Decide its fate', text: 'The Revival Advisor ranks five paths and explains every point. You make the call.' },
]

export function Intro() {
  const { introSeen, dismissIntro, projects, clearAll, replaceAll } = useGraveyard()
  if (introSeen) return null

  const startFresh = () => {
    const previous = projects
    clearAll()
    dismissIntro()
    toast('Demo projects cleared. Your graveyard is empty.', { label: 'Undo', run: () => replaceAll(previous) })
  }

  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label="Welcome"
      className="card relative mb-8 overflow-hidden p-5 sm:p-7"
    >
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-lantern/10 blur-3xl" />
      <button type="button" aria-label="Dismiss welcome" onClick={dismissIntro} className="absolute right-4 top-4 rounded p-1 text-muted hover:text-ink">
        <X className="size-4" />
      </button>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lantern">Welcome</p>
      <h2 className="mt-1 font-display text-2xl font-semibold">Unfinished isn’t failed.</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        This is a memory for every project you started and didn’t finish, plus an honest answer about what to do with it next.
        {projects.length > 0 && ' The projects below are a demo graveyard, so feel free to poke around.'}
      </p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-xl border border-line bg-surface-2/50 p-4">
            <p className="text-sm font-medium">
              <span aria-hidden className="mr-1.5">
                {s.emoji}
              </span>
              {i + 1}. {s.title}
            </p>
            <p className="mt-1 text-xs text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/bury" onClick={dismissIntro} className="btn-primary">
          Bury my first project
        </Link>
        <button type="button" onClick={dismissIntro} className="btn-ghost">
          Explore the demo
        </button>
        {projects.length > 0 && (
          <button type="button" onClick={startFresh} className="btn text-muted hover:text-ink">
            Start with an empty graveyard
          </button>
        )}
      </div>
    </m.section>
  )
}
