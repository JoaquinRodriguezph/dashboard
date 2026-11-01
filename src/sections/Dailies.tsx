import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '../components/Card'
import { CheckButton } from '../components/CheckButton'
import { IconButton } from '../components/IconButton'
import { ProgressRing } from '../components/ProgressRing'
import { TextForm, type TextField } from '../components/TextForm'
import { useToday } from '../lib/useToday'
import { normalizeUrl } from '../lib/url'
import {
  addDaily,
  deleteDaily,
  getDailies,
  getDailyChecks,
  moveDaily,
  setDailyChecked,
  updateDaily,
} from '../storage'
import type { Daily } from '../types'

function dailyFields(daily?: Daily): TextField[] {
  return [
    { name: 'title', placeholder: 'Task name', initial: daily?.title, required: true },
    {
      name: 'url',
      placeholder: 'Link (optional), e.g. duolingo.com',
      initial: daily?.url,
      type: 'url',
      validate: (v) => (v && !normalizeUrl(v) ? "That doesn't look like a web address" : null),
    },
  ]
}

function progressLabel(done: number, total: number): string {
  if (done === total) return 'All done for today'
  const left = total - done
  return `${left} left today`
}

export function Dailies() {
  const today = useToday()
  const [dailies, setDailies] = useState<Daily[]>([])
  const [doneIds, setDoneIds] = useState<string[]>([])
  const [managing, setManaging] = useState(false) // shows reorder/edit/delete buttons
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    getDailies().then(setDailies)
  }, [])

  // Runs again whenever `today` changes (at midnight), which clears the checks.
  useEffect(() => {
    getDailyChecks(today).then(setDoneIds)
  }, [today])

  const doneCount = dailies.filter((d) => doneIds.includes(d.id)).length

  const handleAdd = async ({ title, url }: Record<string, string>) => {
    setDailies(await addDaily({ title, url: normalizeUrl(url) }))
    // Keep the form open so several tasks can be added in a row.
  }

  const handleEdit = async (id: string, { title, url }: Record<string, string>) => {
    setDailies(await updateDaily(id, { title, url: normalizeUrl(url) }))
    setEditingId(null)
  }

  const handleDelete = async (daily: Daily) => {
    if (!window.confirm(`Delete "${daily.title}"?`)) return
    setDailies(await deleteDaily(daily.id))
  }

  return (
    <Card
      title="Dailies"
      variant="featured"
      leading={dailies.length > 0 && <ProgressRing done={doneCount} total={dailies.length} />}
      meta={dailies.length > 0 && progressLabel(doneCount, dailies.length)}
      actions={
        dailies.length > 0 && (
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
        )
      }
    >
      {dailies.length === 0 && !adding && (
        <p className="py-2 text-sm text-muted">No daily tasks yet. Add the things you want to do every day.</p>
      )}

      <ul className="-mx-1">
        {dailies.map((daily, index) => {
          const done = doneIds.includes(daily.id)

          if (editingId === daily.id) {
            return (
              <li key={daily.id} className="px-1 py-1">
                <TextForm
                  fields={dailyFields(daily)}
                  submitLabel="Save"
                  onSubmit={(v) => handleEdit(daily.id, v)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            )
          }

          return (
            <li key={daily.id} className="flex items-center gap-1 rounded-lg px-1 hover:bg-surface-hover/60">
              <CheckButton
                checked={done}
                label={daily.title}
                onChange={async (checked) => setDoneIds(await setDailyChecked(today, daily.id, checked))}
              />
              {daily.url ? (
                <a
                  href={daily.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`min-w-0 flex-1 truncate py-2.5 text-base hover:underline sm:text-lg ${done ? 'text-muted line-through' : ''}`}
                >
                  {daily.title}
                </a>
              ) : (
                <span
                  onClick={async () => setDoneIds(await setDailyChecked(today, daily.id, !done))}
                  className={`min-w-0 flex-1 cursor-pointer truncate py-2.5 text-base select-none sm:text-lg ${done ? 'text-muted line-through' : ''}`}
                >
                  {daily.title}
                </span>
              )}

              {managing ? (
                <>
                  <IconButton label="Move up" disabled={index === 0} onClick={async () => setDailies(await moveDaily(daily.id, -1))}>
                    <ArrowUp size={16} />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={index === dailies.length - 1}
                    onClick={async () => setDailies(await moveDaily(daily.id, 1))}
                  >
                    <ArrowDown size={16} />
                  </IconButton>
                  <IconButton label="Edit" onClick={() => setEditingId(daily.id)}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton label="Delete" tone="danger" onClick={() => handleDelete(daily)}>
                    <Trash2 size={16} />
                  </IconButton>
                </>
              ) : (
                daily.url && (
                  <a
                    href={daily.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open link for ${daily.title}`}
                    title={daily.url}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-fg"
                  >
                    <ExternalLink size={16} />
                  </a>
                )
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-2">
        {adding ? (
          <TextForm fields={dailyFields()} submitLabel="Add" onSubmit={handleAdd} onCancel={() => setAdding(false)} clearOnSubmit />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-fg"
          >
            <Plus size={16} /> Add task
          </button>
        )}
      </div>
    </Card>
  )
}
