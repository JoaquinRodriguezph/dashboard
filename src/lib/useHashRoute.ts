import { useCallback, useEffect, useState } from 'react'

// A tiny router for two pages, using the part of the URL after "#":
//   …/dashboard/          → the dashboard
//   …/dashboard/#/stats   → the statistics page
//
// Why the hash? The browser never sends it to the server. GitHub Pages always
// receives "/dashboard/" and the offline service worker always serves the same
// index.html, so refreshing #/stats works online and offline, no server setup needed.

export type Route = 'dashboard' | 'stats'

function routeFromHash(): Route {
  return window.location.hash === '#/stats' ? 'stats' : 'dashboard'
}

export function useHashRoute(): { route: Route; openStats: () => void; backToDashboard: () => void } {
  const [route, setRoute] = useState<Route>(routeFromHash)

  useEffect(() => {
    // Back/forward buttons (including the phone's back button) and typed URLs.
    const sync = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  const openStats = useCallback(() => {
    // A new history entry, so the back button returns to the dashboard.
    // The state marks that we came from the dashboard (see backToDashboard).
    window.history.pushState({ fromDashboard: true }, '', '#/stats')
    setRoute('stats')
    window.scrollTo(0, 0)
  }, [])

  const backToDashboard = useCallback(() => {
    if ((window.history.state as { fromDashboard?: boolean } | null)?.fromDashboard) {
      // Same as pressing back: no extra entry piles up in the history.
      window.history.back()
    } else {
      // Opened #/stats directly (bookmark, refresh): just drop the hash.
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setRoute('dashboard')
    }
    window.scrollTo(0, 0)
  }, [])

  return { route, openStats, backToDashboard }
}
