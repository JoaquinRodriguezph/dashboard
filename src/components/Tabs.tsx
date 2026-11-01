import { animated, useSpring } from '@react-spring/web'

interface Tab<T extends string> {
  id: T
  label: string
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[]
  active: T
  onChange: (id: T) => void
  label: string
}

/** A segmented control for switching between views, with a sliding highlight. */
export function Tabs<T extends string>({ tabs, active, onChange, label }: TabsProps<T>) {
  const index = Math.max(0, tabs.findIndex((t) => t.id === active))
  // The highlight is as wide as one tab, so moving it by 100% = one tab over.
  const indicator = useSpring({ x: `${index * 100}%`, config: { tension: 380, friction: 32 } })

  return (
    <div role="tablist" aria-label={label} className="relative flex rounded-xl bg-bg/70 p-1">
      <animated.div
        aria-hidden
        style={{ ...indicator, width: `calc((100% - 0.5rem) / ${tabs.length})` }}
        className="absolute inset-y-1 left-1 rounded-lg bg-surface shadow-sm"
      />
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              selected ? 'text-fg' : 'text-muted hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
