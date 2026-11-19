import type { TextField } from './TextForm'
import { parsePoints } from '../lib/score'
import { DEFAULT_POINTS } from '../storage'

/** The small "10 pts" pill next to a daily or task. */
export function PointsBadge({ points, muted = false }: { points: number; muted?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] leading-none font-medium tabular-nums ${
        muted ? 'bg-line/60 text-muted' : 'bg-accent-soft text-fg'
      }`}
      aria-label={`${points} points`}
    >
      {points} pts
    </span>
  )
}

/** The "points" input used in the add/edit forms of dailies and tasks. */
export function pointsField(initial: number = DEFAULT_POINTS): TextField {
  return {
    name: 'points',
    placeholder: 'Points',
    type: 'number',
    suffix: 'pts',
    initial: String(initial),
    validate: (v) => (parsePoints(v) === null ? 'Points must be a whole number from 0 to 999' : null),
  }
}
