import { lazy, Suspense, useEffect, useState } from 'react'
import { animated, Globals, useTrail } from '@react-spring/web'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useReducedMotion } from './lib/useReducedMotion'
import { useSettings } from './lib/settings'
import { useTheme } from './lib/useTheme'
import { Header } from './sections/Header'
import { SECTIONS } from './sections'
import { SettingsPanel } from './settings/SettingsPanel'

// lazy() puts the 3D scene (and all of three.js) in a separate file that is
// only downloaded when <Background3D> is first rendered.
const Background3D = lazy(() => import('./three/Background3D'))

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
    <>
      {idle && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <Background3D dark={isDark} reducedMotion={reducedMotion} />
          </Suspense>
        </ErrorBoundary>
      )}

      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <Header onOpenSettings={() => setSettingsOpen(true)} />
        <Sections />
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

/** Renders every registered section. Cards slide up one after another on load. */
function Sections() {
  const trail = useTrail(SECTIONS.length, {
    from: { opacity: 0, y: 14 },
    to: { opacity: 1, y: 0 },
    config: { tension: 280, friction: 26 },
  })

  return (
    <main className="grid items-start gap-4 md:grid-cols-2">
      {SECTIONS.map(({ id, component: Section, width }, i) => (
        <animated.div key={id} style={trail[i]} className={width === 'full' ? 'md:col-span-2' : ''}>
          <Section />
        </animated.div>
      ))}
    </main>
  )
}
