import { animated, useSpring } from '@react-spring/web'

interface ProgressRingProps {
  done: number
  total: number
  /** Diameter in pixels. */
  size?: number
}

/**
 * A circular progress indicator with "done/total" in the middle.
 * The arc is an SVG circle whose stroke is "dashed": one dash as long as the
 * progress, then a gap. Animating the dash offset makes the arc grow smoothly.
 */
export function ProgressRing({ done, total, size = 76 }: ProgressRingProps) {
  const stroke = size * 0.1
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = total > 0 ? done / total : 0

  const { offset } = useSpring({
    offset: circumference * (1 - fraction),
    config: { tension: 170, friction: 24 },
  })

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={`${done} of ${total} done today`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-line" />
        <animated.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-accent"
          // A 0-length round-capped dash still draws a dot; hide it at 0%.
          opacity={done === 0 ? 0 : 1}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold tabular-nums">
          {done}
          <span className="text-muted">/{total}</span>
        </span>
      </div>
    </div>
  )
}
