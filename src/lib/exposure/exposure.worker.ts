// ─────────────────────────────────────────────────────────────────────────────
// Runs in a Web Worker: a separate thread, so the heavy pixel loops never
// freeze scrolling, typing or animations on the page.
//
// Two kinds of request (see client.ts):
//   "bitmaps": the worker has OffscreenCanvas, so it does everything, including
//              drawing the photos and encoding the JPEG.
//   "frames":  fallback for browsers without OffscreenCanvas in workers. The page
//              already drew each frame; the worker only does the pixel math.
// ─────────────────────────────────────────────────────────────────────────────

import { accumulate, develop, drawFrame, exposureGain, frameTransforms, type RenderParams } from './render'

export type WorkerRequest =
  | { id: number; kind: 'bitmaps'; bitmaps: ImageBitmap[]; params: RenderParams; width: number; height: number }
  | { id: number; kind: 'frames'; frames: ArrayBuffer[]; params: RenderParams; width: number; height: number }

export type WorkerResponse =
  | { id: number; ok: true; blob: Blob }
  | { id: number; ok: true; pixels: ArrayBuffer }
  | { id: number; ok: false; error: string }

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data
  const { id, params, width, height } = req
  try {
    const total = new Float32Array(width * height * 3)

    if (req.kind === 'bitmaps') {
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      const transforms = frameTransforms(req.bitmaps.length, params, width)
      const gain = exposureGain(params, req.bitmaps.length)
      req.bitmaps.forEach((bitmap, i) => {
        drawFrame(ctx, bitmap, transforms[i], width, height)
        accumulate(total, ctx.getImageData(0, 0, width, height).data, gain)
        bitmap.close() // free the decoded photo's memory right away
      })
      const pixels = develop(total, params, width, height)
      ctx.putImageData(new ImageData(pixels, width, height), 0, 0)
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 })
      self.postMessage({ id, ok: true, blob } satisfies WorkerResponse)
    } else {
      const gain = exposureGain(params, req.frames.length)
      for (const frame of req.frames) accumulate(total, new Uint8ClampedArray(frame), gain)
      const pixels = develop(total, params, width, height)
      self.postMessage({ id, ok: true, pixels: pixels.buffer } satisfies WorkerResponse, { transfer: [pixels.buffer] })
    }
  } catch (e) {
    self.postMessage({ id, ok: false, error: e instanceof Error ? e.message : String(e) } satisfies WorkerResponse)
  }
}
