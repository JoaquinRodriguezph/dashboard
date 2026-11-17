import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { animated, useSpring } from '@react-spring/web'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { buttonClass } from '../../components/buttonStyles'
import { IconButton } from '../../components/IconButton'
import { TextForm } from '../../components/TextForm'
import { addDaysKey, isInMonth, monthGrid, monthLabel, monthOf, shiftMonth, tasksByDay, type DayInfo, type MonthRef } from '../../lib/calendar'
import { fromDateKey, toDateKey } from '../../lib/dates'
import { sortTodos } from '../../lib/todos'
import type { DateKey, Todo } from '../../types'
import { TodoTaskList, type TodoActions } from './TodoTaskList'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // weeks start on Sunday, like the weekly goal

interface TodoCalendarProps extends TodoActions {
  todos: Todo[]
  today: DateKey
  hideCompleted: boolean
  onAdd: (input: { text: string; dueDate?: DateKey }) => void
}

const longDate = (key: DateKey) => fromDateKey(key).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const shortDate = (key: DateKey) => fromDateKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

/** What a screen reader hears for one day, e.g. "Tuesday, November 17, today, 2 tasks, 1 overdue day". */
function dayLabel(key: DateKey, today: DateKey, info: DayInfo | undefined): string {
  const parts = [longDate(key)]
  if (key === today) parts.push('today')
  if (info?.open) parts.push(`${info.open} open task${info.open === 1 ? '' : 's'}`)
  if (info?.done) parts.push(`${info.done} done`)
  if (info?.overdue) parts.push('overdue')
  return parts.join(', ')
}

/**
 * The To-Do month calendar. Same data as the list view (the To-Do card passes
 * the tasks and the actions in), so anything changed here shows up there too.
 */
