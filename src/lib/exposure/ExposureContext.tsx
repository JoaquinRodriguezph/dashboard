import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { recipeKey, renderDoubleExposure, toRenderParams } from './client'
import { useSettings } from '../settings'
import { resizeImage } from '../resizeImage'
import { addPhoto, deletePhoto, getExposureResult, getPhotos, onDataChange, saveExposureResult } from '../../storage'
import type { DoubleExposureSettings, Photo } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// Shared state for the double exposure: the photos, the current image, and
// whether it's being generated. The header banner and the settings panel both
// read from here, so the image is generated in exactly ONE place.
//
// When does it generate?
//   On startup it loads the cached image from storage. It only regenerates if
//   the cache's recipeKey doesn't match the current photos + settings + seed,
//   i.e. after a re-roll, a photo change, or a slider change (debounced).
//   The worker file is only downloaded the first time it actually has to generate.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_PHOTOS = 12
const SLIDER_DEBOUNCE_MS = 350

export type ExposureStatus = 'idle' | 'generating' | 'error'

interface ExposureContextValue {
  photos: Photo[]
  /** Object URL of the current image, or null if there's none (yet). */
  imageUrl: string | null
  status: ExposureStatus
  error: string | null
  settings: DoubleExposureSettings
  updateExposure: (patch: Partial<DoubleExposureSettings>) => void
  /** New random seed → a new arrangement of the same photos. */
  reroll: () => void
  addPhotos: (files: File[]) => Promise<{ added: number; failed: number; skipped: number }>
  removePhoto: (id: string) => Promise<void>
}

const ExposureContext = createContext<ExposureContextValue | null>(null)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function ExposureProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useSettings()
  const de = settings.doubleExposure
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<ExposureStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Photos: load once, and reload when storage says they changed (e.g. after import).
  useEffect(() => {
    const load = () =>
      getPhotos().then((p) => {
        setPhotos(p)
        setPhotosLoaded(true)
      })
    void load()
    return onDataChange((key) => key === 'photos' && void load())
  }, [])

  // Show a Blob as an <img>-able URL, freeing the previous one's memory.
  const urlRef = useRef<string | null>(null)
  const showBlob = useCallback((blob: Blob | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = blob ? URL.createObjectURL(blob) : null
    setImageUrl(urlRef.current)
  }, [])

  // A string fingerprint of photos + settings + seed. It only changes when
  // something that affects the picture changes, so the effect below re-runs
  // exactly then (not on every render).
  const enabled = de.enabled && photos.length > 0
  const recipe = useMemo(() => recipeKey(photos, de), [photos, de])
  const latest = useRef({ photos, de })
  latest.current = { photos, de }

  useEffect(() => {
    if (!photosLoaded) return
    if (!enabled) {
      showBlob(null)
      setStatus('idle')
      return
    }
    let cancelled = false // set when a newer recipe replaces this one
    ;(async () => {
      const cached = await getExposureResult()
      if (cancelled) return
      if (cached?.recipeKey === recipe) {
        showBlob(cached.blob) // the normal startup path: no generating at all
        setStatus('idle')
        return
      }

      setStatus('generating')
      setError(null)
      await wait(SLIDER_DEBOUNCE_MS) // let slider dragging settle first
      if (cancelled) return
      try {
        const { photos, de } = latest.current
        const blob = await renderDoubleExposure(photos.map((p) => p.blob), toRenderParams(de))
        if (cancelled) return
        await saveExposureResult(recipe, blob)
        showBlob(blob)
        setStatus('idle')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Something went wrong')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [recipe, enabled, photosLoaded, showBlob])

  const updateExposure = useCallback(
    (patch: Partial<DoubleExposureSettings>) => updateSettings({ doubleExposure: { ...de, ...patch } }),
    [de, updateSettings],
  )

  const reroll = useCallback(() => updateExposure({ seed: Math.floor(Math.random() * 2 ** 31) }), [updateExposure])

  const addPhotos = useCallback(
    async (files: File[]) => {
      let added = 0
      let failed = 0
      const room = MAX_PHOTOS - photos.length
      for (const file of files.slice(0, Math.max(0, room))) {
        try {
          const resized = await resizeImage(file)
          await addPhoto(resized) // triggers onDataChange('photos') → list reloads
          added++
        } catch {
          failed++ // not an image, or a format this browser can't decode
        }
      }
      return { added, failed, skipped: Math.max(0, files.length - Math.max(0, room)) }
    },
    [photos.length],
  )

  const removePhoto = useCallback(async (id: string) => {
    await deletePhoto(id)
  }, [])

  return (
    <ExposureContext.Provider
      value={{ photos, imageUrl, status, error, settings: de, updateExposure, reroll, addPhotos, removePhoto }}
    >
      {children}
    </ExposureContext.Provider>
  )
}

export function useExposure(): ExposureContextValue {
  const ctx = useContext(ExposureContext)
  if (!ctx) throw new Error('useExposure must be used inside <ExposureProvider>')
  return ctx
}
