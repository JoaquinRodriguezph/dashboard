import { useEffect, useState } from 'react'
import { buttonClass } from '../components/buttonStyles'
import { dailiesTotal, parsePoints, suggestTarget } from '../lib/score'
import { useSettings } from '../lib/settings'
import { getDailies } from '../storage'
import type { Daily } from '../types'

/**
 * "Daily target": the score that makes a good day. Next to it, a suggestion
 * based on your dailies (80% of their total, see lib/score.ts).
 * Changing it updates today's score ring; past days keep the target they had.
 */
export function DailyTargetSetting() {
  const { settings, updateSettings } = useSettings()
  const [dailies, setDailies] = useState<Daily[]>([])
  // The box holds what you type (even half-typed); only valid numbers are saved.
  const [text, setText] = useState(String(settings.dailyTarget))

  useEffect(() => {
    getDailies().then(setDailies)
  }, [])

  const suggested = suggestTarget(dailies)
  const total = dailiesTotal(dailies)
  const invalid = parsePoints(text) === null || Number(text) === 0

  const change = (value: string) => {
    setText(value)
    const n = parsePoints(value)
    if (n !== null && n > 0) updateSettings({ dailyTarget: n })
  }

  return (
    <div>
      <label htmlFor="daily-target" className="mb-1.5 block text-sm font-medium">
        Daily target
      </label>
      <p className="mb-2 text-sm text-muted">Reach this many points in a day and it counts as a good day.</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 text-sm text-muted">
          <input
            id="daily-target"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            step={1}
            value={text}
            onChange={(e) => change(e.target.value)}
            aria-invalid={invalid}
            aria-describedby="daily-target-hint"
            className="w-24 rounded-lg border border-line bg-surface px-3 py-2 text-base text-fg tabular-nums outline-none focus:border-accent aria-invalid:border-danger sm:text-sm"
          />
          pts
        </span>
        {dailies.length > 0 && suggested !== settings.dailyTarget && (
          <button type="button" onClick={() => change(String(suggested))} className={buttonClass('outline')}>
            Use {suggested}
          </button>
        )}
      </div>
      <p id="daily-target-hint" className={`mt-1.5 text-xs ${invalid ? 'text-danger' : 'text-muted'}`}>
        {invalid
          ? 'Enter a whole number from 1 to 999.'
          : dailies.length > 0
            ? `Suggested: ${suggested} pts (80% of your dailies' ${total} pts).`
            : 'Add some dailies to get a suggestion.'}
      </p>
    </div>
  )
}
