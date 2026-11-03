let cached: string | null = null

/**
 * A small tile of neutral (grey) noise, made once with a canvas and reused.
 * Each pixel is a random grey with low opacity, so on top of the photo it adds
 * texture without any colour cast.
 */
export function grainTexture(size = 160): string {
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let p = 0; p < img.data.length; p += 4) {
    const v = Math.random() * 255
    img.data[p] = img.data[p + 1] = img.data[p + 2] = v
    img.data[p + 3] = 14 // ~5.5% opacity per pixel
  }
  ctx.putImageData(img, 0, 0)
  cached = canvas.toDataURL('image/png')
  return cached
}
