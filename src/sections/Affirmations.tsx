import { useEffect, useState } from 'react'
import { animated, useTransition } from '@react-spring/web'
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { AnimatedList } from '../components/AnimatedList'
import { Card } from '../components/Card'
import { IconButton } from '../components/IconButton'
import { TextForm } from '../components/TextForm'
import { hashString } from '../lib/dates'
import { useToday } from '../lib/useToday'
import { addAffirmation, deleteAffirmation, getAffirmations, updateAffirmation } from '../storage'
import type { Affirmation } from '../types'
import { buttonClass } from '../components/buttonStyles'

export function Affirmations() {
  const today = useToday()
  const [items, setItems] = useState<Affirmation[]>([])
  const [offset, setOffset] = useState(0) // how many times "show another" was pressed today
  const [managing, setManaging] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getAffirmations().then((list) => {
      setItems(list)
      setLoaded(true)
    })
  }, [])

  // A new day starts from that day's affirmation again.
  useEffect(() => setOffset(0), [today])

  // Hashing the date gives the same pick all day, and a different one tomorrow.
  const shown = items.length > 0 ? items[(hashString(today) + offset) % items.length] : undefined

  const handleDelete = async (a: Affirmation) => {
    if (!window.confirm('Delete this affirmation?')) return
    setItems(await deleteAffirmation(a.id))
  }

  if (!loaded) return null

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
            className={buttonClass('ghost')}
          >
            {managing ? 'Done' : 'Manage'}
          </button>
        </>
      }
    >
      {!managing ? (
        shown ? (
          <Quote affirmation={shown} />
        ) : (
          <p className="py-2 text-sm text-muted">
            Add affirmations with <strong>Manage</strong>. One will be shown each day.
          </p>
        )
      ) : (
        <div>
          <AnimatedList items={items} getKey={(a) => a.id} className="-mx-1">
            {(a) =>
              editingId === a.id ? (
                <div className="px-1 py-1">
                  <TextForm
                    fields={[{ name: 'text', placeholder: 'Affirmation', initial: a.text, required: true }]}
                    submitLabel="Save"
                    onSubmit={async ({ text }) => {
                      setItems(await updateAffirmation(a.id, text))
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-xl px-1 transition-colors hover:bg-surface-hover/70 active:bg-surface-hover">
                  <span className="min-w-0 flex-1 py-2 pl-2 break-words">{a.text}</span>
                  <IconButton label="Edit" onClick={() => setEditingId(a.id)}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton label="Delete" tone="danger" onClick={() => handleDelete(a)}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              )
            }
          </AnimatedList>
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
                className={buttonClass('ghost', 'md')}
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

/**
 * The quote, cross-fading when it changes. It's its own component so it's
 * unmounted while you're in Manage: adding or deleting affirmations there changes
 * which one is "today's" behind the scenes, and those changes shouldn't play as
 * fades (they'd leave the animation out of step). Back from Manage, it simply
 * shows the right quote (`initial: null` = no animation on mount).
 */
function Quote({ affirmation }: { affirmation: Affirmation }) {
  const transitions = useTransition([affirmation], {
    keys: (a) => a.id,
    initial: null,
    from: { opacity: 0, y: 8 },
    enter: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: -8 },
    config: { tension: 320, friction: 30 }, // ≈ 300 ms
  })
  return (
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
  )
}
