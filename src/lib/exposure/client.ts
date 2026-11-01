// The page-side API for the double exposure. Components call:
//   const blob = await renderDoubleExposure(photoBlobs, params)
// and get a JPEG back. All the heavy work happens in exposure.worker.ts.

import { ALGORITHM_VERSION, OUTPUT_HEIGHT, OUTPUT_WIDTH, drawFrame, frameTransforms, type RenderParams } from './render'
import type { WorkerRequest, WorkerResponse } from './exposure.worker'
import type { DoubleExposureSettings, Photo } from '../../types'

export type { RenderParams }

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, (res: WorkerResponse) => void>()

function getWorker(): Worker {
  if (!worker) {
    // Vite sees `new URL(..., import.meta.url)` and bundles the worker as its own file.
    worker = new Worker(new URL('./exposure.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      pending.get(e.data.id)?.(e.data)
      pending.delete(e.data.id)
    }
  }
  return worker
}

function send(req: WorkerRequest, transfer: Transferable[]): Promise<WorkerResponse> {
  return new Promise((resolve) => {
    pending.set(req.id, resolve)
    getWorker().postMessage(req, transfer)
  })
}

/** Can the worker draw and encode by itself? (True in Chrome, desktop and Android.) */
const workerCanDraw = typeof OffscreenCanvas !== 'undefined' && 'convertToBlob' in OffscreenCanvas.prototype

/** A fingerprint of everything that affects the image. Same key = same picture. */
export function recipeKey(photos: Photo[], settings: DoubleExposureSettings): string {
  const { enabled: _ignored, ...params } = settings
  return JSON.stringify({ v: ALGORITHM_VERSION, photos: photos.map((p) => p.id), params })
}

export function toRenderParams(settings: DoubleExposureSettings): RenderParams {
  const { enabled: _ignored, ...params } = settings
  return params
}

/** Makes the double exposure. Resolves with a 1800×1200 JPEG. */
export async function renderDoubleExposure(photos: Blob[], params: RenderParams): Promise<Blob> {
  if (photos.length === 0) throw new Error('No photos')
  const id = nextId++
  const width = OUTPUT_WIDTH
  const height = OUTPUT_HEIGHT
  // Decoding happens off the main thread too (createImageBitmap is async).
  const bitmaps = await Promise.all(photos.map((p) => createImageBitmap(p)))

  let res: WorkerResponse
  if (workerCanDraw) {
    // Transfer = hand the bitmaps to the worker without copying them.
    res = await send({ id, kind: 'bitmaps', bitmaps, params, width, height }, bitmaps)
  } else {
    // Fallback: draw frames here, send raw pixels.
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    const transforms = frameTransforms(bitmaps.length, params, width)
    const frames = bitmaps.map((bitmap, i) => {
      drawFrame(ctx, bitmap, transforms[i], width, height)
      bitmap.close()
      return ctx.getImageData(0, 0, width, height).data.buffer
    })
    res = await send({ id, kind: 'frames', frames, params, width, height }, frames)
  }

  if (!res.ok) throw new Error(res.error)
  if ('blob' in res) return res.blob

  // Fallback path: turn the returned pixels into a JPEG here.
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(res.pixels), width, height), 0, 0)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encode failed'))), 'image/jpeg', 0.88))
}
