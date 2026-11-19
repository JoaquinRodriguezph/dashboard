import { useEffect, useRef, useState } from 'react'

/** The current width (px) of an element, updated when it resizes. For SVG charts drawn at real size. */
export function useElementWidth<T extends HTMLElement>(): [ref: React.RefObject<T | null>, width: number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}
