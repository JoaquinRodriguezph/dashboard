import type { DateKey } from '../types'

// All dates here are in *local* time. toISOString() would use UTC, which
// would make "today" change at 8am in the Philippines instead of midnight.

/** Date -> "YYYY-MM-DD" in local time. */
export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "YYYY-MM-DD" -> Date at local midnight. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, days: number): Date {
  // Using the date constructor (not adding milliseconds) stays correct across DST changes.
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** The Sunday that starts the week containing `date` (weeks run Sun–Sat). */
export function weekStartOf(date: Date): DateKey {
  return toDateKey(addDays(date, -date.getDay())) // getDay(): 0 = Sunday
}

/**
 * Days until the goal is due: the coming Sunday, i.e. the end of this week.
 * Sunday -> 7, Monday -> 6, ... Saturday -> 1.
 */
export function daysUntilSunday(date: Date): number {
  return 7 - date.getDay()
}

/** Milliseconds from `date` until the next local midnight. */
export function msUntilMidnight(date: Date): number {
  return addDays(date, 1).getTime() - date.getTime()
}

/** Human label for a week, e.g. "Nov 1 – Nov 7". */
export function weekLabel(weekStart: DateKey): string {
  const start = fromDateKey(weekStart)
  const end = addDays(start, 6)
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

/** A small, stable hash of a string, used to pick "today's" affirmation. */
export function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
