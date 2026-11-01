/**
 * A tiny seeded random number generator ("mulberry32").
 * Math.random() gives different numbers every time; this gives the SAME
 * sequence for the same seed, which is what makes a double exposure reproducible.
 * Returns a function producing numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random number in [min, max). */
export const between = (rng: () => number, min: number, max: number) => min + rng() * (max - min)
