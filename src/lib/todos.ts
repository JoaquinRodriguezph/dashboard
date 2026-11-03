import { addDays, daysUntilSunday, fromDateKey, toDateKey } from './dates'
import type { DateKey, Todo } from '../types'

export type DueStatus = 'overdue' | 'today' | 'upcoming' | 'none'

/**
 * Whole days from `from` to `to` (both "YYYY-MM-DD"). Negative = in the past.
 * Uses Date.UTC so daylight-saving changes can't make a day 23 or 25 hours long.
 */
export function daysBetween(from: DateKey, to: DateKey): number {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

export function dueStatus(due: DateKey | undefined, today: DateKey): DueStatus {
  if (!due) return 'none'
  const diff = daysBetween(today, due)
  return diff < 0 ? 'overdue' : diff === 0 ? 'today' : 'upcoming'
}

/**
 * "Today", "Tomorrow", "Fri, Nov 7", "2 days overdue" (year shown only if it's not this year).
 * For a completed task a past date is just a date: it isn't "overdue" any more.
 */
export function dueLabel(due: DateKey, today: DateKey, completed = false): string {
  const diff = daysBetween(today, due)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0 && !completed) return `${-diff} day${diff === -1 ? '' : 's'} overdue`
  const date = fromDateKey(due)
  const sameYear = due.slice(0, 4) === today.slice(0, 4)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

const GROUP_ORDER: Record<DueStatus, number> = { overdue: 0, today: 1, upcoming: 2, none: 3 }

/**
 * Open tasks: overdue (oldest first) → today → upcoming (soonest first) → no date
 * (in the order they were added). Completed tasks go last, most recently finished first.
 */
export function sortTodos(todos: Todo[], today: DateKey): Todo[] {
  const open = todos.filter((t) => !t.completed)
  const done = todos.filter((t) => t.completed)
  open.sort((a, b) => {
    const ga = GROUP_ORDER[dueStatus(a.dueDate, today)]
    const gb = GROUP_ORDER[dueStatus(b.dueDate, today)]
    if (ga !== gb) return ga - gb
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    return a.createdAt.localeCompare(b.createdAt)
  })
  done.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  return [...open, ...done]
}

/** Quick-pick dates for the date field. */
export function quickDates(today: DateKey): { label: string; value: DateKey }[] {
  const t = fromDateKey(today)
  return [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: toDateKey(addDays(t, 1)) },
    // Weeks run Sunday–Saturday, so "next week" = the coming Sunday (a Sunday → 7 days later).
    { label: 'Next week', value: toDateKey(addDays(t, daysUntilSunday(t))) },
  ]
}
