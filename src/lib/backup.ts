import { DEFAULT_BACKGROUND, DEFAULT_DOUBLE_EXPOSURE, DEFAULT_SETTINGS, exportAll, getPhotos } from '../storage'
import { toDateKey } from './dates'
import type { BackgroundSettings, DoubleExposureSettings, ImportData, Photo, Settings, Todo } from '../types'

// A backup file looks like:
//   { "app": "personal-dashboard", "version": 2, "exportedAt": "...",
//     "data": { ...AllData }, "photos": [ ...optional ] }
// The "app" and "version" fields let us recognise our own files and reject anything else.
//
// Version history:
//   1: original format (no photos, no doubleExposure settings)
//   2: adds settings.doubleExposure and an optional "photos" list
//   3: adds "todos" and "ideas" (optional on import: a file without them keeps your current ones)
// Older versions are still accepted; missing fields get their defaults.

const APP_ID = 'personal-dashboard'
const VERSION = 3
const MAX_FILE_BYTES = 100 * 1024 * 1024 // photos make backups big

/** How a photo is written in the JSON file: the JPEG as a base64 "data URL". */
interface SerializedPhoto {
  id: string
  dataUrl: string
  width: number
  height: number
  createdAt: string
}

export interface BackupFile {
  app: typeof APP_ID
  version: number
  exportedAt: string
  data: ImportData
  /** Present only if the backup was exported with photos. */
  photos?: Photo[]
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Builds a backup and makes the browser download it as a .json file. */
export async function downloadBackup({ includePhotos }: { includePhotos: boolean }): Promise<void> {
  const stored = includePhotos ? await getPhotos() : []
  // No photos → leave the field out entirely, so importing this file keeps
  // whatever photos the other device has instead of wiping them.
  const photos: SerializedPhoto[] | undefined = stored.length
    ? await Promise.all(stored.map(async ({ blob, ...rest }) => ({ ...rest, dataUrl: await blobToDataUrl(blob) })))
    : undefined

  const file = { app: APP_ID, version: VERSION, exportedAt: new Date().toISOString(), data: await exportAll(), photos }
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dashboard-backup-${toDateKey(new Date())}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Validation ───────────────────────────────────────────────────────────────
// Each check throws a readable error. Nothing is saved unless every check passes.

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

function fail(msg: string): never {
  throw new Error(msg)
}

function str(o: Obj, key: string, where: string): string {
  return typeof o[key] === 'string' ? (o[key] as string) : fail(`${where}: "${key}" should be text`)
}

function optStr(o: Obj, key: string, where: string): string | undefined {
  return o[key] === undefined ? undefined : str(o, key, where)
}

function bool(o: Obj, key: string, where: string): boolean {
  return typeof o[key] === 'boolean' ? (o[key] as boolean) : fail(`${where}: "${key}" should be true/false`)
}

function num(o: Obj, key: string, where: string): number {
  return typeof o[key] === 'number' && Number.isFinite(o[key]) ? (o[key] as number) : fail(`${where}: "${key}" should be a number`)
}

function list<T>(o: Obj, key: string, item: (v: Obj, where: string) => T): T[] {
  const arr = o[key]
  if (!Array.isArray(arr)) fail(`"${key}" should be a list`)
  return arr.map((v, i) => {
    const where = `${key} #${i + 1}`
    return isObj(v) ? item(v, where) : fail(`${where} is not an object`)
  })
}

/** Uses each saved value if it's a sensible number, otherwise the default. Clamps to the slider ranges. */
function validateDoubleExposure(raw: unknown): DoubleExposureSettings {
  const d = isObj(raw) ? raw : {}
  const pick = (key: keyof DoubleExposureSettings, min: number, max: number) => {
    const v = d[key]
    return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : (DEFAULT_DOUBLE_EXPOSURE[key] as number)
  }
  return {
    enabled: typeof d.enabled === 'boolean' ? d.enabled : DEFAULT_DOUBLE_EXPOSURE.enabled,
    seed: Math.round(pick('seed', 0, 2 ** 31)),
    exposure: pick('exposure', 0.3, 3),
    grain: pick('grain', 0, 1),
    lightLeak: pick('lightLeak', 0, 1),
    vignette: pick('vignette', 0, 1),
    misalignment: pick('misalignment', 0, 1),
    frameOverlap: pick('frameOverlap', 0, 1),
    color: d.color === 'warm' || d.color === 'bw' || d.color === 'natural' ? d.color : DEFAULT_DOUBLE_EXPOSURE.color,
  }
}

function validateBackground(raw: unknown): BackgroundSettings {
  const b = isObj(raw) ? raw : {}
  const flag = (key: keyof BackgroundSettings) => (typeof b[key] === 'boolean' ? (b[key] as boolean) : DEFAULT_BACKGROUND[key])
  return { panZoom: flag('panZoom'), grain: flag('grain'), glow: flag('glow'), live: flag('live') }
}

function validateData(d: Obj): ImportData {
  const s = isObj(d.settings) ? d.settings : fail('"settings" is missing')
  const theme = s.theme ?? DEFAULT_SETTINGS.theme
  if (theme !== 'system' && theme !== 'light' && theme !== 'dark') fail('settings: unknown theme')
  const settings: Settings = {
    name: typeof s.name === 'string' ? s.name : DEFAULT_SETTINGS.name,
    theme,
    hideCompletedGoals: typeof s.hideCompletedGoals === 'boolean' ? s.hideCompletedGoals : DEFAULT_SETTINGS.hideCompletedGoals,
    hideCompletedTodos: typeof s.hideCompletedTodos === 'boolean' ? s.hideCompletedTodos : DEFAULT_SETTINGS.hideCompletedTodos,
    doubleExposure: validateDoubleExposure(s.doubleExposure), // absent in v1 backups → defaults
    background: validateBackground(s.background), // absent before v3 → defaults
  }

  const c = isObj(d.dailyChecks) ? d.dailyChecks : { date: '', doneIds: [] }
  const doneIds = Array.isArray(c.doneIds) && c.doneIds.every((x) => typeof x === 'string') ? (c.doneIds as string[]) : []

  return {
    settings,
    dailies: list(d, 'dailies', (v, w) => ({ id: str(v, 'id', w), title: str(v, 'title', w), url: optStr(v, 'url', w) })),
    dailyChecks: { date: typeof c.date === 'string' ? c.date : '', doneIds },
    weeklyGoals: list(d, 'weeklyGoals', (v, w) => {
      const weekStart = str(v, 'weekStart', w)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) fail(`${w}: "weekStart" should look like 2026-11-01`)
      return { weekStart, text: str(v, 'text', w), completed: bool(v, 'completed', w), completedAt: optStr(v, 'completedAt', w) }
    }),
    affirmations: list(d, 'affirmations', (v, w) => ({ id: str(v, 'id', w), text: str(v, 'text', w), createdAt: str(v, 'createdAt', w) })),
    goals: list(d, 'goals', (v, w) => {
      const kind = v.list
      if (kind !== 'short' && kind !== 'life') fail(`${w}: "list" should be "short" or "life"`)
      return {
        id: str(v, 'id', w),
        text: str(v, 'text', w),
        list: kind,
        completed: bool(v, 'completed', w),
        createdAt: str(v, 'createdAt', w),
        completedAt: optStr(v, 'completedAt', w),
      }
    }),
    todos: d.todos === undefined ? undefined : list(d, 'todos', validateTodo),
    ideas:
      d.ideas === undefined
        ? undefined
        : list(d, 'ideas', (v, w) => ({
            id: str(v, 'id', w),
            text: str(v, 'text', w),
            createdAt: str(v, 'createdAt', w),
            todoId: optStr(v, 'todoId', w),
            addedToTodoAt: optStr(v, 'addedToTodoAt', w),
          })),
  }
}

function validateTodo(v: Obj, w: string): Todo {
  const dueDate = optStr(v, 'dueDate', w)
  if (dueDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) fail(`${w}: "dueDate" should look like 2026-11-07`)
  return {
    id: str(v, 'id', w),
    text: str(v, 'text', w),
    dueDate,
    completed: bool(v, 'completed', w),
    createdAt: str(v, 'createdAt', w),
    completedAt: optStr(v, 'completedAt', w),
  }
}

/** Turns each saved photo back into a Blob and checks the browser can actually decode it. */
async function validatePhotos(file: Obj): Promise<Photo[]> {
  const raw = list(file, 'photos', (v, w) => {
    const dataUrl = str(v, 'dataUrl', w)
    if (!dataUrl.startsWith('data:image/')) fail(`${w}: not an image`)
    return { id: str(v, 'id', w), dataUrl, width: num(v, 'width', w), height: num(v, 'height', w), createdAt: str(v, 'createdAt', w) }
  })
  return Promise.all(
    raw.map(async ({ dataUrl, ...rest }, i) => {
      const blob = await (await fetch(dataUrl)).blob()
      try {
        ;(await createImageBitmap(blob)).close()
      } catch {
        fail(`photos #${i + 1} can't be opened as an image`)
      }
      return { ...rest, blob }
    }),
  )
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

/** Reads an uploaded file and checks it's a valid backup. Never writes anything. */
export async function parseBackupFile(file: File): Promise<ParseResult> {
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'That file is too large to be a dashboard backup.' }
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    return { ok: false, error: "That file isn't valid JSON." }
  }
  try {
    if (!isObj(json) || json.app !== APP_ID) fail("This isn't a dashboard backup file.")
    if (typeof json.version !== 'number' || json.version > VERSION) {
      fail('This backup was made by a newer version of the dashboard.')
    }
    const data = isObj(json.data) ? validateData(json.data) : fail('The backup has no data.')
    const photos = json.photos === undefined ? undefined : await validatePhotos(json)
    const exportedAt = typeof json.exportedAt === 'string' ? json.exportedAt : ''
    return { ok: true, backup: { app: APP_ID, version: json.version, exportedAt, data, photos } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid backup file.' }
  }
}
