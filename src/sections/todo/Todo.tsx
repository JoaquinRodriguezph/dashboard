import { useEffect, useState, type ReactNode } from 'react'
import { animated, useSpring } from '@react-spring/web'
import { Eye, EyeOff, Plus } from 'lucide-react'
import { buttonClass } from '../../components/buttonStyles'
import { CollapsibleCard } from '../../components/CollapsibleCard'
import { IconButton } from '../../components/IconButton'
import { Tabs } from '../../components/Tabs'
import { TextForm } from '../../components/TextForm'
import { useCollapsible, useSettings, useTodoView } from '../../lib/settings'
import { dueStatus, sortTodos } from '../../lib/todos'
import { useToday } from '../../lib/useToday'
import {
  addTodo,
  clearCompletedTodos,
  deleteTodo,
  getTodos,
  onDataChange,
  setTodoCompleted,
  updateTodo,
} from '../../storage'
import type { DateKey, Todo as TodoItem } from '../../types'
import { TodoCalendar } from './TodoCalendar'
import { TodoTaskList, todoFields, toTodoInput, type TodoActions } from './TodoTaskList'

const VIEWS = [
  { id: 'list' as const, label: 'List' },
  { id: 'calendar' as const, label: 'Calendar' },
]

/** The header line: what matters today first, e.g. "2 due today · 1 overdue". */
function todoSummary(open: number, dueToday: number, overdue: number): ReactNode {
  if (open === 0) return 'Nothing to do'
  if (dueToday === 0 && overdue === 0) return `${open} open`
  return (
    <>
      {dueToday > 0 && `${dueToday} due today`}
      {dueToday > 0 && overdue > 0 && ' · '}
      {overdue > 0 && <span className="font-medium text-danger">{overdue} overdue</span>}
    </>
  )
}

/**
 * The To-Do card. It owns the task data and the actions (check, edit, delete,
 * add), and hands them to whichever view is showing: the list or the calendar.
 * Both views read the same `todos`, so a change in one shows up in the other.
 */
export function Todo() {
  const [open, toggle] = useCollapsible('todo')
  const [view, setView] = useTodoView()
  const today = useToday()
  const { settings, updateSettings } = useSettings()
  const hideCompleted = settings.hideCompletedTodos

  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loaded, setLoaded] = useState(false)
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

  const completedCount = todos.filter((t) => t.completed).length
  const openCount = todos.length - completedCount
  const overdueCount = todos.filter((t) => !t.completed && dueStatus(t.dueDate, today) === 'overdue').length
  const dueTodayCount = todos.filter((t) => !t.completed && dueStatus(t.dueDate, today) === 'today').length

  // The same actions for both views.
  const actions: TodoActions = {
    onToggle: async (t, completed) => setTodos(await setTodoCompleted(t.id, completed)),
    onUpdate: async (t, input) => setTodos(await updateTodo(t.id, input)),
    onDelete: async (t) => {
      if (!window.confirm(`Delete "${t.text}"?`)) return
      setTodos(await deleteTodo(t.id))
    },
  }
  const add = async (input: { text: string; dueDate?: DateKey }) => setTodos(await addTodo(input))

  const handleClearCompleted = async () => {
    if (!window.confirm(`Permanently delete ${completedCount} completed task${completedCount === 1 ? '' : 's'}?`)) return
    setTodos(await clearCompletedTodos())
  }

  // The view fades in slightly when you switch (like the Goals tabs).
  const [panelStyle, panelApi] = useSpring(() => ({ opacity: 1, y: 0 }))
  const switchView = (next: typeof view) => {
    if (next === view) return
    setView(next)
    setAdding(false)
    panelApi.start({ from: { opacity: 0, y: 6 }, to: { opacity: 1, y: 0 }, config: { tension: 380, friction: 32 } })
  }

  if (!loaded) return null

  const sorted = sortTodos(todos, today)
  const visible = hideCompleted ? sorted.filter((t) => !t.completed) : sorted

  return (
    <CollapsibleCard
      title="To-Do"
      open={open}
      onToggle={toggle}
      summary={todoSummary(openCount, dueTodayCount, overdueCount)}
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
      <Tabs tabs={VIEWS} active={view} onChange={switchView} label="To-Do view" />

      <animated.div role="tabpanel" style={panelStyle} className="mt-3">
        {hideCompleted && completedCount > 0 && (
          <p className="px-1 pb-1 text-xs text-muted">{completedCount} completed hidden</p>
        )}

        {view === 'calendar' ? (
          <TodoCalendar todos={todos} today={today} hideCompleted={hideCompleted} onAdd={add} {...actions} />
        ) : (
          <>
            {todos.length === 0 && !adding && <p className="py-2 text-sm text-muted">Nothing to do. Add a task below.</p>}
            <TodoTaskList items={visible} today={today} {...actions} />
            <div className="mt-2">
              {adding ? (
                <TextForm
                  fields={todoFields()}
                  submitLabel="Add"
                  onSubmit={(v) => add(toTodoInput(v))}
                  onCancel={() => setAdding(false)}
                  clearOnSubmit
                />
              ) : (
                <button type="button" onClick={() => setAdding(true)} className={buttonClass('ghost', 'md')}>
                  <Plus size={16} /> Add task
                </button>
              )}
            </div>
          </>
        )}
      </animated.div>
    </CollapsibleCard>
  )
}
