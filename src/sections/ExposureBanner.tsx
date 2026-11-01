import { animated, useTransition } from '@react-spring/web'
import { Dices, LoaderCircle } from 'lucide-react'
import { useExposure } from '../lib/exposure/ExposureContext'

/**
 * The double-exposure photo behind the greeting. It's purely decorative, so it's
 * hidden from screen readers; the re-roll button is the only interactive part.
 * Rendered by Header inside a `relative overflow-hidden` box.
 */
export function ExposureBanner() {
  const { imageUrl, status, error, reroll } = useExposure()
  const generating = status === 'generating'

  // Old and new image overlap and cross-fade when you re-roll.
  const transitions = useTransition(imageUrl, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    config: { duration: 400 },
  })

  return (
    <>
      <div aria-hidden className={`absolute inset-0 bg-surface-hover ${!imageUrl ? 'animate-pulse' : ''}`}>
        {transitions((style, url) =>
          url ? <animated.img src={url} alt="" style={style} className="absolute inset-0 size-full object-cover" /> : null,
        )}
      </div>
      {/* Scrim: fades the photo into the page colour behind the text, so the greeting stays readable. */}
      <div aria-hidden className="absolute inset-0 bg-linear-to-r from-bg/90 via-bg/60 to-bg/5 sm:via-bg/45" />

      <button
        type="button"
        onClick={reroll}
        disabled={generating}
        aria-label={generating ? 'Developing double exposure…' : 'Re-roll double exposure'}
        title={error ? `Last attempt failed: ${error}` : 'Re-roll'}
        // z-10: the greeting layer comes later in the DOM and would otherwise sit on top and swallow taps.
        className="absolute right-3 bottom-3 z-10 inline-flex size-10 items-center justify-center rounded-full border border-line/60 bg-surface/70 text-fg shadow-sm backdrop-blur-md transition duration-150 hover:bg-surface active:scale-90 disabled:opacity-70 motion-reduce:transition-none"
      >
        {generating ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" /> : <Dices size={18} />}
      </button>
    </>
  )
}
