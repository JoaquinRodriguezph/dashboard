// ─────────────────────────────────────────────────────────────────────────────
// storage.ts — the ONLY file that knows where data lives.
//
// Every function is async (returns a Promise) even though localStorage is
// synchronous. That way, when this is swapped for Supabase (which is async
// because it talks over the network), no UI code has to change.
//
// Functions that change a list return the updated list, so the UI can do:
//   setDailies(await deleteDaily(id))
//
// Where things live today:
//   localStorage → all text data (settings, dailies, goals, ...), keys "dash.v1.*"
//   IndexedDB    → photos and the cached double-exposure image (binary, too big
//                  for localStorage), via the helpers in lib/idb.ts
// ─────────────────────────────────────────────────────────────────────────────

import { toDateKey } from './lib/dates'
import { idbDelete, idbGet, idbGetAll, idbPut, idbReplaceAll } from './lib/idb'
import { suggestTarget } from './lib/score'
import type {
  BackgroundSettings,
  AllData,
  Affirmation,
  Daily,
  DailyChecks,
  DateKey,
  DayItem,
  DayRecord,
  DevicePrefs,
  DoubleExposureSettings,
  ExposureResult,
  Goal,
  GoalList,
  Idea,
  ImportData,
  Photo,
  Settings,
  Todo,
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
  todos: 'todos',
  ideas: 'ideas',
  history: 'history',
  historyStart: 'historyStart',
} as const

/** What a new daily or task is worth unless you choose otherwise. */
export const DEFAULT_POINTS = 10

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

export type DataKey = (typeof KEYS)[keyof typeof KEYS] | 'photos'
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

// ── Migrations ───────────────────────────────────────────────────────────────
// When the shape of saved data changes, add a numbered step here that upgrades
// old data. initStorage() runs any steps the browser hasn't run yet, in order,
// once at startup (App waits for it before showing any section).

const SCHEMA_KEY = 'dash.schemaVersion'
const CURRENT_SCHEMA = 6

const MIGRATIONS: Record<number, () => void> = {
  // v1 → v2: settings gained `doubleExposure`. Fill in its defaults.
  2: () => {
    const stored = read<Partial<Settings> | null>(KEYS.settings, null)
    if (stored) write(KEYS.settings, mergeSettings(stored))
  },
  // v2 → v3: new To-Do list (starts empty) and a hideCompletedTodos setting.
  // Goals are untouched.
  3: () => {
    const stored = read<Partial<Settings> | null>(KEYS.settings, null)
    if (stored) write(KEYS.settings, mergeSettings(stored))
  },
  // v3 → v4: double exposure gained a colour mode (default: natural).
  // The cached image regenerates by itself (ALGORITHM_VERSION changed).
  4: () => {
    const stored = read<Partial<Settings> | null>(KEYS.settings, null)
    if (stored) write(KEYS.settings, mergeSettings(stored))
  },
  // v4 → v5: the photo became the page background, with animation settings.
  5: () => {
    const stored = read<Partial<Settings> | null>(KEYS.settings, null)
    if (stored) write(KEYS.settings, mergeSettings(stored))
  },
  // v5 → v6: points and history.
  //  - every existing daily and task is worth 10 points
  //  - the daily target starts at the suggested value for your dailies
  //  - anything already ticked or completed today goes into today's record,
  //    so nothing done on the day of the update is lost
  6: () => {
    const dailies = read<Partial<Daily>[]>(KEYS.dailies, []).map((d) => ({ ...d, points: d.points ?? DEFAULT_POINTS }) as Daily)
    const todos = read<Partial<Todo>[]>(KEYS.todos, []).map((t) => ({ ...t, points: t.points ?? DEFAULT_POINTS }) as Todo)
    write(KEYS.dailies, dailies)
    write(KEYS.todos, todos)
    const stored = read<Partial<Settings>>(KEYS.settings, {})
    write(KEYS.settings, mergeSettings({ ...stored, dailyTarget: stored.dailyTarget ?? suggestTarget(dailies) }))

    const today = toDateKey(new Date())
    const checks = read<DailyChecks | null>(KEYS.dailyChecks, null)
    const doneToday: DayItem[] = [
      ...(checks?.date === today ? dailies.filter((d) => checks.doneIds.includes(d.id)) : []).map((d) => dailyItem(d)),
      ...todos.filter((t) => t.completed && t.completedAt && toDateKey(new Date(t.completedAt)) === today).map((t) => todoItem(t, t.completedAt)),
    ]
    if (doneToday.length > 0) updateDay(today, (r) => ({ ...r, items: doneToday }))
  },
}

