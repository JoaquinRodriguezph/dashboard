import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, Flame, Trophy } from 'lucide-react'
import { buttonClass } from '../components/buttonStyles'
import { Card } from '../components/Card'
import { addDays, fromDateKey, toDateKey, weekStartOf } from '../lib/dates'
import { streaks, summarize, type PeriodSummary } from '../lib/stats'
import { useToday } from '../lib/useToday'
import { DayDetails } from '../stats/DayDetails'
import { Heatmap } from '../stats/Heatmap'
import { ScoreChart } from '../stats/ScoreChart'
import { history } from '../storage'
import type { DateKey, HistoryDay } from '../types'

/**
 * The Statistics page (#/stats). Loaded lazily (React.lazy in App.tsx), so
 * none of this code is downloaded until you open it.
 * Everything is calculated from history.getRange(): one entry per day since
 * history started, missed days included.
 */
export default function StatsPage({ onBack }: { onBack: () => void }) {
  const today = useToday()
  const [days, setDays] = useState<HistoryDay[] | null>(null)
  const [start, setStart] = useState<DateKey>(today)
  const [selected, setSelected] = useState<DateKey>(today)

  useEffect(() => {
    // Reloads at midnight too (useToday changes), so "today" is always right.
    history.getStart().then(async (s) => {
      setStart(s)
      setDays(await history.getRange(s, today))
    })
  }, [today])

  const byDate = new Map((days ?? []).map((d) => [d.date, d]))
  const { current, best } = streaks(days ?? [], today)
  const weekFrom = weekStartOf(fromDateKey(today))
  const monthFrom = `${today.slice(0, 8)}01`
  const week = summarize((days ?? []).filter((d) => d.date >= weekFrom))
  const month = summarize((days ?? []).filter((d) => d.date >= monthFrom))
  const last30From = toDateKey(addDays(fromDateKey(today), -29))
  const last30 = (days ?? []).filter((d) => d.date >= last30From)

  return (
    <div className="pb-16">
      <header className="flex items-center gap-3 py-6 sm:py-10">
        <button type="button" onClick={onBack} className={`${buttonClass('outline', 'md')} bg-surface/70 backdrop-blur-xl`}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">Statistics</h1>
      </header>

      {!days ? null : (
        <div className="flex flex-col gap-4 lg:gap-6">
          {/* Streaks + this week / this month */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            <StatCard title="Current streak" icon={<Flame size={18} className="text-accent" />}>
              <Big>{current}</Big> <Unit>day{current === 1 ? '' : 's'}</Unit>
              <Sub>target reached in a row</Sub>
            </StatCard>
            <StatCard title="Best streak" icon={<Trophy size={18} className="text-accent" />}>
              <Big>{best}</Big> <Unit>day{best === 1 ? '' : 's'}</Unit>
              <Sub>since {fromDateKey(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Sub>
            </StatCard>
            <PeriodCard title="This week" summary={week} />
            <PeriodCard title="This month" summary={month} />
          </div>

          <Card title="Activity" meta="Tap a day for details">
            <Heatmap days={days} start={start} today={today} selected={selected} onSelect={setSelected} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
            <Card title="Last 30 days" meta="Daily score vs target">
              <ScoreChart days={last30} today={today} selected={selected} onSelect={setSelected} />
            </Card>
            <Card title="Day details">
              <DayDetails date={selected} day={selected >= start ? byDate.get(selected) : undefined} today={today} />
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <Card title={title} leading={icon}>
      <div className="-mt-1">{children}</div>
    </Card>
  )
}

/** "5 of 7 days" reached, plus average and total, for a week or month so far. */
function PeriodCard({ title, summary }: { title: string; summary: PeriodSummary }) {
  return (
    <StatCard title={title}>
      <Big>{summary.reached}</Big> <Unit>of {summary.days} days</Unit>
      <Sub>target reached</Sub>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 text-sm">
        <dt className="text-muted">Average</dt>
        <dd className="text-right font-medium tabular-nums">{summary.average} pts</dd>
        <dt className="text-muted">Total</dt>
        <dd className="text-right font-medium tabular-nums">{summary.total} pts</dd>
      </dl>
    </StatCard>
  )
}

const Big = ({ children }: { children: ReactNode }) => <span className="text-3xl font-semibold tabular-nums">{children}</span>
const Unit = ({ children }: { children: ReactNode }) => <span className="text-sm text-muted">{children}</span>
const Sub = ({ children }: { children: ReactNode }) => <p className="text-xs text-muted">{children}</p>
