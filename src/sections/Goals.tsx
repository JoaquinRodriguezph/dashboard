import { useEffect, useState } from 'react'
import { animated, useSpring } from '@react-spring/web'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { AnimatedList } from '../components/AnimatedList'
import { Card } from '../components/Card'
import { CheckButton } from '../components/CheckButton'
import { IconButton } from '../components/IconButton'
import { Tabs } from '../components/Tabs'
import { TextForm } from '../components/TextForm'
import { useSettings } from '../lib/settings'
import { addGoal, deleteGoal, getGoals, setGoalCompleted, updateGoalText } from '../storage'
import type { Goal, GoalList } from '../types'
import { buttonClass } from '../components/buttonStyles'

const TABS: { id: GoalList; label: string }[] = [
  { id: 'short', label: 'Short-term goals' },
  { id: 'life', label: 'Life goals' },
]

export function Goals() {
  const { settings, updateSettings } = useSettings()
  const hideCompleted = settings.hideCompletedGoals

  const [goals, setGoals] = useState<Goal[]>([])
  const [tab, setTab] = useState<GoalList>('short')
  const [managing, setManaging] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getGoals().then((g) => {
      setGoals(g)
      setLoaded(true)
    })
  }, [])

  const inList = goals.filter((g) => g.list === tab)
  const completedCount = inList.filter((g) => g.completed).length
  // Open goals first, then completed ones (each group keeps its added order).
  const visible = [...inList.filter((g) => !g.completed), ...(hideCompleted ? [] : inList.filter((g) => g.completed))]

  const handleDelete = async (g: Goal) => {
    if (!window.confirm(`Delete "${g.text}"?`)) return
    setGoals(await deleteGoal(g.id))
  }

  // The list fades and slides in slightly each time the tab changes.
  const [panelStyle, panelApi] = useSpring(() => ({ opacity: 1, y: 0 }))

  const switchTab = (id: GoalList) => {
    if (id === tab) return
    setTab(id)
    setEditingId(null)
    setAdding(false)
    panelApi.start({ from: { opacity: 0, y: 6 }, to: { opacity: 1, y: 0 }, config: { tension: 380, friction: 32 } })
  }

  if (!loaded) return null

  return (
    <Card
      title="Goals"
      meta={inList.length > 0 && `${completedCount}/${inList.length} done`}
      actions={
        <>
          <IconButton
            label={hideCompleted ? 'Show completed goals' : 'Hide completed goals'}
            onClick={() => updateSettings({ hideCompletedGoals: !hideCompleted })}
          >
            {hideCompleted ? <EyeOff size={16} /> : <Eye size={16} />}
          </IconButton>
          {goals.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setManaging((m) => !m)
                setEditingId(null)
              }}
              className={buttonClass('ghost')}
            >
              {managing ? 'Done' : 'Edit'}
            </button>
          )}
        </>
      }
    >
      <Tabs tabs={TABS} active={tab} onChange={switchTab} label="Goal lists" />

      <animated.div role="tabpanel" style={panelStyle} className="mt-3">
        {inList.length === 0 && !adding && (
          <p className="py-2 text-sm text-muted">
            {tab === 'short' ? 'No short-term goals yet.' : 'No life goals yet. Dream big.'}
          </p>
        )}
        {hideCompleted && completedCount > 0 && (
          <p className="px-1 pb-1 text-xs text-muted">{completedCount} completed hidden</p>
        )}

        {/* key={tab}: a new tab is a fresh list (no per-row animations; the panel fades instead). */}
        <AnimatedList key={tab} items={visible} getKey={(g) => g.id} className="-mx-1">
          {(g) =>
            editingId === g.id ? (
              <div className="px-1 py-1">
                <TextForm
                  fields={[{ name: 'text', placeholder: 'Goal', initial: g.text, required: true }]}
                  submitLabel="Save"
                  onSubmit={async ({ text }) => {
                    setGoals(await updateGoalText(g.id, text))
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 rounded-xl px-1 transition-colors hover:bg-surface-hover/70 active:bg-surface-hover">
                <CheckButton
                  checked={g.completed}
                  label={g.text}
                  onChange={async (checked) => setGoals(await setGoalCompleted(g.id, checked))}
                />
                {/* Goals can wrap, so the strike is real line-through whose color fades in. */}
                <span
                  className={`min-w-0 flex-1 py-2 break-words line-through transition-[color,text-decoration-color] duration-300 motion-reduce:transition-none ${
                    g.completed ? 'text-muted decoration-current' : 'decoration-transparent'
                  }`}
                >
                  {g.text}
                </span>
                {managing && (
                  <>
                    <IconButton label="Edit" onClick={() => setEditingId(g.id)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton label="Delete" tone="danger" onClick={() => handleDelete(g)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </>
                )}
              </div>
            )
          }
        </AnimatedList>

        <div className="mt-2">
          {adding ? (
            <TextForm
              key={tab}
              fields={[{ name: 'text', placeholder: tab === 'short' ? 'New short-term goal' : 'New life goal', required: true }]}
              submitLabel="Add"
              onSubmit={async ({ text }) => setGoals(await addGoal(tab, text))}
              onCancel={() => setAdding(false)}
              clearOnSubmit
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className={buttonClass('ghost', 'md')}
            >
              <Plus size={16} /> Add goal
            </button>
          )}
        </div>
      </animated.div>
    </Card>
  )
}
