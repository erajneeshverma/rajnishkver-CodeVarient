import { Moon, Plus, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { cx } from '../lib/util'
import { useGraveyard } from '../store/useGraveyard'

const nav = [
  { to: '/', label: 'Graveyard', end: true },
  { to: '/salvage', label: 'Salvage Yard' },
  { to: '/advisor', label: 'How advice works' },
]

export function Layout() {
  const theme = useGraveyard((s) => s.theme)
  const toggleTheme = useGraveyard((s) => s.toggleTheme)
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="size-8" />
            <span className="font-display text-lg font-semibold leading-tight">
              The Project <span className="text-lantern">Graveyard</span>
            </span>
          </Link>
          <nav aria-label="Main" className="ml-4 hidden gap-1 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cx('rounded-lg px-3 py-1.5 text-sm transition', isActive ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="btn-ghost px-2.5"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link to="/bury" className="btn-primary">
              <Plus className="size-4" /> <span className="hidden sm:inline">Bury a project</span>
              <span className="sm:hidden">Bury</span>
            </Link>
          </div>
        </div>
        <nav aria-label="Main mobile" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm', isActive ? 'bg-surface-2 text-ink' : 'text-muted')
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        Unfinished isn’t failed. · Built for Code Variant Build 01 · Everything stays in your browser.
      </footer>
    </div>
  )
}
