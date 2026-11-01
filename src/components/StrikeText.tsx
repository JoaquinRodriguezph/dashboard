import type { ReactNode } from 'react'
import { animated, useSpring } from '@react-spring/web'

interface StrikeTextProps {
  struck: boolean
  children: ReactNode
}

/**
 * Text with a strike-through line that draws itself from left to right.
 * The line is a 1.5px bar scaled horizontally from 0 to 1 (transform-origin: left).
 * Only the line's own width is animated, so it works for one-line text
 * (the task names are truncated to one line).
 */
export function StrikeText({ struck, children }: StrikeTextProps) {
  const { scale } = useSpring({ scale: struck ? 1 : 0, config: { tension: 340, friction: 30 } })
  return (
    <span className={`relative transition-colors duration-200 ${struck ? 'text-muted' : ''}`}>
      {children}
      <animated.span
        aria-hidden
        style={{ transform: scale.to((s) => `scaleX(${s})`) }}
        className="pointer-events-none absolute top-1/2 right-0 left-0 h-[1.5px] origin-left rounded-full bg-current"
      />
    </span>
  )
}
