import { DEFAULT_SETTINGS, exportAll } from '../storage'
import { toDateKey } from './dates'
import type { AllData, Settings } from '../types'

// A backup file looks like:
//   { "app": "personal-dashboard", "version": 1, "exportedAt": "...", "data": { ...AllData } }
// The "app" and "version" fields let us recognise our own files and reject anything else.

const APP_ID = 'personal-dashboard'
const VERSION = 1
const MAX_FILE_BYTES = 5 * 1024 * 1024

export interface BackupFile {
  app: typeof APP_ID
  version: number
  exportedAt: string
  data: AllData
}

/** Builds a backup and makes the browser download it as a .json file. */
export async function downloadBackup(): Promise<void> {
  const backup: BackupFile = { app: APP_ID, version: VERSION, exportedAt: new Date().toISOString(), data: await exportAll() }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
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

function list<T>(o: Obj, key: string, item: (v: Obj, where: string) => T): T[] {
  const arr = o[key]
  if (!Array.isArray(arr)) fail(`"${key}" should be a list`)
  return arr.map((v, i) => {
    const where = `${key} #${i + 1}`
    return isObj(v) ? item(v, where) : fail(`${where} is not an object`)
  })
}

function validateData(d: Obj): AllData {
  const s = isObj(d.settings) ? d.settings : fail('"settings" is missing')
  const theme = s.theme ?? DEFAULT_SETTINGS.theme
  if (theme !== 'system' && theme !== 'light' && theme !== 'dark') fail('settings: unknown theme')
  const settings: Settings = {
    name: typeof s.name === 'string' ? s.name : DEFAULT_SETTINGS.name,
    theme,
    hideCompletedGoals: typeof s.hideCompletedGoals === 'boolean' ? s.hideCompletedGoals : DEFAULT_SETTINGS.hideCompletedGoals,
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
  }
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
    const exportedAt = typeof json.exportedAt === 'string' ? json.exportedAt : ''
    return { ok: true, backup: { app: APP_ID, version: json.version, exportedAt, data } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid backup file.' }
  }
}
