import { useEffect, useState } from 'react'

const query = '(prefers-reduced-motion: reduce)'

/** True when the OS "reduce motion" accessibility setting is on. Updates live. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return reduced
}
