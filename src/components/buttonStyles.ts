// One place for all button styles, so every button has the same hover, focus
// and pressed feedback. Usage: <button className={buttonClass('ghost')}>
//
//  hover   → background tint (only on devices with a real pointer; Tailwind v4's
//            `hover:` is wrapped in @media (hover: hover), so phones don't get
//            stuck in a hover state after a tap)
//  active  → pressed: shrinks slightly and darkens. This is the touch feedback.
//  focus   → the accent outline from index.css (:focus-visible), keyboard only

export type ButtonVariant = 'ghost' | 'primary' | 'outline'
export type ButtonSize = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg select-none transition duration-150 ' +
  'active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 ' +
  'motion-reduce:transition-none motion-reduce:active:scale-100'

const VARIANTS: Record<ButtonVariant, string> = {
  ghost: 'text-muted hover:bg-surface-hover hover:text-fg active:bg-line/70 active:text-fg',
  primary: 'bg-accent font-medium text-accent-fg shadow-sm hover:brightness-110 hover:shadow-md active:brightness-95',
  outline: 'border border-line bg-surface hover:border-accent/50 hover:bg-surface-hover active:bg-line/60',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-sm',
  md: 'px-3 py-1.5 text-sm',
}

export function buttonClass(variant: ButtonVariant = 'ghost', size: ButtonSize = 'sm'): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`
}
