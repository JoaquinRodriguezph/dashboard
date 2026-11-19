import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { addDays, fromDateKey, toDateKey } from '../lib/dates'
import { dayLevel } from '../lib/stats'
import type { DateKey, HistoryDay } from '../types'

interface HeatmapProps {
  /** history.getRange(start, today): one entry per day, oldest first. */
  days: HistoryDay[]
  start: DateKey
  today: DateKey
  selected: DateKey
  onSelect: (date: DateKey) => void
}

const SHOW_AT_LEAST_WEEKS = 26
const SHOW_AT_MOST_WEEKS = 53
const GAP = 3 // px between cells

const LEVEL_CLASS = {
  reached: 'bg-accent',
  partial: 'bg-accent/35',
  missed: 'bg-line',
  before: 'bg-line/30', // before history started: not "missed", just no data
}

const fmt = (key: DateKey, opts: Intl.DateTimeFormatOptions) => fromDateKey(key).toLocaleDateString(undefined, opts)

function cellLabel(key: DateKey, day: HistoryDay | undefined, today: DateKey): string {
  const date = fmt(key, { weekday: 'short', month: 'short', day: 'numeric' }) + (key === today ? ' (today)' : '')
  if (!day) return `${date}: before history started`
  if (day.missed) return `${date}: missed, 0 points`
  return `${date}: ${day.score} of ${day.target} points${day.reached ? ', target reached' : ''}`
}

/**
 * A GitHub-style calendar heatmap: one column per week (Sunday at the top), one
 * square per day. Accent = target reached, light accent = some points, grey =
 * missed. Today is outlined. Click/tap a day to see its details.
 *
 * It's plain HTML buttons in a CSS grid (grid-auto-flow: column fills each
 * week's 7 rows before moving to the next column). On a phone it scrolls
 * sideways and starts scrolled to today.
 */
export function Heatmap({ days, start, today, selected, onSelect }: HeatmapProps) {
  const byDate = new Map(days.map((d) => [d.date, d]))

  // Which weeks to show: from the history start (at most a year back), but at
  // least half a year so a young history still looks like a graph.
  const todayDate = fromDateKey(today)
  const yearAgo = addDays(todayDate, -7 * (SHOW_AT_MOST_WEEKS - 1))
  const minStart = addDays(todayDate, -7 * (SHOW_AT_LEAST_WEEKS - 1))
  let from = fromDateKey(start) > yearAgo ? fromDateKey(start) : yearAgo
  if (from > minStart) from = minStart
  const firstSunday = addDays(from, -from.getDay())
  const lastSaturday = addDays(todayDate, 6 - todayDate.getDay())

  const cells: DateKey[] = []
  for (let d = firstSunday; d <= lastSaturday; d = addDays(d, 1)) cells.push(toDateKey(d))
  const weeks = cells.length / 7
  const firstShown = cells[0]

  // Month names above the column where each month's 1st falls.
  const monthLabels = cells
    .map((key, i) => ({ key, col: Math.floor(i / 7) }))
    .filter(({ key }) => key.endsWith('-01') || key === firstShown)
    .map(({ key, col }) => ({ col, label: fmt(key, { month: 'short' }) }))
    .filter((m, i, all) => i === 0 || m.col - all[i - 1].col >= 3) // avoid overlapping labels

  // Start scrolled to the right (today) on narrow screens.
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [])

  // Keyboard: the selected day is the one Tab stop; arrows move by day/week.
  const cellRefs = useRef(new Map<DateKey, HTMLButtonElement>())
  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = toDateKey(addDays(fromDateKey(selected), step))
    if (next < firstShown || next > today) return
    onSelect(next)
    requestAnimationFrame(() => cellRefs.current.get(next)?.focus())
  }

  // --cell: 22px on phones (easier to tap), 18px from the sm breakpoint up.
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateRows: 'repeat(7, var(--cell))',
    gridAutoColumns: 'var(--cell)',
    gridAutoFlow: 'column',
    gap: GAP,
  }

  return (
    <div>
      <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-2 [--cell:22px] sm:[--cell:18px]">
        <div className="flex w-max gap-2">
          {/* Weekday labels (Mon, Wed, Fri, like GitHub) */}
          <div className="grid pt-5 text-[10px] text-muted" style={{ gridTemplateRows: 'repeat(7, var(--cell))', gap: GAP }} aria-hidden>
            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
              <span key={i} className="flex items-center leading-none">
                {d}
              </span>
            ))}
          </div>
          <div>
            <div className="relative h-5 text-[10px] text-muted" aria-hidden style={{ width: `calc(${weeks} * (var(--cell) + ${GAP}px))` }}>
              {monthLabels.map((m) => (
                <span key={m.col} className="absolute top-0" style={{ left: `calc(${m.col} * (var(--cell) + ${GAP}px))` }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div role="group" aria-label="Daily scores. Use the arrow keys to move between days." onKeyDown={onKey} style={gridStyle}>
              {cells.map((key) => {
                if (key > today) return <span key={key} aria-hidden /> // rest of this week
                const day = key >= start ? byDate.get(key) : undefined
                const level = day ? dayLevel(day) : 'before'
                const isSelected = key === selected
                return (
                  <button
                    key={key}
                    ref={(el) => {
                      if (el) cellRefs.current.set(key, el)
                      else cellRefs.current.delete(key)
                    }}
                    type="button"
                    tabIndex={isSelected ? 0 : -1}
                    aria-pressed={isSelected}
                    aria-current={key === today ? 'date' : undefined}
                    aria-label={cellLabel(key, day, today)}
                    title={cellLabel(key, day, today)}
                    onClick={() => onSelect(key)}
                    className={`rounded-[4px] transition-transform duration-100 hover:scale-110 active:scale-95 motion-reduce:transition-none ${LEVEL_CLASS[level]} ${
                      key === today ? 'ring-2 ring-fg ring-inset' : ''
                    } ${isSelected ? 'outline-2 outline-offset-1 outline-accent' : ''}`}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" aria-hidden>
        {[
          ['bg-accent', 'Target reached'],
          ['bg-accent/35', 'Some points'],
          ['bg-line', 'Missed'],
        ].map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-[3px] ${cls}`} /> {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] ring-2 ring-fg ring-inset" /> Today
        </span>
      </div>
    </div>
  )
}
