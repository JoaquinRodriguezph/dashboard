import { ListChecks, Repeat } from 'lucide-react'
import { fromDateKey } from '../lib/dates'
import type { DateKey, HistoryDay } from '../types'

interface DayDetailsProps {
  date: DateKey
  /** undefined = the day is before history started. */
  day: HistoryDay | undefined
  today: DateKey
}

/** One day's score vs target, and everything completed that day (as it was then). */
export function DayDetails({ date, day, today }: DayDetailsProps) {
  const label = fromDateKey(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const status = !day
    ? { text: 'Before history started', cls: 'bg-line/60 text-muted' }
    : day.reached
      ? { text: 'Target reached', cls: 'bg-accent text-accent-fg' }
      : day.missed
        ? { text: date === today ? 'Nothing yet today' : 'Missed', cls: 'bg-line text-muted' }
        : { text: date === today ? 'In progress' : 'Below target', cls: 'bg-accent-soft text-fg' }

  return (
    <div aria-live="polite">
      <p className="text-sm text-muted">
        {label}
        {date === today && ' · Today'}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-3xl font-semibold tabular-nums">
          {day?.score ?? 0}
          <span className="text-lg text-muted"> / {day?.target ?? '–'} pts</span>
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`}>{status.text}</span>
      </div>

      {day && day.items.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {[...day.items]
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm">
                {item.kind === 'daily' ? (
                  <Repeat size={15} className="shrink-0 text-accent" aria-label="Daily" />
                ) : (
                  <ListChecks size={15} className="shrink-0 text-accent" aria-label="Task" />
                )}
                <span className="min-w-0 flex-1 break-words">{item.name}</span>
                <span className="shrink-0 text-muted tabular-nums">{item.points} pts</span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{day ? 'Nothing completed this day.' : 'History started later.'}</p>
      )}
    </div>
  )
}
