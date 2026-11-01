import { animated, to, useSprings } from '@react-spring/web'
import { useEffect } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'

const DOTS = 12

interface CelebrationProps {
  /** Change this number to fire the burst again (0 = never fired). */
  trigger: number
}

/**
 * A small burst of dots that fly outwards and fade, placed over the progress ring.
 * Rendered inside a `relative` parent; it never captures clicks.
 * With "reduce motion" on, springs are skipped so nothing visible happens.
 */
export function Celebration({ trigger }: CelebrationProps) {
  const reducedMotion = useReducedMotion()
  const [springs, api] = useSprings(DOTS, () => ({ distance: 0, opacity: 0, scale: 0 }))

  useEffect(() => {
    if (trigger === 0 || reducedMotion) return
    api.start((i) => ({
      from: { distance: 8, opacity: 1, scale: 1 },
      to: { distance: 44 + (i % 3) * 8, opacity: 0, scale: 0.4 },
      config: { tension: 180, friction: 22 }, // ≈ 500 ms, the one deliberate exception
      delay: (i % 4) * 20,
    }))
  }, [trigger, api, reducedMotion])

  // A burst is pure decoration, so with "reduce motion" it's simply not drawn.
  // (Skipping the springs isn't enough: they'd stop on their visible start values.)
  if (reducedMotion) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {springs.map(({ distance, opacity, scale }, i) => {
        const angle = (i / DOTS) * Math.PI * 2
        return (
          <animated.span
            key={i}
            style={{
              opacity,
              // to([a, b], fn) combines two animated values into one style.
              transform: to(
                [distance, scale],
                (d, s) => `translate(-50%, -50%) translate(${Math.cos(angle) * d}px, ${Math.sin(angle) * d}px) scale(${s})`,
              ),
            }}
            className={`absolute top-1/2 left-1/2 size-2 rounded-full ${i % 3 === 0 ? 'bg-amber-400' : 'bg-accent'}`}
          />
        )
      })}
    </div>
  )
}
