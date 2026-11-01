import type { ReactNode } from 'react'

interface CardProps {
  title: string
  /** Small text next to the title, e.g. "Nov 1 – Nov 7". */
  meta?: ReactNode
  /** Shown left of the title, e.g. a progress ring. */
  leading?: ReactNode
  /** Buttons shown at the top right. */
  actions?: ReactNode
  /** "featured" = the page's main card: accent border, glow, bigger title. */
  variant?: 'default' | 'featured'
  /** Lets other parts of the page scroll to this card. */
  id?: string
  /** Extra classes, e.g. for highlighting. */
  className?: string
  children: ReactNode
}

const VARIANT_CLASS = {
  default: 'border-line bg-surface p-4 shadow-sm sm:p-5',
  // bg-surface sets the color; the gradient (a background *image*) adds an accent wash on top.
  featured:
    'border-accent/40 bg-surface bg-linear-to-b from-accent-soft to-transparent to-40% p-5 shadow-lg shadow-accent/10 ring-1 ring-accent/10 sm:p-7',
}

/** The box every section lives in. */
export function Card({ title, meta, leading, actions, variant = 'default', id, className = '', children }: CardProps) {
  const featured = variant === 'featured'
  return (
    <section
      id={id}
      aria-label={title}
      className={`scroll-mt-6 rounded-2xl border backdrop-blur-md ${VARIANT_CLASS[variant]} ${className}`}
    >
      <div className={`flex min-h-9 items-center justify-between gap-3 ${featured ? 'mb-5' : 'mb-3'}`}>
        <div className="flex min-w-0 items-center gap-4">
          {leading}
          <div className={`flex min-w-0 ${leading ? 'flex-col' : 'flex-wrap items-baseline gap-x-2'}`}>
            <h2 className={featured ? 'text-xl font-semibold tracking-tight sm:text-2xl' : 'text-base font-semibold'}>
              {title}
            </h2>
            {meta && <span className="text-sm text-muted">{meta}</span>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children}
    </section>
  )
}
