// ─────────────────────────────────────────────────────────────────────────────
// A tiny promise wrapper around IndexedDB. Used ONLY by src/storage.ts.
//
// Why IndexedDB? localStorage holds ~5 MB of *text*. IndexedDB can store
// binary Blobs (our photos) and has far more space.
// IndexedDB's own API is callback-based; these helpers turn each operation
// into a Promise so storage.ts can use async/await.
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'dashboard'
const DB_VERSION = 1

export type StoreName = 'photos' | 'cache'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    // Runs the first time (and whenever DB_VERSION goes up): create the "tables".
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Resolves once a write transaction is fully saved to disk. */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb()
  return requestToPromise(db.transaction(store).objectStore(store).getAll())
}

export async function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDb()
  return requestToPromise(db.transaction(store).objectStore(store).get(key))
}

export async function idbPut(store: StoreName, value: unknown): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).put(value)
  return transactionDone(tx)
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).delete(key)
  return transactionDone(tx)
}

/** Clears a store and writes new values in ONE transaction: all or nothing. */
export async function idbReplaceAll(store: StoreName, values: unknown[]): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(store, 'readwrite')
  const os = tx.objectStore(store)
  os.clear()
  for (const value of values) os.put(value)
  return transactionDone(tx)
}
