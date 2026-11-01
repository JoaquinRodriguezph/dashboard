import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Dices, Download, ImagePlus, LoaderCircle, RotateCcw, X } from 'lucide-react'
import { buttonClass } from '../components/buttonStyles'
import { MAX_PHOTOS, useExposure } from '../lib/exposure/ExposureContext'
import { DEFAULT_DOUBLE_EXPOSURE } from '../storage'
import type { DoubleExposureSettings as Params, Photo } from '../types'

interface SliderConfig {
  key: keyof Omit<Params, 'enabled' | 'seed'>
  label: string
  hint: string
  min: number
  max: number
  step: number
}

const SLIDERS: SliderConfig[] = [
  { key: 'exposure', label: 'Exposure', hint: 'How much light the film catches', min: 0.5, max: 2.5, step: 0.05 },
  { key: 'grain', label: 'Grain', hint: 'Film grain in the midtones', min: 0, max: 1, step: 0.01 },
  { key: 'lightLeak', label: 'Light leak', hint: 'Warm glow from one edge', min: 0, max: 1, step: 0.01 },
  { key: 'vignette', label: 'Vignette', hint: 'Darker corners', min: 0, max: 1, step: 0.01 },
  { key: 'misalignment', label: 'Misalignment', hint: 'Random shift, tilt and zoom per photo', min: 0, max: 1, step: 0.01 },
  { key: 'frameOverlap', label: 'Frame overlap', hint: 'Film-advance offset between frames', min: 0, max: 1, step: 0.01 },
]

/** The "Double exposure" part of the settings dialog. */
export function DoubleExposureSettings() {
  const { photos, imageUrl, status, error, settings, updateExposure, reroll, addPhotos, removePhoto } = useExposure()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const generating = status === 'generating'

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    setNote(`Adding ${files.length} photo${files.length === 1 ? '' : 's'}…`)
    const { added, failed, skipped } = await addPhotos(files)
    setBusy(false)
    const parts = [`Added ${added}.`]
    if (failed) parts.push(`${failed} couldn't be read as an image.`)
    if (skipped) parts.push(`${skipped} skipped (max ${MAX_PHOTOS} photos).`)
    setNote(parts.join(' '))
  }

  const download = () => {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `double-exposure-${settings.seed}.jpg`
    a.click()
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Double exposure</h3>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          Show banner
          <input
            type="checkbox"
            role="switch"
            checked={settings.enabled}
            onChange={(e) => updateExposure({ enabled: e.target.checked })}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-6 w-10 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
          />
        </label>
      </div>
      <p className="mb-3 text-sm text-muted">
        Your photos, layered like film exposed twice. Made on this device with pixel math; nothing is uploaded.
      </p>

      {/* Photos */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {photos.map((photo) => (
          <Thumbnail key={photo.id} photo={photo} onRemove={() => removePhoto(photo.id)} />
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs text-muted transition hover:border-accent hover:text-fg active:scale-95 disabled:opacity-50 motion-reduce:transition-none"
          >
            {busy ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" /> : <ImagePlus size={18} />}
            Add
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
      {photos.length === 1 && <p className="mt-2 text-xs text-muted">Add at least one more photo for a real double exposure.</p>}

      {photos.length > 0 && (
        <>
          {/* Preview + actions */}
          <div className="relative mt-4 aspect-[3/2] overflow-hidden rounded-xl border border-line bg-surface-hover">
            {imageUrl && <img src={imageUrl} alt="Double exposure preview" className="size-full object-cover" />}
            {(generating || !imageUrl) && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-bg/40 text-sm backdrop-blur-[2px]">
                {generating && <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />}
                {generating ? 'Developing…' : settings.enabled ? '' : 'Turn on "Show banner" to develop'}
              </div>
            )}
          </div>
          {status === 'error' && <p className="mt-2 text-xs text-danger">Couldn't develop the image: {error}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={reroll} disabled={generating || !settings.enabled} className={buttonClass('primary', 'md')}>
              <Dices size={16} /> {imageUrl ? 'Re-roll' : 'Generate'}
            </button>
            <button type="button" onClick={download} disabled={!imageUrl || generating} className={buttonClass('outline', 'md')}>
              <Download size={16} /> Download JPEG
            </button>
          </div>

          {/* Sliders */}
          <div className="mt-4 space-y-3">
            {SLIDERS.map((s) => (
              <label key={s.key} className="block">
                <span className="flex items-baseline justify-between text-sm">
                  <span>
                    {s.label} <span className="text-xs text-muted">· {s.hint}</span>
                  </span>
                  <span className="text-xs text-muted tabular-nums">{settings[s.key].toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={settings[s.key]}
                  onChange={(e) => updateExposure({ [s.key]: Number(e.target.value) })}
                  className="mt-1 w-full accent-(--accent)"
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => updateExposure({ ...DEFAULT_DOUBLE_EXPOSURE, enabled: settings.enabled, seed: settings.seed })}
              className={buttonClass('ghost')}
            >
              <RotateCcw size={14} /> Reset sliders
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** A photo thumbnail with a remove button. Owns (and frees) its object URL. */
function Thumbnail({ photo, onRemove }: { photo: Photo; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(photo.blob), [photo.blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-line">
      <img src={url} alt="" className="size-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute top-1 right-1 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 active:scale-90 motion-reduce:transition-none"
      >
        <X size={14} />
      </button>
    </div>
  )
}