function storedSchemaVersion(): number {
  const raw = localStorage.getItem(SCHEMA_KEY)
  if (raw !== null) return Number(raw)
  // No version saved: either a brand-new install, or data from before
  // versioning existed (= version 1).
  const hasOldData = Object.values(KEYS).some((k) => localStorage.getItem(PREFIX + k) !== null)
  return hasOldData ? 1 : CURRENT_SCHEMA
}

let ready: Promise<void> | null = null

/** Upgrades old saved data if needed. Safe to call many times; runs once. */
export function initStorage(): Promise<void> {
  ready ??= (async () => {
    for (let v = storedSchemaVersion() + 1; v <= CURRENT_SCHEMA; v++) {
      MIGRATIONS[v]?.()
      localStorage.setItem(SCHEMA_KEY, String(v))
    }
    localStorage.setItem(SCHEMA_KEY, String(CURRENT_SCHEMA))
    // History starts the first day this version runs (on a brand-new install too,
    // where no migration ran). Days before it never count as "missed".
    if (read<DateKey | null>(KEYS.historyStart, null) === null) write(KEYS.historyStart, toDateKey(new Date()))
  })()
  return ready
}

// ── Settings ─────────────────────────────────────────────────────────────────

export const DEFAULT_DOUBLE_EXPOSURE: DoubleExposureSettings = {
  enabled: true,
  seed: 1,
  exposure: 1.4,
  grain: 0.35,
  lightLeak: 0.25,
  vignette: 0.5,
  misalignment: 0.3,
  frameOverlap: 0.25,
  color: 'natural',
}

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  panZoom: true,
  grain: true,
  glow: false,
  live: false,
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  theme: 'system',
  hideCompletedGoals: false,
  hideCompletedTodos: false,
  dailyTarget: 50,
  doubleExposure: DEFAULT_DOUBLE_EXPOSURE,
  background: DEFAULT_BACKGROUND,
}

/** Fills in any missing fields with defaults, including nested ones. */
function mergeSettings(stored: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    doubleExposure: { ...DEFAULT_DOUBLE_EXPOSURE, ...stored.doubleExposure },
    background: { ...DEFAULT_BACKGROUND, ...stored.background },
  }
}

export async function getSettings(): Promise<Settings> {
  return mergeSettings(read<Partial<Settings>>(KEYS.settings, {}))
}

export async function saveSettings(settings: Settings): Promise<void> {
  const targetChanged = read<Partial<Settings>>(KEYS.settings, {}).dailyTarget !== settings.dailyTarget
  write(KEYS.settings, settings)
  // Today's record is still "live", so it follows a new target. Past days keep theirs.
  if (targetChanged && readHistory()[toDateKey(new Date())]) updateDay(toDateKey(new Date()), (r) => r)
  // A plain local copy of the theme, read by the tiny script in index.html
  // before React loads (to avoid a white flash). Keep this even with Supabase.
  try {
    localStorage.setItem('dash.themeCache', settings.theme)
  } catch {
    /* storage full or blocked; not critical */
  }
}

// ── Score history ────────────────────────────────────────────────────────────
// One DayRecord per day with activity, stored as { "2026-11-19": record, … }.
// The record IS the day's score: ticking a daily or completing a task adds a
// snapshot item to TODAY's record, unticking removes it. Only today's record is
// ever written, so a past day can't change: there's nothing to "close" at
// midnight, and it works the same whether the app stayed open or was closed.

function readHistory(): Record<DateKey, DayRecord> {
  return read<Record<DateKey, DayRecord>>(KEYS.history, {})
}

function currentTarget(): number {
  return mergeSettings(read<Partial<Settings>>(KEYS.settings, {})).dailyTarget
}

/** A snapshot of a daily as it is right now. */
function dailyItem(d: Daily): DayItem {
  return { kind: 'daily', id: d.id, name: d.title, points: d.points, at: nowIso() }
}

/** A snapshot of a task as it is right now. */
function todoItem(t: Todo, at = nowIso()): DayItem {
  return { kind: 'todo', id: t.id, name: t.text, points: t.points, at }
}

/**
 * Changes one day's record (in practice always today's), then recalculates its
 * score and whether the target is reached, using the current target.
 * `reachedAt` is set the first time the target is hit and never cleared, so the
 * celebration plays once per day even if you untick and tick again.
 */
function updateDay(date: DateKey, change: (record: DayRecord) => DayRecord): void {
  const all = readHistory()
  const target = currentTarget()
  const before = all[date] ?? { date, items: [], score: 0, target, reached: false }
  const changed = change({ ...before, target })
  const score = changed.items.reduce((sum, item) => sum + item.points, 0)
  const reached = score >= target && score > 0
  const next: DayRecord = { ...changed, score, reached, reachedAt: changed.reachedAt ?? (reached ? nowIso() : undefined) }

  // Everything unticked again and the target never reached: no activity → no record.
  if (next.items.length === 0 && !next.reachedAt) delete all[date]
  else all[date] = next
  write(KEYS.history, all)
}

