// All the shapes of data the app stores. storage.ts reads and writes these.

/** A calendar date in local time, formatted "YYYY-MM-DD" (e.g. "2026-11-01"). */
export type DateKey = string

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  name: string
  theme: ThemePreference
  hideCompletedGoals: boolean
  hideCompletedTodos: boolean
  /** Points needed for a "good day". */
  dailyTarget: number
  doubleExposure: DoubleExposureSettings
  background: BackgroundSettings
}

/** Sections that can be collapsed into a one-line header. */
export type CollapsibleSection = 'todo' | 'ideas' | 'goals'

/**
 * Display preferences for THIS device only (like the theme). Not part of
 * backups: your phone and laptop can each have their own layout.
 */
export interface DevicePrefs {
  /** true = collapsed. */
  collapsed: Record<CollapsibleSection, boolean>
  todoView: 'list' | 'calendar'
}

/** Animations on the full-page photo background. All are skipped with "reduce motion". */
export interface BackgroundSettings {
  /** Very slow pan and zoom (~50 s cycle). */
  panZoom: boolean
  /** Faint flickering film grain on top. */
  grain: boolean
  /** A soft white glow drifting across. */
  glow: boolean
  /** Real-time WebGL blend of the photos (lazy-loaded). */
  live: boolean
}

/** A one-off task. `dueDate` is the day it should be finished by (local date). */
export interface Todo {
  id: string
  text: string
  dueDate?: DateKey
  completed: boolean
  createdAt: string
  completedAt?: string
  /** What completing it is worth (whole number, 0–999). */
  points: number
}

/**
 * Settings for the film double-exposure banner. Every slider is 0–1 except
 * `exposure`, which is a light multiplier (see lib/exposure/render.ts).
 */
export interface DoubleExposureSettings {
  enabled: boolean
  /** Same photos + same settings + same seed = the same image. Re-roll picks a new seed. */
  seed: number
  exposure: number
  grain: number
  lightLeak: number
  vignette: number
  misalignment: number
  frameOverlap: number
  color: ExposureColor
}

/** natural = your photos' true colours; warm = orange-tinted film look; bw = black & white. */
export type ExposureColor = 'natural' | 'warm' | 'bw'

/** An uploaded photo, already downscaled. Stored in IndexedDB (not localStorage). */
export interface Photo {
  id: string
  blob: Blob // JPEG
  width: number
  height: number
  createdAt: string
}

/** The last generated double exposure, cached so startup doesn't regenerate it. */
export interface ExposureResult {
  /** Fingerprint of everything that went into it (photo ids + settings + seed). */
  recipeKey: string
  blob: Blob // JPEG
  createdAt: string
}

/** A task that repeats every day. List order = display order. */
export interface Daily {
  id: string
  title: string
  url?: string
  /** What ticking it off is worth (whole number, 0–999). */
  points: number
}

/** One thing completed on a day, as it was AT THAT MOMENT (a snapshot). */
export interface DayItem {
  kind: 'daily' | 'todo'
  /** The daily's or task's id, so unticking can find it again. */
  id: string
  name: string
  points: number
  /** When it was completed (ISO timestamp). */
  at: string
}

/**
 * Everything about one day's score. Only today's record ever changes; once the
 * date is in the past, the record is final. Names, points and the target are
 * copied in, so editing or deleting items (or the target) later never changes it.
 */
export interface DayRecord {
  date: DateKey
  items: DayItem[]
  /** Sum of the items' points. */
  score: number
  /** The daily target that applied on this day. */
  target: number
  reached: boolean
  /** The first moment the target was reached that day: the celebration plays only once. */
  reachedAt?: string
}

/**
 * Which dailies are checked, and on which day. If `date` isn't today, every
 * task counts as unchecked: that's how the midnight reset works.
 */
export interface DailyChecks {
  date: DateKey
  doneIds: string[]
}

/**
 * One day in a history range: a saved record, or a "missed" day with no
 * activity (score 0). Missed days aren't stored; they're filled in when read.
 */
export type HistoryDay = DayRecord & { missed: boolean }

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
  todos: Todo[]
  ideas: Idea[]
  /** Every saved day, keyed by date. */
  history: Record<DateKey, DayRecord>
  /** The first day history was kept. */
  historyStart: DateKey | null
}

/** Something I could do. Can be sent to the To-Do list, after which it's marked as added. */
export interface Idea {
  id: string
  text: string
  createdAt: string
  /** Set when the idea was turned into a To-Do task. */
  todoId?: string
  addedToTodoAt?: string
}

/**
 * What an import provides. Lists that were added in later versions are optional:
 * an older backup doesn't have them, and importing it keeps the current ones.
 */
type AddedLater = 'todos' | 'ideas' | 'history' | 'historyStart'
export type ImportData = Omit<AllData, AddedLater> & Partial<Pick<AllData, AddedLater>>
