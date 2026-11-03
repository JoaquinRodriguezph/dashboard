import { useEffect, useState } from 'react'
import { animated, useSpring } from '@react-spring/web'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
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
  setDailyOrder,
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

/** Dragging only moves up and down, never sideways. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

/** What screen readers hear during a drag (dnd-kit's defaults would read out ids). */
function announcements(dailies: Daily[]): Announcements {
  const title = (id: UniqueIdentifier) => dailies.find((d) => d.id === id)?.title ?? 'task'
  const position = (id: UniqueIdentifier) => dailies.findIndex((d) => d.id === id) + 1
  return {
    onDragStart: ({ active }) => `Picked up ${title(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${title(active.id)} is over position ${position(over.id)} of ${dailies.length}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${title(active.id)} dropped at position ${position(over.id)}.` : `${title(active.id)} dropped.`),
    onDragCancel: ({ active }) => `Moving ${title(active.id)} was cancelled.`,
  }
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

  // ── Drag to reorder ──
  // Pointer covers mouse AND touch (the handle has touch-action: none, so a drag
  // there never scrolls the page). The small distance stops a tap from counting
  // as a drag. Keyboard: focus a handle, Space to lift, arrows to move, Space to drop.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  // dnd-kit already slides rows while dragging, so the list's own FLIP slide is
  // paused during a drag and switched back on right after the drop has rendered.
  const [flip, setFlip] = useState(true)

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      const from = dailies.findIndex((d) => d.id === active.id)
      const to = dailies.findIndex((d) => d.id === over.id)
      const reordered = arrayMove(dailies, from, to)
      setDailies(reordered) // update the screen immediately…
      void setDailyOrder(reordered.map((d) => d.id)) // …and save in the background
    }
    requestAnimationFrame(() => setFlip(true))
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

      {/* Drag-and-drop: DndContext tracks the drag, SortableContext knows the order. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[verticalOnly]}
        accessibility={{ announcements: announcements(dailies) }}
        onDragStart={() => setFlip(false)}
        onDragCancel={() => setFlip(true)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={dailies.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          <AnimatedList items={dailies} getKey={(d) => d.id} className="-mx-1" flip={flip}>
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
                  canDrag={dailies.length > 1}
                />
              )
            }
          </AnimatedList>
        </SortableContext>
      </DndContext>

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
  canDrag: boolean
}

/**
 * One task. Briefly glows in the accent color when you check it.
 * Draggable by its grip handle (only the handle, so taps and scrolling elsewhere work normally).
 */
function DailyRow({ daily, done, onToggle, managing, isFirst, isLast, onMove, onEdit, onDelete, canDrag }: DailyRowProps) {
  const [{ glow }, glowApi] = useSpring(() => ({ glow: 0 }))
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: daily.id,
    disabled: !canDrag,
  })

  const handleToggle = (checked: boolean) => {
    if (checked) glowApi.start({ from: { glow: 1 }, to: { glow: 0 }, config: { duration: 400 } })
    onToggle(checked)
  }

  const titleClass = 'min-w-0 flex-1 truncate py-2.5 text-base sm:text-lg'

  return (
    <animated.div
      ref={setNodeRef}
      style={{
        backgroundColor: glow.to((g) => `color-mix(in oklab, var(--accent) ${g * 18}%, transparent)`),
        // dnd-kit moves rows with a transform while dragging and animates them into place.
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={`flex items-center gap-1 rounded-xl px-1 transition-colors hover:bg-surface-hover/70 active:bg-surface-hover ${
        isDragging ? 'relative z-10 bg-surface shadow-lg ring-1 ring-accent/40' : ''
      }`}
    >
      {canDrag && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder "${daily.title}"`}
          title="Drag to reorder (or focus and press Space, then use arrow keys)"
          className={`-mr-1 inline-flex h-9 w-6 shrink-0 touch-none items-center justify-center rounded-md text-muted/60 transition-colors hover:bg-surface-hover hover:text-fg ${
            isDragging ? 'cursor-grabbing text-accent' : 'cursor-grab'
          }`}
        >
          <GripVertical size={16} />
        </button>
      )}
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
