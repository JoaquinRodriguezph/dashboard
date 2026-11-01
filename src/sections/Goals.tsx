import { useEffect, useState } from 'react'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '../components/Card'
import { CheckButton } from '../components/CheckButton'
import { IconButton } from '../components/IconButton'
import { Tabs } from '../components/Tabs'
import { TextForm } from '../components/TextForm'
import { useSettings } from '../lib/settings'
import { addGoal, deleteGoal, getGoals, setGoalCompleted, updateGoalText } from '../storage'
import type { Goal, GoalList } from '../types'

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

  useEffect(() => {
    getGoals().then(setGoals)
  }, [])

  const inList = goals.filter((g) => g.list === tab)
  const completedCount = inList.filter((g) => g.completed).length
  // Open goals first, then completed ones (each group keeps its added order).
  const visible = [...inList.filter((g) => !g.completed), ...(hideCompleted ? [] : inList.filter((g) => g.completed))]

  const handleDelete = async (g: Goal) => {
    if (!window.confirm(`Delete "${g.text}"?`)) return
    setGoals(await deleteGoal(g.id))
  }

  const switchTab = (id: GoalList) => {
    setTab(id)
    setEditingId(null)
    setAdding(false)
  }

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
              className="rounded-lg px-2.5 py-1 text-sm text-muted hover:bg-surface-hover hover:text-fg"
            >
              {managing ? 'Done' : 'Edit'}
            </button>
          )}
        </>
      }
    >
      <Tabs tabs={TABS} active={tab} onChange={switchTab} label="Goal lists" />

      <div role="tabpanel" className="mt-3">
        {inList.length === 0 && !adding && (
          <p className="py-2 text-sm text-muted">
            {tab === 'short' ? 'No short-term goals yet.' : 'No life goals yet. Dream big.'}
          </p>
        )}
        {hideCompleted && completedCount > 0 && (
          <p className="px-1 pb-1 text-xs text-muted">{completedCount} completed hidden</p>
        )}

        <ul className="-mx-1">
          {visible.map((g) =>
            editingId === g.id ? (
              <li key={g.id} className="px-1 py-1">
                <TextForm
                  fields={[{ name: 'text', placeholder: 'Goal', initial: g.text, required: true }]}
                  submitLabel="Save"
                  onSubmit={async ({ text }) => {
                    setGoals(await updateGoalText(g.id, text))
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={g.id} className="flex items-center gap-1 rounded-lg px-1 hover:bg-surface-hover/60">
                <CheckButton
                  checked={g.completed}
                  label={g.text}
                  onChange={async (checked) => setGoals(await setGoalCompleted(g.id, checked))}
                />
                <span className={`min-w-0 flex-1 py-2 break-words ${g.completed ? 'text-muted line-through' : ''}`}>
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
              </li>
            ),
          )}
        </ul>

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
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-fg"
            >
              <Plus size={16} /> Add goal
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
