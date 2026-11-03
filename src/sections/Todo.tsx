import { useEffect, useState } from 'react'
import { CalendarDays, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { AnimatedList } from '../components/AnimatedList'
import { buttonClass } from '../components/buttonStyles'
import { Card } from '../components/Card'
import { CheckButton } from '../components/CheckButton'
import { IconButton } from '../components/IconButton'
import { TextForm, type TextField } from '../components/TextForm'
import { useSettings } from '../lib/settings'
import { dueLabel, dueStatus, sortTodos, type DueStatus } from '../lib/todos'
import { useToday } from '../lib/useToday'
import {
  addTodo,
  clearCompletedTodos,
  deleteTodo,
  getTodos,
  onDataChange,
  setTodoCompleted,
  updateTodo,
} from '../storage'
import type { Todo as TodoItem } from '../types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function todoFields(todo?: TodoItem): TextField[] {
  return [
    { name: 'text', placeholder: 'What needs doing?', initial: todo?.text, required: true },
    {
      name: 'dueDate',
      placeholder: 'Due date (optional)',
      initial: todo?.dueDate ?? '',
      type: 'date',
      validate: (v) => (v && !DATE_PATTERN.test(v) ? 'Pick a valid date' : null),
    },
  ]
}

/** Due-date chip colours: overdue is the one thing that should jump out. */
const CHIP_CLASS: Record<DueStatus, string> = {
  overdue: 'bg-danger/12 text-danger font-medium',
  today: 'bg-accent-soft text-fg font-medium',
  upcoming: 'text-muted',
  none: '',
}

export function Todo() {
  const today = useToday()
  const { settings, updateSettings } = useSettings()
  const hideCompleted = settings.hideCompletedTodos

  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const load = () =>
      getTodos().then((t) => {
        setTodos(t)
        setLoaded(true)
      })
    void load()
    // Other parts of the page can add tasks too (e.g. Ideas → "Add to To-Do").
    return onDataChange((key) => key === 'todos' && void load())
  }, [])

  const sorted = sortTodos(todos, today)
  const visible = hideCompleted ? sorted.filter((t) => !t.completed) : sorted
  const completedCount = todos.filter((t) => t.completed).length
  const openCount = todos.length - completedCount
  const overdueCount = todos.filter((t) => !t.completed && dueStatus(t.dueDate, today) === 'overdue').length

  const save = (values: Record<string, string>) => ({ text: values.text, dueDate: values.dueDate || undefined })

  const handleDelete = async (t: TodoItem) => {
    if (!window.confirm(`Delete "${t.text}"?`)) return
    setTodos(await deleteTodo(t.id))
  }

  const handleClearCompleted = async () => {
    if (!window.confirm(`Permanently delete ${completedCount} completed task${completedCount === 1 ? '' : 's'}?`)) return
    setTodos(await clearCompletedTodos())
  }

  if (!loaded) return null

  return (
    <Card
      title="To-Do"
      meta={
        todos.length > 0 && (
          <>
            {openCount} open
            {overdueCount > 0 && <span className="font-medium text-danger"> · {overdueCount} overdue</span>}
          </>
        )
      }
      actions={
        completedCount > 0 && (
          <>
            <IconButton
              label={hideCompleted ? 'Show completed tasks' : 'Hide completed tasks'}
              onClick={() => updateSettings({ hideCompletedTodos: !hideCompleted })}
            >
              {hideCompleted ? <EyeOff size={16} /> : <Eye size={16} />}
            </IconButton>
            <button type="button" onClick={handleClearCompleted} className={buttonClass('ghost')}>
              Clear completed
            </button>
          </>
        )
      }
    >
      {todos.length === 0 && !adding && <p className="py-2 text-sm text-muted">Nothing to do. Add a task below.</p>}
      {hideCompleted && completedCount > 0 && (
        <p className="px-1 pb-1 text-xs text-muted">{completedCount} completed hidden</p>
      )}

      <AnimatedList items={visible} getKey={(t) => t.id} className="-mx-1">
        {(t) => {
          if (editingId === t.id) {
            return (
              <div className="px-1 py-1">
                <TextForm
                  fields={todoFields(t)}
                  submitLabel="Save"
                  onSubmit={async (v) => {
                    setTodos(await updateTodo(t.id, save(v)))
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
              <CheckButton
                checked={t.completed}
                label={t.text}
                onChange={async (checked) => setTodos(await setTodoCompleted(t.id, checked))}
              />
              <div className="min-w-0 flex-1 py-2">
                {/* Tasks can wrap, so the strike is real line-through whose colour fades in. */}
                <p
                  className={`break-words line-through transition-[color,text-decoration-color] duration-300 motion-reduce:transition-none ${
                    t.completed ? 'text-muted decoration-current' : 'decoration-transparent'
                  }`}
                >
                  {t.text}
                </p>
                {t.dueDate && (
                  <span
                    className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                      t.completed ? 'text-muted' : CHIP_CLASS[status]
                    }`}
                  >
                    <CalendarDays size={12} />
                    {dueLabel(t.dueDate, today, t.completed)}
                  </span>
                )}
              </div>
              <IconButton label={`Edit "${t.text}"`} onClick={() => setEditingId(t.id)}>
                <Pencil size={16} />
              </IconButton>
              <IconButton label={`Delete "${t.text}"`} tone="danger" onClick={() => handleDelete(t)}>
                <Trash2 size={16} />
              </IconButton>
            </div>
          )
        }}
      </AnimatedList>

      <div className="mt-2">
        {adding ? (
          <TextForm
            fields={todoFields()}
            submitLabel="Add"
            onSubmit={async (v) => setTodos(await addTodo(save(v)))}
            onCancel={() => setAdding(false)}
            clearOnSubmit
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={buttonClass('ghost', 'md')}>
            <Plus size={16} /> Add task
          </button>
        )}
      </div>
    </Card>
  )
}
