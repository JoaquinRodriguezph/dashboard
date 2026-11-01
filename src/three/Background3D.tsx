// ─────────────────────────────────────────────────────────────────────────────
// Background3D — the only 3D code in the app. Loaded lazily by App.tsx, so
// three.js never delays the first paint. Redesign freely: App only needs a
// default export that accepts { dark, reducedMotion }.
//
// Performance: the canvas uses frameloop="demand", meaning it draws NOTHING
// unless something changes. Every ~16 seconds all shapes glide together to a
// new pose for 6 seconds (@react-spring/three requests frames only while a
// spring is moving), then the GPU sits idle until the next glide.
// With reduced motion on, a single frame is drawn and nothing ever moves.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Icosahedron } from '@react-three/drei'
import { a, easings, useSpring } from '@react-spring/three'

interface Background3DProps {
  dark: boolean
  reducedMotion: boolean
}

type Vec3 = [number, number, number]

interface ShapeConfig {
  base: Vec3
  scale: number
  light: string
  dark: string
}

const SHAPES: ShapeConfig[] = [
  { base: [-3.2, 1.6, -2], scale: 1.6, light: '#99f6e4', dark: '#14706a' },
  { base: [3.4, -1.2, -3], scale: 2.1, light: '#bae6fd', dark: '#24508a' },
  { base: [0.6, -3, -4], scale: 1.2, light: '#ddd6fe', dark: '#4c3d8f' },
]

const GLIDE_MS = 6000 // how long each movement takes
const PAUSE_MS = 10000 // how long everything stays still in between

const rand = (min: number, max: number) => min + Math.random() * (max - min)

interface ShapeProps {
  config: ShapeConfig
  dark: boolean
  reducedMotion: boolean
  /** Increments each time the shapes should glide to a new pose. */
  glide: number
}

function Shape({ config, dark, reducedMotion, glide }: ShapeProps) {
  // Each axis is its own animated number (px = position x, rx = rotation x, ...).
  const [s, api] = useSpring(() => ({
    px: config.base[0],
    py: config.base[1],
    pz: config.base[2],
    rx: rand(0, Math.PI),
    ry: rand(0, Math.PI),
    rz: 0,
    config: { duration: GLIDE_MS, easing: easings.easeInOutSine },
  }))

  // Fade the color when the theme changes (instant with reduced motion).
  const { color } = useSpring({
    color: dark ? config.dark : config.light,
    immediate: reducedMotion,
    config: { duration: 600 },
  })

  useEffect(() => {
    if (glide === 0) return
    const [x, y, z] = config.base
    api.start({
      px: x + rand(-0.5, 0.5),
      py: y + rand(-0.4, 0.4),
      pz: z + rand(-0.3, 0.3),
      rx: rand(0, Math.PI * 2),
      ry: rand(0, Math.PI * 2),
      rz: rand(0, Math.PI),
    })
  }, [api, config, glide])

  return (
    <a.group
      position-x={s.px}
      position-y={s.py}
      position-z={s.pz}
      rotation-x={s.rx}
      rotation-y={s.ry}
      rotation-z={s.rz}
      scale={config.scale}
    >
      <Icosahedron args={[1, 0]}>
        <a.meshStandardMaterial color={color} flatShading transparent opacity={dark ? 0.6 : 0.7} />
      </Icosahedron>
    </a.group>
  )
}

export default function Background3D({ dark, reducedMotion }: Background3DProps) {
  // One shared timer, so all shapes move at the same time and then all rest.
  const [glide, setGlide] = useState(0)

  useEffect(() => {
    if (reducedMotion) return
    let timer: number
    const next = (delay: number) => {
      timer = window.setTimeout(() => {
        if (!document.hidden) setGlide((g) => g + 1) // skip glides in background tabs
        next(GLIDE_MS + PAUSE_MS)
      }, delay)
    }
    next(1500)
    return () => window.clearTimeout(timer)
  }, [reducedMotion])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]} // cap resolution on high-DPI phones
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 8], fov: 50 }}
      >
        <ambientLight intensity={dark ? 0.7 : 1.1} />
        <directionalLight position={[3, 5, 4]} intensity={dark ? 1.4 : 1.6} />
        {SHAPES.map((config, i) => (
          <Shape key={i} config={config} dark={dark} reducedMotion={reducedMotion} glide={glide} />
        ))}
      </Canvas>
    </div>
  )
}
