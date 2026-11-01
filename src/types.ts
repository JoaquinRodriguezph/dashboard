// All the shapes of data the app stores. storage.ts reads and writes these.

/** A calendar date in local time, formatted "YYYY-MM-DD" (e.g. "2026-11-01"). */
export type DateKey = string

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  name: string
  theme: ThemePreference
  hideCompletedGoals: boolean
}

/** A task that repeats every day. List order = display order. */
export interface Daily {
  id: string
  title: string
  url?: string
}

/**
 * Which dailies are checked, and on which day. If `date` isn't today, every
 * task counts as unchecked: that's how the midnight reset works.
 */
export interface DailyChecks {
  date: DateKey
  doneIds: string[]
}

/** One week's major goal. `weekStart` is the Sunday that week begins on. */
export interface WeeklyGoal {
  weekStart: DateKey
  text: string
  completed: boolean
  completedAt?: string // ISO timestamp
}

export interface Affirmation {
  id: string
  text: string
  createdAt: string
}

export type GoalList = 'short' | 'life'

export interface Goal {
  id: string
  text: string
  list: GoalList
  completed: boolean
  createdAt: string
  completedAt?: string
}

/** Everything, bundled together. Used for export/import backups. */
export interface AllData {
  settings: Settings
  dailies: Daily[]
  dailyChecks: DailyChecks
  weeklyGoals: WeeklyGoal[]
  affirmations: Affirmation[]
  goals: Goal[]
}