const addItem = (date: DateKey, item: DayItem) =>
  updateDay(date, (r) => ({ ...r, items: [...r.items.filter((i) => !(i.kind === item.kind && i.id === item.id)), item] }))

const removeItem = (date: DateKey, kind: DayItem['kind'], id: string) =>
  updateDay(date, (r) => ({ ...r, items: r.items.filter((i) => !(i.kind === kind && i.id === id)) }))

/** Reading the score history. */
export const history = {
  /** One day's record, or null if nothing was completed that day. */
  async getDay(date: DateKey): Promise<DayRecord | null> {
    return readHistory()[date] ?? null
  },
  /** The first day history was kept. Days before it don't count as missed. */
  async getStart(): Promise<DateKey> {
    return read<DateKey | null>(KEYS.historyStart, null) ?? toDateKey(new Date())
  },
}

// ── Device preferences ───────────────────────────────────────────────────────
// Per-device display choices (which sections are collapsed, To-Do list or
// calendar). Stored under their own key, outside "dash.v1.*", and NOT part of
// exportAll()/importAll(): a backup moved to another device doesn't change
// how that device's page looks. Even with Supabase, this would stay local.

const DEVICE_KEY = 'dash.device'

export const DEFAULT_DEVICE_PREFS: DevicePrefs = {
  collapsed: { todo: true, ideas: true, goals: true },
  todoView: 'list',
}

export async function getDevicePrefs(): Promise<DevicePrefs> {
  try {
    const stored = JSON.parse(localStorage.getItem(DEVICE_KEY) ?? '{}') as Partial<DevicePrefs>
    return {
      ...DEFAULT_DEVICE_PREFS,
      ...stored,
      collapsed: { ...DEFAULT_DEVICE_PREFS.collapsed, ...stored.collapsed },
    }
  } catch {
    return DEFAULT_DEVICE_PREFS
  }
}

export async function saveDevicePrefs(prefs: DevicePrefs): Promise<void> {
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(prefs))
  } catch {
    /* storage full or blocked: the layout just won't be remembered */
  }
}

// ── Dailies ──────────────────────────────────────────────────────────────────

