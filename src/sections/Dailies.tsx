import { useEffect, useState } from 'react'
import { animated, useSpring } from '@react-spring/web'
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { AnimatedList } from '../components/AnimatedList'
import { buttonClass } from '../components/buttonStyles'
import { Card } from '../components/Card'
import { Celebration } from '../components/Celebration'
import { CheckButton } from '../components/CheckButton'
import { IconButton } from '../components/IconButton'
import { ProgressRing } from '../components/ProgressRing'
import { StrikeText } from '../components/StrikeText'
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
  if (done === total) return 'All done for today 🎉'
  const left = total - done
  return `${left} left today`
}

export function Dailies() {
  const today = useToday()
  const [dailies, setDailies] = useState<Daily[]>([])
  const [doneIds, setDoneIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [managing, setManaging] = useState(false) // shows reorder/edit/delete buttons
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [celebrate, setCelebrate] = useState(0) // bump to fire the "all done" burst

  // Loads tasks and today's checks together, and again whenever `today` changes
  // (at midnight), which clears the checks. The list renders only after the
  // first load, so nothing animates just because data arrived.
  useEffect(() => {
    Promise.all([getDailies(), getDailyChecks(today)]).then(([list, checks]) => {
      setDailies(list)
      setDoneIds(checks)
      setLoaded(true)
    })
  }, [today])

  const doneCount = dailies.filter((d) => doneIds.includes(d.id)).length

  const toggle = async (daily: Daily, checked: boolean) => {
    const next = await setDailyChecked(today, daily.id, checked)
    setDoneIds(next)
    const allDone = dailies.length > 0 && dailies.every((d) => next.includes(d.id))
    if (checked && allDone) setCelebrate((c) => c + 1)
  }

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

  if (!loaded) return null

  return (
    <Card
      title="Dailies"
      variant="featured"
      leading={
        dailies.length > 0 && (
          <div className="relative">
            <ProgressRing done={doneCount} total={dailies.length} />
            <Celebration trigger={celebrate} />
          </div>
        )
      }
      meta={dailies.length > 0 && progressLabel(doneCount, dailies.length)}
      actions={
        dailies.length > 0 && (
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
        )
      }
    >
      {dailies.length === 0 && !adding && (
        <p className="py-2 text-sm text-muted">No daily tasks yet. Add the things you want to do every day.</p>
      )}

      <AnimatedList items={dailies} getKey={(d) => d.id} className="-mx-1">
        {(daily) =>
          editingId === daily.id ? (
            <div className="px-1 py-1">
              <TextForm
                fields={dailyFields(daily)}
                submitLabel="Save"
                onSubmit={(v) => handleEdit(daily.id, v)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <DailyRow
              daily={daily}
              done={doneIds.includes(daily.id)}
              onToggle={(checked) => toggle(daily, checked)}
              managing={managing}
              isFirst={dailies[0]?.id === daily.id}
              isLast={dailies[dailies.length - 1]?.id === daily.id}
              onMove={async (dir) => setDailies(await moveDaily(daily.id, dir))}
              onEdit={() => setEditingId(daily.id)}
              onDelete={() => handleDelete(daily)}
            />
          )
        }
      </AnimatedList>

      <div className="mt-2">
        {adding ? (
          <TextForm fields={dailyFields()} submitLabel="Add" onSubmit={handleAdd} onCancel={() => setAdding(false)} clearOnSubmit />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={buttonClass('ghost', 'md')}>
            <Plus size={16} /> Add task
          </button>
        )}
      </div>
    </Card>
  )
}

interface DailyRowProps {
  daily: Daily
  done: boolean
  onToggle: (checked: boolean) => void
  managing: boolean
  isFirst: boolean
  isLast: boolean
  onMove: (direction: -1 | 1) => void
  onEdit: () => void
  onDelete: () => void
}

/** One task. Briefly glows in the accent color when you check it. */
function DailyRow({ daily, done, onToggle, managing, isFirst, isLast, onMove, onEdit, onDelete }: DailyRowProps) {
  const [{ glow }, glowApi] = useSpring(() => ({ glow: 0 }))

  const handleToggle = (checked: boolean) => {
    if (checked) glowApi.start({ from: { glow: 1 }, to: { glow: 0 }, config: { duration: 400 } })
    onToggle(checked)
  }

  const titleClass = 'min-w-0 flex-1 truncate py-2.5 text-base sm:text-lg'

  return (
    <animated.div
      style={{ backgroundColor: glow.to((g) => `color-mix(in oklab, var(--accent) ${g * 18}%, transparent)`) }}
      className="flex items-center gap-1 rounded-xl px-1 transition-colors hover:bg-surface-hover/70 active:bg-surface-hover"
    >
      <CheckButton checked={done} label={daily.title} onChange={handleToggle} />
      {daily.url ? (
        <a href={daily.url} target="_blank" rel="noopener noreferrer" className={`${titleClass} rounded hover:underline`}>
          <StrikeText struck={done}>{daily.title}</StrikeText>
        </a>
      ) : (
        <span onClick={() => handleToggle(!done)} className={`${titleClass} cursor-pointer select-none`}>
          <StrikeText struck={done}>{daily.title}</StrikeText>
        </span>
      )}

      {managing ? (
        <>
          <IconButton label="Move up" disabled={isFirst} onClick={() => onMove(-1)}>
            <ArrowUp size={16} />
          </IconButton>
          <IconButton label="Move down" disabled={isLast} onClick={() => onMove(1)}>
            <ArrowDown size={16} />
          </IconButton>
          <IconButton label="Edit" onClick={onEdit}>
            <Pencil size={16} />
          </IconButton>
          <IconButton label="Delete" tone="danger" onClick={onDelete}>
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
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-hover hover:text-fg active:scale-90 motion-reduce:transition-none"
          >
            <ExternalLink size={16} />
          </a>
        )
      )}
    </animated.div>
  )
}
