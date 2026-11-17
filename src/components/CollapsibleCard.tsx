import { useId, type ReactNode } from 'react'
import { animated, useSpring } from '@react-spring/web'
import { ChevronRight } from 'lucide-react'
import { cardClass } from './Card'

interface CollapsibleCardProps {
  title: string
  /** Short info next to the title, shown open or closed, e.g. "2 due today · 1 overdue". */
  summary?: ReactNode
  /** Buttons at the top right. Only shown while open, so closed cards stay quiet. */
  actions?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}

/**
 * A card that folds into a one-line header (a "disclosure" / dropdown).
 *
 * Accessibility: the header is a real <button> inside the <h2> (the standard
 * accordion pattern), with aria-expanded and aria-controls, so Enter/Space,
 * screen readers and the focus ring all work. The action buttons sit next to
 * it, not inside it (a button inside a button isn't valid HTML).
 *
 * Animation: height + fade (~250 ms). Height uses the same trick as
 * AnimatedList: a one-row grid whose row springs between 0fr and 1fr, so the
 * content's real height never has to be measured. "Reduce motion" skips it
 * (React Spring's global switch in main.tsx/App.tsx).
 *
 * Closed content stays mounted (so the section keeps its data and its summary
 * stays correct) but is `inert`: you can't Tab into it and screen readers skip it.
 */
export function CollapsibleCard({ title, summary, actions, open, onToggle, children }: CollapsibleCardProps) {
  const contentId = useId()
  // On first render the spring simply starts at the right value: nothing animates on page load.
  const { rows, opacity } = useSpring({ rows: open ? 1 : 0, opacity: open ? 1 : 0, config: { tension: 320, friction: 34 } })

  return (
    <section aria-label={title} className={cardClass()}>
      <div className="flex min-h-9 items-center gap-2">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={onToggle}
            className="-m-2 flex min-h-11 w-[calc(100%+1rem)] min-w-0 items-center gap-2 rounded-xl p-2 text-left transition-colors hover:bg-surface-hover/60 active:bg-surface-hover motion-reduce:transition-none"
          >
            <ChevronRight
              size={18}
              aria-hidden
              className={`shrink-0 text-muted transition-transform duration-250 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
            />
            <span className="shrink-0 text-base font-semibold">{title}</span>
            {summary && <span className="min-w-0 truncate text-sm font-normal text-muted">{summary}</span>}
          </button>
        </h2>
        {open && actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>

      <animated.div
        id={contentId}
        inert={!open}
        style={{ display: 'grid', gridTemplateRows: rows.to((r) => `${r}fr`), opacity }}
      >
        {/* Clip only while moving, so focus outlines aren't cut off once it's open. */}
        <animated.div style={{ minHeight: 0, overflow: rows.to((r) => (r < 1 ? 'hidden' : 'visible')) }}>
          <div className="pt-3">{children}</div>
        </animated.div>
      </animated.div>
    </section>
  )
}
