import type { Daily } from '../types'

/** All your dailies' points added up: what a "perfect" day of dailies is worth. */
export function dailiesTotal(dailies: Pick<Daily, 'points'>[]): number {
  return dailies.reduce((sum, d) => sum + (d.points ?? 0), 0)
}

/**
 * A sensible daily target: 80% of your dailies' total, rounded to the nearest 5
 * (at least 10). Not 100%: a good day shouldn't require every single thing,
 * and To-Do tasks can make up the rest.
 */
export function suggestTarget(dailies: Pick<Daily, 'points'>[]): number {
  return Math.max(10, Math.round((dailiesTotal(dailies) * 0.8) / 5) * 5)
}

/** Whole points from 0 to 999 (what the number inputs accept). */
export function parsePoints(value: string): number | null {
  if (!/^\d{1,3}$/.test(value.trim())) return null
  return Number(value)
}
