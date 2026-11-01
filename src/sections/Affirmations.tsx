import { useEffect, useState } from 'react'
import { animated, useTransition } from '@react-spring/web'
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Card } from '../components/Card'
import { IconButton } from '../components/IconButton'
import { TextForm } from '../components/TextForm'
import { hashString } from '../lib/dates'
import { useToday } from '../lib/useToday'
import { addAffirmation, deleteAffirmation, getAffirmations, updateAffirmation } from '../storage'
import type { Affirmation } from '../types'

export function Affirmations() {
  const today = useToday()
  const [items, setItems] = useState<Affirmation[]>([])
  const [offset, setOffset] = useState(0) // how many times "show another" was pressed today
  const [managing, setManaging] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    getAffirmations().then(setItems)
  }, [])

  // A new day starts from that day's affirmation again.
  useEffect(() => setOffset(0), [today])

  // Hashing the date gives the same pick all day, and a different one tomorrow.
  const shown = items.length > 0 ? items[(hashString(today) + offset) % items.length] : undefined

  const transitions = useTransition(shown ? [shown] : [], {
    keys: (a) => a.id,
    from: { opacity: 0, y: 8 },
    enter: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: -8 },
    config: { tension: 220, friction: 24 },
  })

  const handleDelete = async (a: Affirmation) => {
    if (!window.confirm('Delete this affirmation?')) return
    setItems(await deleteAffirmation(a.id))
  }

  return (
    <Card
      title="Words of affirmation"
      actions={
        <>
          {items.length > 1 && !managing && (
            <IconButton label="Show another" onClick={() => setOffset((o) => o + 1)}>
              <RefreshCw size={16} />
            </IconButton>
          )}
          <button
            type="button"
            onClick={() => {
              setManaging((m) => !m)
              setEditingId(null)
              setAdding(false)
            }}
            className="rounded-lg px-2.5 py-1 text-sm text-muted hover:bg-surface-hover hover:text-fg"
          >
            {managing ? 'Done' : 'Manage'}
          </button>
        </>
      }
    >
      {!managing ? (
        shown ? (
          <div className="grid">
            {/* Old and new quote share one grid cell, so they cross-fade in place. */}
            {transitions((style, item) => (
              <animated.blockquote
                style={style}
                className="col-start-1 row-start-1 py-2 text-xl leading-relaxed font-medium text-balance sm:text-2xl"
              >
                “{item.text}”
              </animated.blockquote>
            ))}
          </div>
        ) : (
          <p className="py-2 text-sm text-muted">
            Add affirmations with <strong>Manage</strong>. One will be shown each day.
          </p>
        )
      ) : (
        <div>
          <ul className="-mx-1">
            {items.map((a) =>
              editingId === a.id ? (
                <li key={a.id} className="px-1 py-1">
                  <TextForm
                    fields={[{ name: 'text', placeholder: 'Affirmation', initial: a.text, required: true }]}
                    submitLabel="Save"
                    onSubmit={async ({ text }) => {
                      setItems(await updateAffirmation(a.id, text))
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={a.id} className="flex items-center gap-1 rounded-lg px-1 hover:bg-surface-hover/60">
                  <span className="min-w-0 flex-1 py-2 pl-2 break-words">{a.text}</span>
                  <IconButton label="Edit" onClick={() => setEditingId(a.id)}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton label="Delete" tone="danger" onClick={() => handleDelete(a)}>
                    <Trash2 size={16} />
                  </IconButton>
                </li>
              ),
            )}
          </ul>
          <div className="mt-2">
            {adding ? (
              <TextForm
                fields={[{ name: 'text', placeholder: 'I am…', required: true }]}
                submitLabel="Add"
                onSubmit={async ({ text }) => setItems(await addAffirmation(text))}
                onCancel={() => setAdding(false)}
                clearOnSubmit
              />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-fg"
              >
                <Plus size={16} /> Add affirmation
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
