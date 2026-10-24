import { Link } from 'react-router-dom'
import { useTitle } from '../lib/useTitle'

export function NotFound() {
  useTitle('Not found')
  return (
    <div className="py-20 text-center">
      <p className="text-5xl" aria-hidden>
        👻
      </p>
      <h1 className="mt-4 font-display text-2xl font-semibold">Nothing buried here</h1>
      <p className="mt-2 text-muted">This grave is empty. Maybe it was exhumed.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to the graveyard
      </Link>
    </div>
  )
}