export async function getDailies(): Promise<Daily[]> {
  return read<Daily[]>(KEYS.dailies, []).map((d) => ({ ...d, points: d.points ?? DEFAULT_POINTS }))
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

/** Saves a new order, e.g. after drag-and-drop. `ids` lists every daily in its new position. */
export async function setDailyOrder(ids: string[]): Promise<Daily[]> {
  const byId = new Map((await getDailies()).map((d) => [d.id, d]))
  const list = ids.map((id) => byId.get(id)).filter((d): d is Daily => !!d)
  // Safety net: keep any daily the caller didn't mention, at the end.
  for (const d of byId.values()) if (!ids.includes(d.id)) list.push(d)
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
  // Score: ticking adds the daily (as it is now) to today's record, unticking removes it.
  const daily = (await getDailies()).find((d) => d.id === id)
  if (checked && daily) addItem(today, dailyItem(daily))
  if (!checked) removeItem(today, 'daily', id)
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

/** Permanently deletes the completed goals in one list ("short" or "life"). */
export async function clearCompletedGoals(list: GoalList): Promise<Goal[]> {
  const goals = (await getGoals()).filter((g) => !(g.list === list && g.completed))
  write(KEYS.goals, goals)
  return goals
}

// ── Ideas ────────────────────────────────────────────────────────────────────

export async function getIdeas(): Promise<Idea[]> {
  return read<Idea[]>(KEYS.ideas, [])
}

export async function addIdea(text: string): Promise<Idea[]> {
  const ideas = [...(await getIdeas()), { id: newId(), text, createdAt: nowIso() }]
  write(KEYS.ideas, ideas)
  return ideas
}

export async function updateIdeaText(id: string, text: string): Promise<Idea[]> {
  const ideas = (await getIdeas()).map((i) => (i.id === id ? { ...i, text } : i))
  write(KEYS.ideas, ideas)
  return ideas
}

export async function deleteIdea(id: string): Promise<Idea[]> {
  const ideas = (await getIdeas()).filter((i) => i.id !== id)
  write(KEYS.ideas, ideas)
  return ideas
}

/**
 * Turns an idea into a To-Do task. The idea stays, marked "added to To-Do".
 * (The To-Do card hears about the new task through onDataChange('todos').)
 */
export async function ideaToTodo(ideaId: string, dueDate?: DateKey): Promise<Idea[]> {
  const idea = (await getIdeas()).find((i) => i.id === ideaId)
  if (!idea) return getIdeas()
  const todos = await addTodo({ text: idea.text, dueDate })
  const todoId = todos[todos.length - 1].id
  const ideas = (await getIdeas()).map((i) => (i.id === ideaId ? { ...i, todoId, addedToTodoAt: nowIso() } : i))
  write(KEYS.ideas, ideas)
  return ideas
}

// ── To-Do ────────────────────────────────────────────────────────────────────

export async function getTodos(): Promise<Todo[]> {
  return read<Todo[]>(KEYS.todos, []).map((t) => ({ ...t, points: t.points ?? DEFAULT_POINTS }))
}

export async function addTodo(input: { text: string; dueDate?: DateKey; points?: number }): Promise<Todo[]> {
  const todos = [...(await getTodos()), { ...input, points: input.points ?? DEFAULT_POINTS, id: newId(), completed: false, createdAt: nowIso() }]
  write(KEYS.todos, todos)
  return todos
}

export async function updateTodo(id: string, patch: { text?: string; dueDate?: DateKey; points?: number }): Promise<Todo[]> {
  // Passing `dueDate: undefined` in the patch removes the date.
  const todos = (await getTodos()).map((t) => (t.id === id ? { ...t, ...patch } : t))
  write(KEYS.todos, todos)
  return todos
}

/**
 * Completing a task adds its points to the day you complete it (whatever its
 * due date). Un-completing removes them only if it was completed TODAY: earlier
 * days are final, so a task finished last week stays in last week's history.
 */
export async function setTodoCompleted(id: string, completed: boolean): Promise<Todo[]> {
  const before = (await getTodos()).find((t) => t.id === id)
  const today = toDateKey(new Date())
  const todos = (await getTodos()).map((t) =>
    t.id === id ? { ...t, completed, completedAt: completed ? nowIso() : undefined } : t,
  )
  write(KEYS.todos, todos)
  if (before && completed) addItem(today, todoItem(before))
  if (before && !completed && before.completedAt && toDateKey(new Date(before.completedAt)) === today) removeItem(today, 'todo', id)
  return todos
}

export async function deleteTodo(id: string): Promise<Todo[]> {
  const todos = (await getTodos()).filter((t) => t.id !== id)
  write(KEYS.todos, todos)
  return todos
}

/** Permanently deletes every completed task. */
export async function clearCompletedTodos(): Promise<Todo[]> {
  const todos = (await getTodos()).filter((t) => !t.completed)
  write(KEYS.todos, todos)
  return todos
}

// ── Photos (IndexedDB) ───────────────────────────────────────────────────────
// With Supabase, photos would go to Supabase Storage (files) plus a table row
// with width/height/createdAt. Callers only ever see Photo objects with a Blob.

/** All photos, oldest first. */
export async function getPhotos(): Promise<Photo[]> {
  const photos = await idbGetAll<Photo>('photos')
  return photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Saves an (already downscaled) photo. */
export async function addPhoto(input: { blob: Blob; width: number; height: number }): Promise<Photo[]> {
  await idbPut('photos', { ...input, id: newId(), createdAt: nowIso() } satisfies Photo)
  notify('photos')
  return getPhotos()
}

export async function deletePhoto(id: string): Promise<Photo[]> {
  await idbDelete('photos', id)
  notify('photos')
  return getPhotos()
}

// The cache store holds a single record with this id: the latest generated image.
const RESULT_ID = 'exposure-result'

export async function getExposureResult(): Promise<ExposureResult | null> {
  const record = await idbGet<ExposureResult & { id: string }>('cache', RESULT_ID)
  return record ?? null
}

export async function saveExposureResult(recipeKey: string, blob: Blob): Promise<void> {
  await idbPut('cache', { id: RESULT_ID, recipeKey, blob, createdAt: nowIso() })
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
    todos: await getTodos(),
    ideas: await getIdeas(),
  }
}

/**
 * Replace ALL data. Only call this with data that has already been validated.
 * `photos`: pass an array to replace all photos, or undefined to keep the current ones
 * (older backups and backups exported without photos).
 */
export async function importAll(data: ImportData, photos?: Photo[]): Promise<void> {
  // Photos first: it's the step most likely to fail (disk space). If it throws,
  // nothing else has been touched yet.
  if (photos) {
    await idbReplaceAll('photos', photos)
    notify('photos')
  }
  await saveSettings(data.settings)
  write(KEYS.dailies, data.dailies)
  write(KEYS.dailyChecks, data.dailyChecks)
  write(KEYS.weeklyGoals, data.weeklyGoals)
  write(KEYS.affirmations, data.affirmations)
  write(KEYS.goals, data.goals)
  // Lists added in later versions: missing from older backups → keep what's here.
  if (data.todos) write(KEYS.todos, data.todos)
  if (data.ideas) write(KEYS.ideas, data.ideas)
}
