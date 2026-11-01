// ─────────────────────────────────────────────────────────────────────────────
// storage.ts — the ONLY file that knows where data lives.
//
// Every function is async (returns a Promise) even though localStorage is
// synchronous. That way, when this is swapped for Supabase (which is async
// because it talks over the network), no UI code has to change.
//
// Functions that change a list return the updated list, so the UI can do:
//   setDailies(await deleteDaily(id))
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AllData,
  Affirmation,
  Daily,
  DailyChecks,
  DateKey,
  Goal,
  GoalList,
  Settings,
  WeeklyGoal,
} from './types'

const PREFIX = 'dash.v1.'

const KEYS = {
  settings: 'settings',
  dailies: 'dailies',
  dailyChecks: 'dailyChecks',
  weeklyGoals: 'weeklyGoals',
  affirmations: 'affirmations',
  goals: 'goals',
} as const

/** Read a JSON value, falling back if it's missing or corrupted. */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function write(key: DataKey, value: unknown): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
  notify(key)
}

// ── Change notifications ─────────────────────────────────────────────────────
// Lets one part of the UI react when another part changes data (e.g. the
// header's Sunday reminder disappears once the weekly goal card saves a goal).
// With Supabase, realtime subscriptions could call notify() the same way.

export type DataKey = (typeof KEYS)[keyof typeof KEYS]
type Listener = (key: DataKey) => void
const listeners = new Set<Listener>()

/** Calls `listener` whenever data is written. Returns a function that unsubscribes. */
export function onDataChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(key: DataKey): void {
  listeners.forEach((listener) => listener(key))
}

function newId(): string {
  // randomUUID only exists on https/localhost; fall back for plain-http LAN testing.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const nowIso = () => new Date().toISOString()

// ── Settings ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  theme: 'system',
  hideCompletedGoals: false,
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  write(KEYS.settings, settings)
  // A plain local copy of the theme, read by the tiny script in index.html
  // before React loads (to avoid a white flash). Keep this even with Supabase.
  try {
    localStorage.setItem('dash.themeCache', settings.theme)
  } catch {
    /* storage full or blocked; not critical */
  }
}

// ── Dailies ──────────────────────────────────────────────────────────────────

export async function getDailies(): Promise<Daily[]> {
  return read<Daily[]>(KEYS.dailies, [])
}

export async function addDaily(input: Omit<Daily, 'id'>): Promise<Daily[]> {
  const list = [...(await getDailies()), { ...input, id: newId() }]
  write(KEYS.dailies, list)
  return list
}

export async function updateDaily(id: string, patch: Partial<Omit<Daily, 'id'>>): Promise<Daily[]> {
  const list = (await getDailies()).map((d) => (d.id === id ? { ...d, ...patch } : d))
  write(KEYS.dailies, list)
  return list
}

export async function deleteDaily(id: string): Promise<Daily[]> {
  const list = (await getDailies()).filter((d) => d.id !== id)
  write(KEYS.dailies, list)
  return list
}

/** Move a daily one place up (-1) or down (+1). */
export async function moveDaily(id: string, direction: -1 | 1): Promise<Daily[]> {
  const list = await getDailies()
  const from = list.findIndex((d) => d.id === id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= list.length) return list
  ;[list[from], list[to]] = [list[to], list[from]]
  write(KEYS.dailies, list)
  return list
}

/** IDs of dailies checked *today*. Checks from a previous day are ignored. */
export async function getDailyChecks(today: DateKey): Promise<string[]> {
  const checks = read<DailyChecks | null>(KEYS.dailyChecks, null)
  return checks?.date === today ? checks.doneIds : []
}

export async function setDailyChecked(today: DateKey, id: string, checked: boolean): Promise<string[]> {
  const current = await getDailyChecks(today)
  const doneIds = checked ? [...new Set([...current, id])] : current.filter((x) => x !== id)
  write(KEYS.dailyChecks, { date: today, doneIds } satisfies DailyChecks)
  return doneIds
}

// ── Weekly goals ─────────────────────────────────────────────────────────────

