// ─────────────────────────────────────────────────────────────────────────────
// The double-exposure "film lab". Pure pixel math, no AI, no libraries.
// These functions run inside the Web Worker (exposure.worker.ts).
//
// Pipeline, mimicking what happens on real film:
//   1. Draw each photo, slightly misaligned, onto the same frame  (drawFrame)
//   2. Convert to LINEAR light and ADD the exposures together       (accumulate)
//   3. Vignette (multiply) + light leak (add), still in linear      (develop)
//   4. Develop with a film shoulder: 1 − exp(−light) → back to sRGB  (develop)
//   5. Chromatic fringing: red shifted right, blue shifted left      (develop)
//   6. Monochrome grain, strongest in the midtones                   (develop)
// ─────────────────────────────────────────────────────────────────────────────

import { between, mulberry32 } from './random'
import type { DoubleExposureSettings } from '../../types'

export type RenderParams = Omit<DoubleExposureSettings, 'enabled'>

/** Output size: a classic 35mm frame is 3:2. */
export const OUTPUT_WIDTH = 1800
export const OUTPUT_HEIGHT = 1200

/** Bump this when the algorithm changes, so cached images are regenerated. */
// v2: natural colour by default (neutral, local light leak) + colour modes.
export const ALGORITHM_VERSION = 2

// ── Colour space lookup tables ──────────────────────────────────────────────
// Screens store colour in "sRGB", which is NOT proportional to light: sRGB 0.5
// is only ~21% of the light of sRGB 1.0. Light adds up linearly, so we convert
// to linear before adding exposures, and back to sRGB at the end.
// Lookup tables make these conversions a single array read per channel.

const SRGB_TO_LINEAR = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const LINEAR_STEPS = 4096
const LINEAR_TO_SRGB = new Float32Array(LINEAR_STEPS + 1)
for (let i = 0; i <= LINEAR_STEPS; i++) {
  const c = i / LINEAR_STEPS
  LINEAR_TO_SRGB[i] = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
}

// ── Step 1: frame placement ─────────────────────────────────────────────────

export interface FrameTransform {
  dx: number // px
  dy: number // px
  rotation: number // radians
  zoom: number
}

/**
 * Where each frame lands. Computed up front from the seed so the result is
 * identical whether the drawing happens in the worker or on the main thread.
 */
export function frameTransforms(count: number, params: RenderParams, width: number): FrameTransform[] {
  const rng = mulberry32(params.seed)
  const m = params.misalignment
  return Array.from({ length: count }, (_, i) => {
    // Film advance: each frame sits further along the strip, centred on the middle frame.
    const advance = (i - (count - 1) / 2) * params.frameOverlap * 0.45 * width
    return {
      dx: advance + between(rng, -1, 1) * m * 0.06 * width,
      dy: between(rng, -1, 1) * m * 0.05 * width,
      rotation: (between(rng, -1, 1) * m * 4 * Math.PI) / 180,
      zoom: 1 + rng() * (0.02 + m * 0.08),
    }
  })
}

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** Draws one photo "cover-fit" (fills the frame, cropping the excess), then shifted/rotated/zoomed. */
export function drawFrame(ctx: Ctx2D, image: CanvasImageSource & { width: number; height: number }, t: FrameTransform, width: number, height: number) {
  const cover = Math.max(width / image.width, height / image.height) * t.zoom
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#000' // unexposed film = no light
  ctx.fillRect(0, 0, width, height)
  ctx.translate(width / 2 + t.dx, height / 2 + t.dy)
  ctx.rotate(t.rotation)
  ctx.scale(cover, cover)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, -image.width / 2, -image.height / 2)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

// ── Step 2: add light ───────────────────────────────────────────────────────

/** Adds one frame's light (RGBA bytes) into the running total (RGB floats, linear). */
export function accumulate(total: Float32Array, rgba: Uint8ClampedArray, gain: number) {
  for (let p = 0, q = 0; p < rgba.length; p += 4, q += 3) {
    total[q] += SRGB_TO_LINEAR[rgba[p]] * gain
    total[q + 1] += SRGB_TO_LINEAR[rgba[p + 1]] * gain
    total[q + 2] += SRGB_TO_LINEAR[rgba[p + 2]] * gain
  }
}

/** gain / √n: more frames add more light, but not n times more (that would just blow out). */
export const exposureGain = (params: RenderParams, frameCount: number) => params.exposure / Math.sqrt(Math.max(1, frameCount))

// ── Steps 3–6: develop ──────────────────────────────────────────────────────

// ── Colour modes ────────────────────────────────────────────────────────────
// Natural: no colour shift anywhere. The light leak is neutral white light.
// Warm film: an orange leak plus a gentle warm grade (more red, less blue).
// Black & white: brightness only, computed from linear light.
// (Before v2, every image got the orange leak and it covered the whole frame:
// that was the brown tint.)

