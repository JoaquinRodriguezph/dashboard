import { useEffect, useState } from 'react'
import { msUntilMidnight, toDateKey } from './dates'
import type { DateKey } from '../types'

/**
 * Returns today's date key, and re-renders the component when the day changes.
 *
 * Two mechanisms, because either one alone isn't enough:
 *  1. A timer set for the next local midnight, for a tab left open overnight.
 *  2. A check whenever the page becomes visible again or regains focus. Phones
 *     and Chrome freeze timers in background tabs, so the timer might fire late.
 */
export function useToday(): DateKey {
  const [today, setToday] = useState(() => toDateKey(new Date()))

  useEffect(() => {
    let timer: number

    const check = () => setToday(toDateKey(new Date())) // no re-render if unchanged

    const schedule = () => {
      window.clearTimeout(timer)
      // +1s so we land safely after midnight, not a hair before it.
      timer = window.setTimeout(() => {
        check()
        schedule()
      }, msUntilMidnight(new Date()) + 1000)
    }

    const onWake = () => {
      if (document.visibilityState === 'visible') {
        check()
        schedule()
      }
    }

    schedule()
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [])

  return today
}
