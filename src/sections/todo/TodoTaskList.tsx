import { useState } from 'react'
import { CalendarDays, Pencil, Trash2 } from 'lucide-react'
import { AnimatedList } from '../../components/AnimatedList'
import { CheckButton } from '../../components/CheckButton'
import { IconButton } from '../../components/IconButton'
import { PointsBadge, pointsField } from '../../components/PointsBadge'
import { TextForm, type TextField } from '../../components/TextForm'
import { parsePoints } from '../../lib/score'
import { dueLabel, dueStatus, type DueStatus } from '../../lib/todos'
import { DEFAULT_POINTS } from '../../storage'
import type { DateKey, Todo } from '../../types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Text + optional due date. Used for adding and editing tasks. */
export function todoFields(todo?: Todo): TextField[] {
  return [
    { name: 'text', placeholder: 'What needs doing?', initial: todo?.text, required: true },
    {
      name: 'dueDate',
      placeholder: 'Due date (optional)',
      initial: todo?.dueDate ?? '',
      type: 'date',
      validate: (v) => (v && !DATE_PATTERN.test(v) ? 'Pick a valid date' : null),
    },
    pointsField(todo?.points),
  ]
}

/** Form values → the fields storage expects (an empty date means "no date"). */
export const toTodoInput = (values: Record<string, string>) => ({
  text: values.text,
  dueDate: values.dueDate || undefined,
  points: parsePoints(values.points ?? '') ?? DEFAULT_POINTS,
})

/** Due-date chip colours: overdue is the one thing that should jump out. */
const CHIP_CLASS: Record<DueStatus, string> = {
  overdue: 'bg-danger/12 text-danger font-medium',
  today: 'bg-accent-soft text-fg font-medium',
  upcoming: 'text-muted',
  none: '',
}

/** What a task list needs from its parent (the To-Do card owns the data). */
export interface TodoActions {
  onToggle: (todo: Todo, completed: boolean) => void
  onUpdate: (todo: Todo, input: { text: string; dueDate?: DateKey; points: number }) => void
  onDelete: (todo: Todo) => void
}

interface TodoTaskListProps extends TodoActions {
  items: Todo[]
  today: DateKey
  /** Show the date chip on each row (the calendar's day list leaves it out: you know the day). */
  showDates?: boolean
}

/**
 * A list of tasks with check / edit / delete, animated with AnimatedList.
 * Used by BOTH the list view and the calendar's day lists, so a task looks
 * and behaves the same everywhere.
 */
export function TodoTaskList({ items, today, showDates = true, onToggle, onUpdate, onDelete }: TodoTaskListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <AnimatedList items={items} getKey={(t) => t.id} className="-mx-1">
      {(t) => {
        if (editingId === t.id) {
          return (
            <div className="px-1 py-1">
              <TextForm
                fields={todoFields(t)}
                submitLabel="Save"
                onSubmit={(v) => {
                  onUpdate(t, toTodoInput(v))
                  setEditingId(null)
                }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          )
        }
        const status = t.completed ? 'none' : dueStatus(t.dueDate, today)
        return (
          <div
            className={`flex items-center gap-1 rounded-xl border-l-[3px] px-1 transition-colors hover:bg-surface-hover/70 active:bg-surface-hover ${
              status === 'overdue' ? 'border-danger bg-danger/6' : 'border-transparent'
            }`}
          >
            <CheckButton checked={t.completed} label={t.text} onChange={(checked) => onToggle(t, checked)} />
            <div className="min-w-0 flex-1 py-2">
              {/* Tasks can wrap, so the strike is real line-through whose colour fades in. */}
              <p
                className={`break-words line-through transition-[color,text-decoration-color] duration-300 motion-reduce:transition-none ${
                  t.completed ? 'text-muted decoration-current' : 'decoration-transparent'
                }`}
              >
                {t.text}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <PointsBadge points={t.points} muted={t.completed} />
                {showDates && t.dueDate && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                      t.completed ? 'text-muted' : CHIP_CLASS[status]
                    }`}
                  >
                    <CalendarDays size={12} />
                    {dueLabel(t.dueDate, today, t.completed)}
                  </span>
                )}
              </div>
            </div>
            <IconButton label={`Edit "${t.text}"`} onClick={() => setEditingId(t.id)}>
              <Pencil size={16} />
            </IconButton>
            <IconButton label={`Delete "${t.text}"`} tone="danger" onClick={() => onDelete(t)}>
              <Trash2 size={16} />
            </IconButton>
          </div>
        )
      }}
    </AnimatedList>
  )
}
