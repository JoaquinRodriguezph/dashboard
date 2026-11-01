import { animated, useSpring } from '@react-spring/web'
import { Check } from 'lucide-react'

interface CheckButtonProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

/** A round checkbox. Uses role="checkbox" so screen readers treat it like one. */
export function CheckButton({ checked, onChange, label }: CheckButtonProps) {
  // The filled circle springs in with a small overshoot ("pop") when checked.
  const { scale } = useSpring({ scale: checked ? 1 : 0, config: { tension: 520, friction: 17 } })

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-150 active:scale-85 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <span
        className={`relative flex size-5.5 items-center justify-center rounded-full border-2 transition-colors ${
          checked ? 'border-accent' : 'border-muted/50 group-hover:border-accent group-hover:bg-accent-soft'
        }`}
      >
        <animated.span
          style={{ scale }}
          className="absolute -inset-0.5 flex items-center justify-center rounded-full bg-accent text-accent-fg"
        >
          <Check size={14} strokeWidth={3} />
        </animated.span>
      </span>
    </button>
  )
}
