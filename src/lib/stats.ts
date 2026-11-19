import type { DateKey, HistoryDay } from '../types'

// Statistics maths, kept as plain functions so they're easy to test.
// They all take HistoryDay[] as returned by history.getRange(): one entry per
// day, oldest first, missed days included with score 0.

export interface Streaks {
  /** Days in a row with the target reached, ending today (or yesterday if today isn't reached yet). */
  current: number
  /** The longest such run ever. */
  best: number
}

export function streaks(days: HistoryDay[], today: DateKey): Streaks {
  let best = 0
  let run = 0
  for (const d of days) {
    run = d.reached ? run + 1 : 0
    best = Math.max(best, run)
  }

  // Count back from the end. Today doesn't break the streak until it's over:
  // in the morning, before you've reached today's target, yesterday's streak still counts.
  let current = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i]
    if (d.date === today && !d.reached) continue
    if (!d.reached) break
    current++
  }
  return { current, best }
}

export interface PeriodSummary {
  /** Days in the period so far (since history started). */
  days: number
  /** How many of those reached the target. */
  reached: number
  /** Total points. */
  total: number
  /** Average daily score, missed days counting as 0. */
  average: number
}

export function summarize(days: HistoryDay[]): PeriodSummary {
  const total = days.reduce((sum, d) => sum + d.score, 0)
  return {
    days: days.length,
    reached: days.filter((d) => d.reached).length,
    total,
    average: days.length > 0 ? Math.round(total / days.length) : 0,
  }
}

/** Heatmap colour level for a day. */
export type DayLevel = 'reached' | 'partial' | 'missed'

export function dayLevel(d: HistoryDay): DayLevel {
  if (d.reached) return 'reached'
  return d.score > 0 ? 'partial' : 'missed'
}
