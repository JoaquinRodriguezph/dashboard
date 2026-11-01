import { useEffect, useState } from 'react'
import { Check, ChevronDown, Pencil, Target, Trash2, X } from 'lucide-react'
import { Card } from '../components/Card'
import { CheckButton } from '../components/CheckButton'
import { IconButton } from '../components/IconButton'
import { TextForm } from '../components/TextForm'
import { daysUntilSunday, fromDateKey, weekLabel, weekStartOf } from '../lib/dates'
import { useToday } from '../lib/useToday'
import { deleteWeeklyGoal, getWeeklyGoals, setWeeklyGoalCompleted, setWeeklyGoalText } from '../storage'
import type { WeeklyGoal as WeeklyGoalType } from '../types'

/** The header's Sunday reminder scrolls to this id. */
export const WEEKLY_GOAL_CARD_ID = 'weekly-goal'

function countdownLabel(days: number): string {
  if (days === 1) return 'Due tomorrow (Sunday)'
  return `${days} days left`
}

export function WeeklyGoal() {
  const today = useToday()
  const todayDate = fromDateKey(today)
  const weekStart = weekStartOf(todayDate) // this week's Sunday
  const isSunday = todayDate.getDay() === 0

  const [goals, setGoals] = useState<WeeklyGoalType[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    getWeeklyGoals().then((g) => {
      setGoals(g)
      setLoaded(true)
    })
  }, [])

  const current = goals.find((g) => g.weekStart === weekStart)
  const history = goals.filter((g) => g.weekStart < weekStart) // already sorted newest first
  const completedCount = history.filter((g) => g.completed).length

  const save = async ({ text }: Record<string, string>) => {
    setGoals(await setWeeklyGoalText(weekStart, text))
    setEditing(false)
  }

  const remove = async () => {
    if (!window.confirm("Delete this week's goal?")) return
    setGoals(await deleteWeeklyGoal(weekStart))
  }

  if (!loaded) return null

  // ── Sunday prompt: a highlighted card asking for this week's goal ──
  const needsPrompt = !current && isSunday

  return (
    <Card
      id={WEEKLY_GOAL_CARD_ID}
      title="Weekly major goal"
      meta={weekLabel(weekStart)}
      className={needsPrompt ? 'border-accent ring-4 ring-accent-soft' : ''}
      actions={
        current &&
        !editing && (
          <>
            <IconButton label="Edit goal" onClick={() => setEditing(true)}>
              <Pencil size={16} />
            </IconButton>
            <IconButton label="Delete goal" tone="danger" onClick={remove}>
              <Trash2 size={16} />
            </IconButton>
          </>
        )
      }
    >
      {!current || editing ? (
        <div>
          {needsPrompt && (
            <div className="mb-3 flex items-start gap-3">
              <Target className="mt-0.5 shrink-0 text-accent" size={22} />
              <div>
                <p className="font-medium">It's Sunday: time to set this week's goal.</p>
                <p className="text-sm text-muted">What's the one thing you want done by next Sunday?</p>
              </div>
            </div>
          )}
          {!current && !isSunday && (
            <p className="mb-2 text-sm text-muted">No goal set for this week yet.</p>
          )}
          <TextForm
            fields={[{ name: 'text', placeholder: 'This week I will…', initial: current?.text, required: true }]}
            submitLabel={current ? 'Save' : 'Set goal'}
            onSubmit={save}
            onCancel={current ? () => setEditing(false) : undefined}
            // Only grab focus when you clicked Edit. On page load it would scroll
            // the phone down to this card and open the keyboard.
            autoFocus={editing}
          />
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <CheckButton
            checked={current.completed}
            label="Mark weekly goal complete"
            onChange={async (checked) => setGoals(await setWeeklyGoalCompleted(weekStart, checked))}
          />
          <div className="min-w-0 flex-1 py-1.5">
            <p className={`text-lg font-medium break-words ${current.completed ? 'text-muted line-through' : ''}`}>
              {current.text}
            </p>
            <p className={`mt-0.5 text-sm ${current.completed ? 'text-accent' : 'text-muted'}`}>
              {current.completed ? 'Completed. Nice work!' : countdownLabel(daysUntilSunday(todayDate))}
            </p>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            aria-expanded={showHistory}
            className="flex w-full items-center justify-between text-sm text-muted hover:text-fg"
          >
            <span>
              History · {completedCount} of {history.length} completed
            </span>
            <ChevronDown size={16} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1.5">
              {history.map((g) => (
                <li key={g.weekStart} className="flex items-start gap-2 text-sm">
                  {g.completed ? (
                    <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-label="Completed" />
                  ) : (
                    <X size={16} className="mt-0.5 shrink-0 text-muted" aria-label="Not completed" />
                  )}
                  <span className="min-w-0 flex-1 break-words">{g.text}</span>
                  <span className="shrink-0 text-xs text-muted">{weekLabel(g.weekStart)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