export function TodoCalendar({ todos, today, hideCompleted, onAdd, ...actions }: TodoCalendarProps) {
  const [selected, setSelected] = useState<DateKey>(today)
  const [month, setMonth] = useState<MonthRef>(() => monthOf(today))
  const [adding, setAdding] = useState(false)
  const days = monthGrid(month)
  const byDay = tasksByDay(todos, today)

  // A short sideways slide when the month changes (skipped with reduce motion).
  const [slide, slideApi] = useSpring(() => ({ x: 0, opacity: 1 }))
  const goToMonth = (next: MonthRef, direction: number) => {
    setMonth(next)
    slideApi.start({ from: { x: direction * 24, opacity: 0 }, to: { x: 0, opacity: 1 }, config: { tension: 380, friction: 34 } })
  }

  const select = (key: DateKey) => {
    setSelected(key)
    setAdding(false)
    const m = monthOf(key)
    if (m.year !== month.year || m.month !== month.month) goToMonth(m, key > selected ? 1 : -1)
  }

  // Keyboard: arrows move a day / a week, Page Up/Down a month. Only the selected
  // day is in the Tab order ("roving tabindex"), so Tab jumps past the grid.
  const cellRefs = useRef(new Map<DateKey, HTMLButtonElement>())
  const focusAfterMove = useRef(false)
  useEffect(() => {
    if (!focusAfterMove.current) return
    focusAfterMove.current = false
    cellRefs.current.get(selected)?.focus()
  }, [selected, month])

  const onGridKey = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    let next: DateKey | null = step ? addDaysKey(selected, step) : null
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      // Same day number in the previous/next month (Jan 31 → Feb 28, the last day that exists).
      const d = fromDateKey(selected)
      const m = d.getMonth() + (e.key === 'PageDown' ? 1 : -1)
      const lastDay = new Date(d.getFullYear(), m + 1, 0).getDate() // day 0 = last day of the month before
      next = toDateKey(new Date(d.getFullYear(), m, Math.min(d.getDate(), lastDay)))
    }
    if (!next) return
    e.preventDefault()
    focusAfterMove.current = true
    select(next)
  }

  const dayItems = sortTodos(
    todos.filter((t) => t.dueDate === selected && !(hideCompleted && t.completed)),
    today,
  )
  const undated = sortTodos(
    todos.filter((t) => !t.dueDate && !(hideCompleted && t.completed)),
    today,
  )
  const viewingToday = selected === today && month.year === monthOf(today).year && month.month === monthOf(today).month

  return (
    <div>
      {/* Month navigation */}
      <div className="mb-2 flex items-center gap-1">
        <IconButton label="Previous month" onClick={() => goToMonth(shiftMonth(month, -1), -1)}>
          <ChevronLeft size={18} />
        </IconButton>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold" aria-live="polite">
          {monthLabel(month)}
        </p>
        <IconButton label="Next month" onClick={() => goToMonth(shiftMonth(month, 1), 1)}>
          <ChevronRight size={18} />
        </IconButton>
        <button
          type="button"
          onClick={() => select(today)}
          disabled={viewingToday}
          className={buttonClass('outline')}
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted" aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <animated.div
        style={slide}
        role="group"
        aria-label={`${monthLabel(month)}. Use the arrow keys to move between days.`}
        onKeyDown={onGridKey}
        className="grid grid-cols-7 gap-0.5"
      >
        {days.map((key) => {
          const info = byDay.get(key)
          const isSelected = key === selected
          const isToday = key === today
          const inMonth = isInMonth(key, month)
          const dots = Math.min(info?.open ?? 0, 3)
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
              aria-current={isToday ? 'date' : undefined}
              aria-label={dayLabel(key, today, info)}
              onClick={() => select(key)}
              className={`flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg text-sm tabular-nums transition duration-150 active:scale-95 motion-reduce:transition-none ${
                isSelected
                  ? 'bg-accent font-semibold text-accent-fg'
                  : `hover:bg-surface-hover ${isToday ? 'font-semibold ring-2 ring-accent ring-inset' : ''} ${
                      info?.overdue ? 'font-semibold text-danger' : inMonth ? '' : 'text-muted/70'
                    }`
              }`}
            >
              <span>{fromDateKey(key).getDate()}</span>
              {/* Up to three dots for open tasks (red if the day is overdue), a "+" for more,
                  or a hollow dot when the day only has finished tasks. */}
              <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
                {Array.from({ length: dots }, (_, i) => (
                  <span
                    key={i}
                    className={`size-1.5 rounded-full ${isSelected ? 'bg-accent-fg' : info?.overdue ? 'bg-danger' : 'bg-accent'}`}
                  />
                ))}
                {(info?.open ?? 0) > 3 && <span className="text-[9px] leading-none font-bold">+</span>}
                {!dots && info?.done ? (
                  <span className={`size-1.5 rounded-full border ${isSelected ? 'border-accent-fg' : 'border-muted'}`} />
                ) : null}
              </span>
            </button>
          )
        })}
      </animated.div>

      {/* The selected day */}
      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-1 px-1 text-sm font-medium">
          {shortDate(selected)}
          {selected === today && <span className="text-muted"> · Today</span>}
        </p>
        {dayItems.length === 0 && !adding && <p className="px-1 py-1 text-sm text-muted">Nothing due this day.</p>}
        {/* key={selected}: another day is a fresh list, swapped instantly instead of every row animating out. */}
        <TodoTaskList key={selected} items={dayItems} today={today} showDates={false} {...actions} />
        <div className="mt-1">
          {adding ? (
            <TextForm
              key={selected}
              fields={[{ name: 'text', placeholder: `Task for ${shortDate(selected)}`, required: true }]}
              submitLabel="Add"
              onSubmit={({ text }) => onAdd({ text, dueDate: selected })}
              onCancel={() => setAdding(false)}
              clearOnSubmit
            />
          ) : (
            <button type="button" onClick={() => setAdding(true)} className={buttonClass('ghost', 'md')}>
              <Plus size={16} /> Add task for {shortDate(selected)}
            </button>
          )}
        </div>
      </div>

      {/* Tasks without a date, so nothing disappears in calendar view */}
      {undated.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-1 px-1 text-sm font-medium">No date</p>
          <TodoTaskList items={undated} today={today} {...actions} />
        </div>
      )}
    </div>
  )
}