/** All weekly goals, newest week first. */
export async function getWeeklyGoals(): Promise<WeeklyGoal[]> {
  return read<WeeklyGoal[]>(KEYS.weeklyGoals, []).sort((a, b) => b.weekStart.localeCompare(a.weekStart))
}

/** Create or rename the goal for a given week. */
export async function setWeeklyGoalText(weekStart: DateKey, text: string): Promise<WeeklyGoal[]> {
  const list = await getWeeklyGoals()
  const existing = list.find((g) => g.weekStart === weekStart)
  const next = existing
    ? list.map((g) => (g.weekStart === weekStart ? { ...g, text } : g))
    : [{ weekStart, text, completed: false }, ...list]
  write(KEYS.weeklyGoals, next)
  return getWeeklyGoals()
}

export async function setWeeklyGoalCompleted(weekStart: DateKey, completed: boolean): Promise<WeeklyGoal[]> {
  const list = (await getWeeklyGoals()).map((g) =>
    g.weekStart === weekStart ? { ...g, completed, completedAt: completed ? nowIso() : undefined } : g,
  )
  write(KEYS.weeklyGoals, list)
  return list
}

export async function deleteWeeklyGoal(weekStart: DateKey): Promise<WeeklyGoal[]> {
  const list = (await getWeeklyGoals()).filter((g) => g.weekStart !== weekStart)
  write(KEYS.weeklyGoals, list)
  return list
}

// ── Affirmations ─────────────────────────────────────────────────────────────

export async function getAffirmations(): Promise<Affirmation[]> {
  return read<Affirmation[]>(KEYS.affirmations, [])
}

export async function addAffirmation(text: string): Promise<Affirmation[]> {
  const list = [...(await getAffirmations()), { id: newId(), text, createdAt: nowIso() }]
  write(KEYS.affirmations, list)
  return list
}

export async function updateAffirmation(id: string, text: string): Promise<Affirmation[]> {
  const list = (await getAffirmations()).map((a) => (a.id === id ? { ...a, text } : a))
  write(KEYS.affirmations, list)
  return list
}

export async function deleteAffirmation(id: string): Promise<Affirmation[]> {
  const list = (await getAffirmations()).filter((a) => a.id !== id)
  write(KEYS.affirmations, list)
  return list
}

// ── Goals (short-term and life) ──────────────────────────────────────────────

export async function getGoals(): Promise<Goal[]> {
  return read<Goal[]>(KEYS.goals, [])
}

export async function addGoal(list: GoalList, text: string): Promise<Goal[]> {
  const goals = [...(await getGoals()), { id: newId(), text, list, completed: false, createdAt: nowIso() }]
  write(KEYS.goals, goals)
  return goals
}

export async function updateGoalText(id: string, text: string): Promise<Goal[]> {
  const goals = (await getGoals()).map((g) => (g.id === id ? { ...g, text } : g))
  write(KEYS.goals, goals)
  return goals
}

export async function setGoalCompleted(id: string, completed: boolean): Promise<Goal[]> {
  const goals = (await getGoals()).map((g) =>
    g.id === id ? { ...g, completed, completedAt: completed ? nowIso() : undefined } : g,
  )
  write(KEYS.goals, goals)
  return goals
}

export async function deleteGoal(id: string): Promise<Goal[]> {
  const goals = (await getGoals()).filter((g) => g.id !== id)
  write(KEYS.goals, goals)
  return goals
}

// ── Backup ───────────────────────────────────────────────────────────────────

export async function exportAll(): Promise<AllData> {
  return {
    settings: await getSettings(),
    dailies: await getDailies(),
    dailyChecks: read<DailyChecks>(KEYS.dailyChecks, { date: '', doneIds: [] }),
    weeklyGoals: await getWeeklyGoals(),
    affirmations: await getAffirmations(),
    goals: await getGoals(),
  }
}

/** Replace ALL data. Only call this with data that has already been validated. */
export async function importAll(data: AllData): Promise<void> {
  await saveSettings(data.settings)
  write(KEYS.dailies, data.dailies)
  write(KEYS.dailyChecks, data.dailyChecks)
  write(KEYS.weeklyGoals, data.weeklyGoals)
  write(KEYS.affirmations, data.affirmations)
  write(KEYS.goals, data.goals)
}
