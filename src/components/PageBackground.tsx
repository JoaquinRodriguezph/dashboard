import { lazy, Suspense, useMemo } from 'react'
import { animated, useTransition } from '@react-spring/web'
import { ErrorBoundary } from './ErrorBoundary'
import { useExposure } from '../lib/exposure/ExposureContext'
import { grainTexture } from '../lib/grainTexture'
import { useSettings } from '../lib/settings'

// The live WebGL mode (and all of three.js) is only downloaded when it's switched on.
const LiveExposure = lazy(() => import('../three/LiveExposure'))

interface PageBackgroundProps {
  reducedMotion: boolean
}

/**
 * The fixed, full-screen background behind the whole page. Layers, bottom to top:
 *
 *   1. calm gradient       always (what you see with no photos or the feature off)
 *   2. photo               the cached double exposure, cover-fit
 *   2b. live layer         optional WebGL version on top of the photo (the photo
 *                          stays underneath while it loads, or if WebGL fails)
 *   3. drifting glow       optional, soft white light
 *   4. scrim               neutral white (light mode) / black (dark mode): 80% at the
 *                          top behind the greeting, 58% below, so text stays readable
 *                          without tinting the photo
 *   5. grain               optional, faint flickering noise
 *
 * The photo itself is shown exactly as generated: no CSS filters or blend modes,
 * which is why it matches the preview in Settings.
 */
export function PageBackground({ reducedMotion }: PageBackgroundProps) {
  const { imageUrl, settings: exposure, photos } = useExposure()
  const { settings } = useSettings()
  const bg = settings.background
  const showPhoto = exposure.enabled && photos.length > 0
  const animate = !reducedMotion
  const live = showPhoto && bg.live && animate
  const grainUrl = useMemo(() => (showPhoto && bg.grain ? grainTexture() : null), [showPhoto, bg.grain])

  // Old and new image cross-fade (e.g. after a re-roll).
  const transitions = useTransition(showPhoto ? imageUrl : null, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    config: { duration: 700 },
  })

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-calm absolute inset-0" />
      {showPhoto && (
        <>
          {transitions((style, url) =>
            url ? (
              <animated.div style={style} className="absolute inset-0">
                <img
                  src={url}
                  alt=""
                  // No pan/zoom under the live layer: it would be hidden anyway.
                  className={`size-full object-cover ${bg.panZoom && animate && !live ? 'bg-pan-zoom bg-anim' : ''}`}
                />
              </animated.div>
            ) : null,
          )}
          {live && (
            <ErrorBoundary>
              <Suspense fallback={null}>
                <LiveExposure photos={photos} settings={exposure} />
              </Suspense>
            </ErrorBoundary>
          )}
          {bg.glow && animate && <div className="bg-glow bg-anim" />}
          {/* Stronger at the top, where the greeting sits right on the photo; cards below have their own glass. */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, var(--scrim-strong) 0px, var(--scrim-strong) 170px, var(--scrim) 420px)' }}
          />
          {grainUrl && (
            <div className={`bg-grain ${animate ? 'bg-anim' : ''}`} style={{ backgroundImage: `url(${grainUrl})` }} />
          )}
        </>
      )}
    </div>
  )
}
