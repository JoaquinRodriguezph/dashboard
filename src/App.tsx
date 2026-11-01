import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react'
import { animated, Globals, useTrail } from '@react-spring/web'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ExposureProvider } from './lib/exposure/ExposureContext'
import { useReducedMotion } from './lib/useReducedMotion'
import { useSettings } from './lib/settings'
import { useTheme } from './lib/useTheme'
import { Header } from './sections/Header'
import { COLUMNS, SECTIONS } from './sections'

// lazy() puts the 3D scene (and all of three.js) in a separate file that is
// only downloaded when <Background3D> is first rendered.
const Background3D = lazy(() => import('./three/Background3D'))
// The settings dialog (photo upload, sliders, backup) is only needed once you
// open it, so it's downloaded on first open instead of at startup.
const SettingsPanel = lazy(() => import('./settings/SettingsPanel').then((m) => ({ default: m.SettingsPanel })))

/** Becomes true once the browser is idle after the first paint. */
function useIdle(): boolean {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(() => setIdle(true), 300)
    return () => clearTimeout(id)
  }, [])
  return idle
}

export default function App() {
  const { settings, loaded } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false) // true after the first open
  const isDark = useTheme(settings.theme)
  const reducedMotion = useReducedMotion()
  const idle = useIdle()

  // One switch for every React Spring animation in the app (UI and 3D).
  useEffect(() => {
    Globals.assign({ skipAnimation: reducedMotion })
  }, [reducedMotion])

  // Settings come from storage asynchronously; wait one tick so the greeting
  // doesn't flash without your name.
  if (!loaded) return null

  return (
    // Inside `loaded`, so the double exposure never starts from default settings.
    <ExposureProvider>
      {idle && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <Background3D dark={isDark} reducedMotion={reducedMotion} />
          </Suspense>
        </ErrorBoundary>
      )}

      <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6 lg:max-w-[1600px] lg:px-8">
        <Header
          onOpenSettings={() => {
            setSettingsLoaded(true)
            setSettingsOpen(true)
          }}
        />
        <Sections />
      </div>

      {settingsLoaded && (
        <Suspense fallback={null}>
          <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </ExposureProvider>
  )
}

/** Typed way to set CSS custom properties (e.g. --mobile-order) in a style prop. */
function cssVars(vars: Record<`--${string}`, string | number>): CSSProperties {
  return vars as CSSProperties
}

// Sections sorted by mobileOrder. The entrance animation uses this order too,
// so Dailies always appears first.
const BY_PRIORITY = [...SECTIONS].sort((a, b) => a.mobileOrder - b.mobileOrder)

/**
 * Renders every registered section, each exactly once.
 *
 * Laptop: <main> is a 3-column grid and each column wrapper is a flex column,
 * so cards in a column stack tightly regardless of their neighbours' heights.
 *
 * Phone: <main> is a single flex column and the column wrappers use
 * `display: contents`, which makes the wrapper "disappear" so its cards
 * become direct children of <main>. CSS `order` then sorts them by mobileOrder.
 */
function Sections() {
  const trail = useTrail(BY_PRIORITY.length, {
    from: { opacity: 0, y: 14 },
    to: { opacity: 1, y: 0 },
    config: { tension: 340, friction: 30 }, // each card ≈ 350 ms, staggered

  })

  return (
    <main className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      {COLUMNS.map((column) => (
        <div key={column} className="contents lg:flex lg:flex-col lg:gap-6">
          {SECTIONS.filter((s) => s.column === column).map(({ id, component: Section, mobileOrder }) => (
            <div key={id} style={cssVars({ '--mobile-order': mobileOrder })} className="order-(--mobile-order) lg:order-none">
              <animated.div style={trail[BY_PRIORITY.findIndex((s) => s.id === id)]}>
                <Section />
              </animated.div>
            </div>
          ))}
        </div>
      ))}
    </main>
  )
}
