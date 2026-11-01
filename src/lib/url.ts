/**
 * Turns user input like "youtube.com" into "https://youtube.com".
 * Returns undefined for empty or invalid input, and for anything that isn't
 * http(s) (e.g. "javascript:..." links, which could run code when clicked).
 */
export function normalizeUrl(input: string | undefined): string | undefined {
  const trimmed = input?.trim()
  if (!trimmed) return undefined
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}
