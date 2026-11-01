import { useEffect, useState } from 'react'
import { ArrowRight, Target } from 'lucide-react'
import { fromDateKey, weekStartOf } from '../lib/dates'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useToday } from '../lib/useToday'
import { getWeeklyGoals, onDataChange } from '../storage'
import { WEEKLY_GOAL_CARD_ID } from './WeeklyGoal'

/**
 * A small reminder in the header, shown only on Sundays when this week's goal
 * isn't set. It's compact on purpose so it never pushes Dailies down.
 * Tapping it scrolls to the weekly goal card and focuses its input.
 */
export function SundayGoalChip() {
  const today = useToday()
  const reducedMotion = useReducedMotion()
  const [needsGoal, setNeedsGoal] = useState(false)

  useEffect(() => {
    const todayDate = fromDateKey(today)
    const check = async () => {
      const weekStart = weekStartOf(todayDate)
      const goals = await getWeeklyGoals()
      setNeedsGoal(todayDate.getDay() === 0 && !goals.some((g) => g.weekStart === weekStart))
    }
    void check()
    // Re-check as soon as the weekly goal card saves something.
    return onDataChange((key) => key === 'weeklyGoals' && void check())
  }, [today])

  if (!needsGoal) return null

  const goToCard = () => {
    const card = document.getElementById(WEEKLY_GOAL_CARD_ID)
    card?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
    card?.querySelector('input')?.focus({ preventScroll: true })
  }

  return (
    <button
      type="button"
      onClick={goToCard}
      className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3.5 py-1.5 text-sm font-medium text-fg transition hover:border-accent active:scale-[0.97] motion-reduce:transition-none"
    >
      <Target size={16} className="shrink-0 text-accent" />
      <span className="whitespace-nowrap">
        <span className="hidden sm:inline">It's Sunday: s</span>
        <span className="sm:hidden">S</span>et this week's goal
      </span>
      <ArrowRight size={14} className="shrink-0 text-muted" />
    </button>
  )
}
