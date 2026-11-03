import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { animated, useSpring, useTransition } from '@react-spring/web'

interface AnimatedListProps<T> {
  items: T[]
  getKey: (item: T) => string
  children: (item: T) => ReactNode
  className?: string
  /**
   * Slide rows to their new place when the order changes (default true).
   * Turn off while something else animates the move, e.g. drag-and-drop.
   */
  flip?: boolean
}

/**
 * A <ul> whose items animate when they are added, removed, or move.
 *
 * Add/remove: each <li> is a one-row CSS grid. Springing `grid-template-rows`
 * between 0fr and 1fr grows/shrinks the row to its natural height without
 * having to measure it.
 *
 * Move (reorder, or a completed goal sinking to the bottom): see FlipItem.
 *
 * Items already there on the first render appear instantly (`initial: null`),
 * so nothing animates on page load.
 */
export function AnimatedList<T>({ items, getKey, children, className = '', flip = true }: AnimatedListProps<T>) {
  const transitions = useTransition(items, {
    keys: getKey,
    initial: null,
    from: { rows: 0, opacity: 0 },
    enter: { rows: 1, opacity: 1 },
    leave: { rows: 0, opacity: 0 },
    config: { tension: 400, friction: 36 }, // ≈ 250 ms
  })

  return (
    <ul className={`relative ${className}`}>
      {transitions((style, item) => (
        <animated.li style={{ display: 'grid', gridTemplateRows: style.rows.to((r) => `${r}fr`), opacity: style.opacity }}>
          {/* min-height: 0 lets the grid row shrink below the content's height.
              Clip only while animating, so focus outlines aren't cut off afterwards. */}
          <animated.div style={{ minHeight: 0, overflow: style.rows.to((r) => (r < 1 ? 'hidden' : 'visible')) }}>
            <FlipItem enabled={flip}>{children(item)}</FlipItem>
          </animated.div>
        </animated.li>
      ))}
    </ul>
  )
}

/**
 * FLIP animation ("First, Last, Invert, Play"):
 * after each render, compare this item's position with where it was before.
 * If it jumped (because the list was reordered), instantly move it back to the
 * old spot with a transform, then spring the transform to 0. It looks like the
 * item slid to its new place. offsetTop ignores transforms, so an animation
 * that's already running doesn't confuse the measurement.
 */
function FlipItem({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const lastTop = useRef<number | null>(null)
  const [style, api] = useSpring(() => ({ y: 0, config: { tension: 420, friction: 34 } }))

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const top = el.offsetTop // relative to the <ul class="relative">
    // Always remember the position, even when disabled, so re-enabling
    // doesn't animate from a stale spot.
    if (enabled && lastTop.current !== null && lastTop.current !== top) {
      api.start({ from: { y: lastTop.current - top }, to: { y: 0 } })
    }
    lastTop.current = top
  })

  return (
    <animated.div ref={ref} style={style}>
      {children}
    </animated.div>
  )
}
