import { addDays, fromDateKey, toDateKey } from '../lib/dates'
import { useElementWidth } from '../lib/useElementWidth'
import type { DateKey, HistoryDay } from '../types'

interface ScoreChartProps {
  /** The days of the last 30 that are in the history (older ones simply have no bar). */
  days: HistoryDay[]
  today: DateKey
  selected: DateKey
  onSelect: (date: DateKey) => void
}

const DAYS = 30
const HEIGHT = 200
const PAD = { top: 10, right: 6, bottom: 22, left: 30 }

const short = (key: DateKey) => fromDateKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** A round number just above the highest score/target, for the top of the axis. */
function niceMax(values: number[]): number {
  const max = Math.max(10, ...values) * 1.15
  const step = max > 200 ? 50 : max > 80 ? 20 : 10
  return Math.ceil(max / step) * step
}

/**
 * Daily scores for the last 30 days as bars: accent when the target was
 * reached, grey when not. The target is a dashed line that steps where it
 * changed. Plain SVG, drawn at its real width (measured with ResizeObserver)
 * so text stays crisp and readable on a phone.
 *
 * Click/tap a bar to show that day below. (Keyboard users pick days in the
 * heatmap, which selects the same day; the chart itself is a picture for
 * screen readers, with a text summary.)
 */
export function ScoreChart({ days, today, selected, onSelect }: ScoreChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const byDate = new Map(days.map((d) => [d.date, d]))
  const slots = Array.from({ length: DAYS }, (_, i) => toDateKey(addDays(fromDateKey(today), i - (DAYS - 1))))

  const top = niceMax(days.flatMap((d) => [d.score, d.target]))
  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const band = plotW / DAYS
  const barW = Math.max(2, band * 0.66)
  const x = (i: number) => PAD.left + i * band
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH

  // Target as a step line: flat across each day, jumping where it changed.
  let path = ''
  slots.forEach((key, i) => {
    const d = byDate.get(key)
    if (!d) return
    const ty = y(d.target).toFixed(1)
    path += `${path && byDate.get(slots[i - 1]) ? 'L' : 'M'}${x(i).toFixed(1)},${ty}H${(x(i) + band).toFixed(1)}`
  })

  const reachedCount = days.filter((d) => d.reached).length
  const average = days.length ? Math.round(days.reduce((s, d) => s + d.score, 0) / days.length) : 0

  return (
    <div ref={ref}>
      <p className="sr-only">
        Last {days.length} days: target reached on {reachedCount}, average score {average} points.
      </p>
      {width > 0 && (
        <svg width={width} height={HEIGHT} aria-hidden className="block overflow-visible">
          {/* Gridlines + y labels: 0, half, top */}
          {[0, top / 2, top].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px]">
                {v}
              </text>
            </g>
          ))}

          {/* Bars (+ a full-height invisible hit area per day, so short bars are easy to tap) */}
          {slots.map((key, i) => {
            const d = byDate.get(key)
            const isSelected = key === selected
            return (
              <g key={key} onClick={() => d && onSelect(key)} className={d ? 'cursor-pointer' : ''}>
                <title>{d ? `${short(key)}: ${d.score} / ${d.target} pts` : `${short(key)}: before history started`}</title>
                <rect x={x(i)} y={PAD.top} width={band} height={plotH} className={isSelected ? 'fill-accent/10' : 'fill-transparent'} />
                {d && d.score > 0 && (
                  <rect
                    x={x(i) + (band - barW) / 2}
                    y={y(d.score)}
                    width={barW}
                    height={Math.max(1, y(0) - y(d.score))}
                    rx={Math.min(3, barW / 3)}
                    className={`transition-opacity ${d.reached ? 'fill-accent' : 'fill-muted/45'} ${isSelected ? 'stroke-fg' : ''}`}
                    strokeWidth={isSelected ? 1.5 : 0}
                  />
                )}
              </g>
            )
          })}

          {/* Target line */}
          {path && <path d={path} fill="none" className="stroke-fg/70" strokeWidth={1.5} strokeDasharray="4 3" />}

          {/* Date labels: today and every 7 days before it */}
          {slots.map((key, i) =>
            (DAYS - 1 - i) % 7 === 0 ? (
              <text key={key} x={x(i) + band / 2} y={HEIGHT - 6} textAnchor="middle" className="fill-muted text-[10px]">
                {key === today ? 'Today' : short(key)}
              </text>
            ) : null,
          )}
        </svg>
      )}
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-accent" /> Target reached
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-muted/45" /> Below target
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line x1="0" x2="18" y1="3" y2="3" className="stroke-fg/70" strokeWidth={1.5} strokeDasharray="4 3" />
          </svg>
          Target
        </span>
      </div>
    </div>
  )
}
