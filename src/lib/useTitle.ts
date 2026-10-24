import { useEffect } from 'react'

const APP = 'The Project Graveyard'

/** Sets the browser tab title for the current page. */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : APP
  }, [title])
}
