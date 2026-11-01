const MAX_EDGE = 1600

export interface ResizedImage {
  blob: Blob
  width: number
  height: number
}

/**
 * Shrinks an uploaded photo so its longest edge is at most 1600px and
 * re-encodes it as JPEG. A 12-megapixel phone photo (~4 MB) becomes ~300 KB.
 * createImageBitmap applies the photo's EXIF rotation, so portrait phone
 * photos stay upright. Throws if the browser can't decode the file.
 */
export async function resizeImage(file: Blob): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', 0.88),
  )
  return { blob, width, height }
}
