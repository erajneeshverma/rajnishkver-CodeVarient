import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Last line of defence: if a screen crashes, offer a way out instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The Project Graveyard crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const backup = () => {
      const data = localStorage.getItem('project-graveyard') ?? '{}'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
      a.download = 'project-graveyard-backup.json'
      a.click()
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-5xl" aria-hidden>
          ⚰️
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold">Something broke in the graveyard</h1>
        <p className="mt-2 text-sm text-muted">{this.state.error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-primary" onClick={() => location.assign('/')}>
            Back to the graveyard
          </button>
          <button type="button" className="btn-ghost" onClick={backup}>
            Download my data
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (!confirm('Reset all local data? Download a backup first if you need it.')) return
              localStorage.removeItem('project-graveyard')
              location.assign('/')
            }}
          >
            Reset local data
          </button>
        </div>
      </div>
    )
  }
}
