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
      className="group inline-flex size-9 shrink-0 items-center justify-center rounded-full"
    >
      <span
        className={`relative flex size-5.5 items-center justify-center rounded-full border-2 transition-colors ${
          checked ? 'border-accent' : 'border-line group-hover:border-accent'
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
