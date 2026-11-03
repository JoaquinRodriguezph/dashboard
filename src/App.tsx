import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react'
import { animated, Globals, useTrail } from '@react-spring/web'
import { PageBackground } from './components/PageBackground'
import { ExposureProvider } from './lib/exposure/ExposureContext'
import { useReducedMotion } from './lib/useReducedMotion'
import { useSettings } from './lib/settings'
import { useTheme } from './lib/useTheme'
import { Header } from './sections/Header'
import { ROWS, SECTIONS } from './sections'

// The settings dialog (photo upload, sliders, backup) is only needed once you
// open it, so it's downloaded on first open instead of at startup.
const SettingsPanel = lazy(() => import('./settings/SettingsPanel').then((m) => ({ default: m.SettingsPanel })))

export default function App() {
  const { settings, loaded } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false) // true after the first open
  useTheme(settings.theme)
  const reducedMotion = useReducedMotion()

  // One switch for every React Spring animation in the app.
  useEffect(() => {
    Globals.assign({ skipAnimation: reducedMotion })
  }, [reducedMotion])

  // <html data-hidden="true"> while the tab is in the background: the CSS
  // pauses every background animation then (see .bg-anim in index.css).
  useEffect(() => {
    const update = () => {
      document.documentElement.dataset.hidden = String(document.hidden)
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  // Settings come from storage asynchronously; wait one tick so the greeting
  // doesn't flash without your name.
  if (!loaded) return null

  return (
    // Inside `loaded`, so the double exposure never starts from default settings.
    <ExposureProvider>
      <PageBackground reducedMotion={reducedMotion} />

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
 * Laptop: each row (main, bottom) is a grid, and each area inside it is a flex
 * column, so cards in an area stack tightly regardless of their neighbours' heights.
 *
 * Phone: <main> is a single flex column, and the row and area wrappers use
 * `display: contents`, which makes the wrappers "disappear" so every card
 * becomes a direct child of <main>. CSS `order` then sorts them by mobileOrder.
 */
function Sections() {
  const trail = useTrail(BY_PRIORITY.length, {
    from: { opacity: 0, y: 14 },
    to: { opacity: 1, y: 0 },
    config: { tension: 340, friction: 30 }, // each card ≈ 350 ms, staggered
  })

  return (
    <main className="flex flex-col gap-4 lg:gap-6">
      {ROWS.map((row) => (
        <div key={row.id} className={`contents lg:grid lg:items-start lg:gap-6 ${row.gridClass}`}>
          {row.areas.map((area) => (
            <div key={area} className="contents lg:flex lg:flex-col lg:gap-6">
              {SECTIONS.filter((s) => s.area === area).map(({ id, component: Section, mobileOrder }) => (
                <div key={id} style={cssVars({ '--mobile-order': mobileOrder })} className="order-(--mobile-order) lg:order-none">
                  <animated.div style={trail[BY_PRIORITY.findIndex((s) => s.id === id)]}>
                    <Section />
                  </animated.div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </main>
  )
}
