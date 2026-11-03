import { useEffect, useRef, useState } from 'react'
import { animated, useSpring } from '@react-spring/web'
import { Check, ListPlus, Pencil, Plus, Shuffle, Trash2 } from 'lucide-react'
import { AnimatedList } from '../components/AnimatedList'
import { buttonClass } from '../components/buttonStyles'
import { Card } from '../components/Card'
import { IconButton } from '../components/IconButton'
import { TextForm } from '../components/TextForm'
import { useReducedMotion } from '../lib/useReducedMotion'
import { addIdea, deleteIdea, getIdeas, ideaToTodo, updateIdeaText } from '../storage'
import type { Idea } from '../types'

type Highlight = 'none' | 'rolling' | 'picked'

export function Ideas() {
  const reducedMotion = useReducedMotion()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [rollingId, setRollingId] = useState<string | null>(null) // hops around during the "roulette"
  const [pickedId, setPickedId] = useState<string | null>(null) // where it landed
  const timers = useRef<number[]>([])

  useEffect(() => {
    getIdeas().then((list) => {
      setIdeas(list)
      setLoaded(true)
    })
    return () => timers.current.forEach(clearTimeout)
  }, [])

  const reveal = (id: string) => {
    setRollingId(null)
    setPickedId(id)
    document.querySelector(`[data-idea-id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  /**
   * Picks a random idea, preferring ones not yet sent to To-Do. With motion on,
   * the highlight first hops between random ideas, slowing down (~700 ms), then lands.
   */
  const pickOne = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    const fresh = ideas.filter((i) => !i.todoId)
    const pool = fresh.length > 0 ? fresh : ideas
    if (pool.length === 0) return
    const winner = pool[Math.floor(Math.random() * pool.length)]
    if (reducedMotion || pool.length === 1) return reveal(winner.id)

    setPickedId(null)
    let t = 0
    for (let step = 0; step < 8; step++) {
      t += 40 + step * 10 // each hop a little slower than the last
      const id = pool[Math.floor(Math.random() * pool.length)].id
      timers.current.push(window.setTimeout(() => setRollingId(id), t))
    }
    timers.current.push(window.setTimeout(() => reveal(winner.id), t + 100))
  }

  const handleDelete = async (idea: Idea) => {
    if (!window.confirm(`Delete "${idea.text}"?`)) return
    if (pickedId === idea.id) setPickedId(null)
    setIdeas(await deleteIdea(idea.id))
  }

  if (!loaded) return null

  const unused = ideas.filter((i) => !i.todoId).length

  return (
    <Card
      title="Ideas"
      meta={ideas.length > 0 && `${unused} to try`}
      actions={
        ideas.length > 0 && (
          <button type="button" onClick={pickOne} className={buttonClass('outline')}>
            <Shuffle size={14} /> Pick one for me
          </button>
        )
      }
    >
      {ideas.length === 0 && !adding && (
        <p className="py-2 text-sm text-muted">
          Dump ideas of things you could do here. When you don't know what to do, let it pick one.
        </p>
      )}

      <AnimatedList items={ideas} getKey={(i) => i.id} className="-mx-1">
        {(idea) => {
          if (editingId === idea.id) {
            return (
              <div className="px-1 py-1">
                <TextForm
                  fields={[{ name: 'text', placeholder: 'Idea', initial: idea.text, required: true }]}
                  submitLabel="Save"
                  onSubmit={async ({ text }) => {
                    setIdeas(await updateIdeaText(idea.id, text))
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )
          }
          return (
            <div data-idea-id={idea.id}>
              <IdeaRow
                idea={idea}
                highlight={rollingId === idea.id ? 'rolling' : pickedId === idea.id && !rollingId ? 'picked' : 'none'}
                onConvert={() => setConvertingId(convertingId === idea.id ? null : idea.id)}
                onEdit={() => setEditingId(idea.id)}
                onDelete={() => handleDelete(idea)}
              />
              {convertingId === idea.id && (
                <div className="px-1 pb-2">
                  <TextForm
                    fields={[{ name: 'dueDate', placeholder: 'Due date (optional)', type: 'date' }]}
                    submitLabel="Add to To-Do"
                    onSubmit={async ({ dueDate }) => {
                      setIdeas(await ideaToTodo(idea.id, dueDate || undefined))
                      setConvertingId(null)
                    }}
                    onCancel={() => setConvertingId(null)}
                    autoFocus={false}
                  />
                </div>
              )}
            </div>
          )
        }}
      </AnimatedList>

      <div className="mt-2">
        {adding ? (
          <TextForm
            fields={[{ name: 'text', placeholder: 'Something I could do…', required: true }]}
            submitLabel="Add"
            onSubmit={async ({ text }) => setIdeas(await addIdea(text))}
            onCancel={() => setAdding(false)}
            clearOnSubmit
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={buttonClass('ghost', 'md')}>
            <Plus size={16} /> Add idea
          </button>
        )}
      </div>
    </Card>
  )
}

interface IdeaRowProps {
  idea: Idea
  highlight: Highlight
  onConvert: () => void
  onEdit: () => void
  onDelete: () => void
}

function IdeaRow({ idea, highlight, onConvert, onEdit, onDelete }: IdeaRowProps) {
  const added = !!idea.todoId
  // A small "pop" when the roulette lands on this idea.
  const [{ scale }, api] = useSpring(() => ({ scale: 1 }))
  useEffect(() => {
    if (highlight === 'picked') {
      api.start({ to: [{ scale: 1.03 }, { scale: 1 }], config: { tension: 500, friction: 18 } })
    }
  }, [highlight, api])

  const tone = {
    none: 'hover:bg-surface-hover/70 active:bg-surface-hover',
    rolling: 'bg-accent-soft',
    picked: 'bg-accent-soft ring-2 ring-accent',
  }[highlight]

  return (
    <animated.div
      style={{ scale }}
      aria-current={highlight === 'picked' ? 'true' : undefined}
      className={`flex items-center gap-1 rounded-xl py-1 pr-1 pl-3 transition-colors duration-100 ${tone}`}
    >
      <div className="min-w-0 flex-1 py-1.5">
        <p className={`break-words ${added ? 'text-muted' : ''}`}>{idea.text}</p>
        {highlight === 'picked' && !added && <p className="text-xs font-medium text-accent">How about this one?</p>}
        {added && (
          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs">
            <Check size={12} className="text-accent" /> Added to To-Do
          </span>
        )}
      </div>
      {!added && (
        <IconButton label={`Add "${idea.text}" to To-Do`} onClick={onConvert}>
          <ListPlus size={16} />
        </IconButton>
      )}
      <IconButton label={`Edit "${idea.text}"`} onClick={onEdit}>
        <Pencil size={16} />
      </IconButton>
      <IconButton label={`Delete "${idea.text}"`} tone="danger" onClick={onDelete}>
        <Trash2 size={16} />
      </IconButton>
    </animated.div>
  )
}
