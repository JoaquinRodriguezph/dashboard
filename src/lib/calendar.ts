import { addDays, fromDateKey, toDateKey } from './dates'
import { daysBetween } from './todos'
import type { DateKey, Todo } from '../types'

// Calendar maths for the To-Do month view. Everything is in local time and
// weeks start on Sunday, like the weekly goal. No library needed: a month grid
// is just "the Sunday on or before the 1st, then 42 days".

export interface MonthRef {
  year: number
  month: number // 0 = January … 11 = December (like JavaScript's Date)
}

export function monthOf(key: DateKey): MonthRef {
  const d = fromDateKey(key)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/** Moves forward/back by whole months; the Date constructor handles year changes (Dec + 1 → Jan). */
export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/**
 * The days to show for a month: always 6 full weeks (42 days), starting on the
 * Sunday on or before the 1st. A fixed 6 rows keeps the calendar the same height
 * every month, so nothing below it jumps when you change month.
 */
export function monthGrid({ year, month }: MonthRef): DateKey[] {
  const first = new Date(year, month, 1)
  const start = addDays(first, -first.getDay()) // getDay(): 0 = Sunday
  return Array.from({ length: 42 }, (_, i) => toDateKey(addDays(start, i)))
}

export function isInMonth(key: DateKey, { year, month }: MonthRef): boolean {
  const d = fromDateKey(key)
  return d.getFullYear() === year && d.getMonth() === month
}

export function monthLabel({ year, month }: MonthRef): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export interface DayInfo {
  open: number
  done: number
  /** The day is in the past and still has unfinished tasks. */
  overdue: boolean
}

/** Counts tasks per due date. Tasks without a date aren't on the calendar. */
export function tasksByDay(todos: Todo[], today: DateKey): Map<DateKey, DayInfo> {
  const days = new Map<DateKey, DayInfo>()
  for (const t of todos) {
    if (!t.dueDate) continue
    const info = days.get(t.dueDate) ?? { open: 0, done: 0, overdue: false }
    if (t.completed) info.done++
    else {
      info.open++
      if (daysBetween(today, t.dueDate) < 0) info.overdue = true
    }
    days.set(t.dueDate, info)
  }
  return days
}

/** Moves a date by n days, e.g. for arrow-key navigation in the grid. */
export function addDaysKey(key: DateKey, n: number): DateKey {
  return toDateKey(addDays(fromDateKey(key), n))
}
