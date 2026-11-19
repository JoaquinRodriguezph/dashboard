import { animated, useSpring } from '@react-spring/web'

interface ProgressRingProps {
  value: number
  max: number
  /** Small word under the numbers, e.g. "pts". */
  unit?: string
  /** What a screen reader hears, e.g. "45 of 60 points today". */
  label: string
  /** Diameter in pixels. */
  size?: number
}

/**
 * A circular progress indicator with "value/max" in the middle.
 * The arc is an SVG circle whose stroke is "dashed": one dash as long as the
 * progress, then a gap. Animating the dash offset makes the arc grow smoothly.
 * The number in the middle counts up/down with the same spring.
 */
export function ProgressRing({ value, max, unit, label, size = 76 }: ProgressRingProps) {
  const stroke = size * 0.1
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = max > 0 ? Math.min(1, value / max) : 0

  const { offset, shown } = useSpring({
    offset: circumference * (1 - fraction),
    shown: value,
    config: { tension: 170, friction: 24 },
  })

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
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
          opacity={value === 0 ? 0 : 1}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-lg font-semibold tabular-nums">
          <animated.span>{shown.to((v) => Math.round(v))}</animated.span>
          <span className="text-muted">/{max}</span>
        </span>
        {unit && <span className="mt-0.5 text-[10px] font-medium tracking-wide text-muted uppercase">{unit}</span>}
      </div>
    </div>
  )
}