export const LEAK_COLOR = {
  natural: [1, 1, 1],
  warm: [1.0, 0.42, 0.1],
  bw: [1, 1, 1],
} as const

/** Multiplies linear light per channel. Natural and B&W: no change. */
export const COLOR_GRADE = {
  natural: [1, 1, 1],
  warm: [1.08, 1.0, 0.84],
  bw: [1, 1, 1],
} as const

/** How much each channel contributes to brightness (Rec. 709, linear light). */
export const LUMA = [0.2126, 0.7152, 0.0722] as const

/** Where the light leak sits. Shared with the live (WebGL) version so both look alike. */
export function leakGeometry(seed: number, width: number, height: number) {
  // A second random stream, so changing the number of photos doesn't move the light leak.
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0)
  const edge = Math.floor(rng() * 4) // 0 left, 1 right, 2 top, 3 bottom
  const along = between(rng, 0.15, 0.85)
  const outside = 0.04 * width // centre just outside the edge…
  return {
    rng, // the grain continues from this same stream
    x: edge === 0 ? -outside : edge === 1 ? width + outside : along * width,
    y: edge === 2 ? -outside : edge === 3 ? height + outside : along * height,
    radius: between(rng, 0.16, 0.28) * width, // …and small enough to stay near that edge
  }
}

/** Turns the accumulated light into final RGBA pixels. */
export function develop(total: Float32Array, params: RenderParams, width: number, height: number): Uint8ClampedArray<ArrayBuffer> {
  const leakGeo = leakGeometry(params.seed, width, height)
  const rng = leakGeo.rng
  const leakStrength = params.lightLeak * 1.6
  const leakColor = LEAK_COLOR[params.color]
  const grade = COLOR_GRADE[params.color]
  const mono = params.color === 'bw'

  const cx = width / 2
  const cy = height / 2
  const corner = Math.hypot(cx, cy)
  const developed = new Float32Array(width * height * 3) // sRGB 0–1
  const light = [0, 0, 0]

  for (let y = 0, q = 0; y < height; y++) {
    for (let x = 0; x < width; x++, q += 3) {
      // 3a. Vignette: darken towards the corners (multiply light; same for R, G and B).
      const r = Math.hypot(x - cx, y - cy) / corner // 0 centre → 1 corner
      const edgeFade = Math.min(1, Math.max(0, (r - 0.35) / 0.65))
      const vignette = 1 - params.vignette * 0.85 * edgeFade * edgeFade * (3 - 2 * edgeFade) // smoothstep

      // 3b. Light leak: ADD light, fading out with distance (Gaussian).
      const d2 = (x - leakGeo.x) ** 2 + (y - leakGeo.y) ** 2
      const leak = leakStrength * Math.exp(-d2 / (leakGeo.radius * leakGeo.radius))

      for (let c = 0; c < 3; c++) light[c] = total[q + c] * vignette * grade[c] + leak * leakColor[c]
      if (mono) light[0] = light[1] = light[2] = LUMA[0] * light[0] + LUMA[1] * light[1] + LUMA[2] * light[2]

      for (let c = 0; c < 3; c++) {
        // 4. Film shoulder: highlights roll off smoothly instead of clipping.
        // Applied to R, G and B the same way, so it doesn't shift colour.
        const linear = 1 - Math.exp(-light[c])
        developed[q + c] = LINEAR_TO_SRGB[Math.round(linear * LINEAR_STEPS)]
      }
    }
  }

  // 5 + 6. Chromatic fringing and grain, written to the final RGBA buffer.
  // (No fringing in black & white: with R = G = B it would only blur.)
  const out = new Uint8ClampedArray(width * height * 4)
  const fringe = mono ? 0 : Math.max(1, Math.round((2 * width) / OUTPUT_WIDTH))
  const grain = params.grain * 0.45
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      const q = (row + x) * 3
      const red = developed[(row + Math.min(width - 1, x + fringe)) * 3] // red from the right
      const green = developed[q + 1]
      const blue = developed[(row + Math.max(0, x - fringe)) * 3 + 2] // blue from the left

      // Monochrome grain: ONE noise value for all three channels (no colour speckle).
      // Sum of 3 uniforms ≈ bell curve, centred on 0.
      const noise = (rng() + rng() + rng() - 1.5) * 1.15
      const p = (row + x) * 4
      // v·(1−v) is 0 at black and white and peaks at mid-grey ×4 → 0…1.
      out[p] = (red + noise * grain * red * (1 - red) * 4) * 255
      out[p + 1] = (green + noise * grain * green * (1 - green) * 4) * 255
      out[p + 2] = (blue + noise * grain * blue * (1 - blue) * 4) * 255
      out[p + 3] = 255
    }
  }
  return out
}
