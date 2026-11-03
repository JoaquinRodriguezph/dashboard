// ─────────────────────────────────────────────────────────────────────────────
// LiveExposure: the "Live double exposure" background mode. The only 3D/WebGL
// code in the app, lazy-loaded (with three.js) only when the setting is on.
//
// A full-screen rectangle with a custom fragment shader that does, every frame,
// the same maths as the still image (lib/exposure/render.ts):
//   sRGB → linear → ADD the photos × exposure/√n → vignette → colour grade
//   → light leak → (black & white) → 1 − exp(−light) → back to sRGB
// Each photo slowly drifts, zooms and turns on its own path, so the layers
// glide past each other. Grain comes from the CSS grain layer on top.
//
// Performance: the canvas only draws when told to (frameloop="demand"), and a
// small loop asks for at most 30 frames a second. It stops when the tab is
// hidden (requestAnimationFrame pauses), renders at 1× pixel density, and
// textures are shrunk to 1280px.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { COLOR_GRADE, LEAK_COLOR, LUMA, leakGeometry } from '../lib/exposure/render'
import { mulberry32 } from '../lib/exposure/random'
import type { DoubleExposureSettings, Photo } from '../types'

const MAX_LAYERS = 6
const MAX_FPS = 30
const TEXTURE_EDGE = 1280

interface LiveExposureProps {
  photos: Photo[]
  settings: DoubleExposureSettings
}

export default function LiveExposure({ photos, settings }: LiveExposureProps) {
  const textures = usePhotoTextures(photos.slice(0, MAX_LAYERS))
  if (!textures) return null // still decoding: the still photo underneath shows meanwhile
  return (
    <div className="absolute inset-0">
      <Canvas
        frameloop="demand"
        dpr={1}
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
        // Outputs the shader's colours untouched (no extra tone mapping or colour conversion).
        flat
        linear
      >
        <FrameCap fps={MAX_FPS} />
        <ExposureQuad textures={textures} settings={settings} />
      </Canvas>
    </div>
  )
}

/** Decodes the photos into GPU textures (shrunk, flipped for WebGL), and frees them on change. */
function usePhotoTextures(photos: Photo[]): { texture: THREE.Texture; aspect: number }[] | null {
  const [textures, setTextures] = useState<{ texture: THREE.Texture; aspect: number }[] | null>(null)
  const key = photos.map((p) => p.id).join()

  useEffect(() => {
    let cancelled = false
    let made: THREE.Texture[] = []
    Promise.all(
      photos.map(async (p) => {
        const scale = Math.min(1, TEXTURE_EDGE / Math.max(p.width, p.height))
        const bitmap = await createImageBitmap(p.blob, {
          imageOrientation: 'flipY', // WebGL's y axis points up
          resizeWidth: Math.round(p.width * scale),
          resizeHeight: Math.round(p.height * scale),
          resizeQuality: 'high',
        })
        const texture = new THREE.Texture(bitmap)
        texture.colorSpace = THREE.NoColorSpace // raw sRGB values: the shader converts itself
        texture.generateMipmaps = false
        texture.minFilter = THREE.LinearFilter
        texture.needsUpdate = true
        return { texture, aspect: p.width / p.height }
      }),
    ).then((list) => {
      made = list.map((l) => l.texture)
      if (cancelled) made.forEach((t) => t.dispose())
      else setTextures(list)
    })
    return () => {
      cancelled = true
      made.forEach((t) => t.dispose())
    }
    // `key` (the photo ids) stands in for `photos`, so a new array with the same photos doesn't reload.
  }, [key])

  return textures
}

/**
 * Asks for a new frame at most `fps` times a second, and never while the tab
 * is hidden (browsers also pause requestAnimationFrame there; this makes sure).
 */
function FrameCap({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let raf = 0
    let last = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) return
      if (now - last >= 1000 / fps - 1) {
        last = now
        invalidate()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [fps, invalidate])
  return null
}

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0); // a 2×2 plane = the whole screen
  }
`

/**
 * Builds the fragment shader for exactly `n` photos. Each photo gets its own
 * texture slot (uTex0, uTex1, …): WebGL 2 doesn't reliably allow looping over
 * an array of textures, so the per-photo code is written out n times.
 */
function fragmentShader(n: number): string {
  const layers = Array.from({ length: n }, (_, i) => `light += layer(uTex${i}, uAspect[${i}], uPath[${i}], ${i}.0);`).join('\n    ')
  return /* glsl */ `
  varying vec2 vUv;
  ${Array.from({ length: n }, (_, i) => `uniform sampler2D uTex${i};`).join('\n  ')}
  uniform float uAspect[${n}];
  uniform vec4 uPath[${n}];   // per-photo random phases for its drift
  uniform vec2 uScreen;       // screen size in pixels
  uniform float uTime;
  uniform float uGain, uVignette, uMis, uOverlap, uCount, uMono;
  uniform vec3 uGrade, uLeakColor;
  uniform vec2 uLeakPos;      // 0–1 across the screen
  uniform float uLeakRadius, uLeakStrength;

  vec3 toLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
  }
  vec3 toSrgb(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }

  // One photo: cover-fit, slowly drifting/zooming/turning, as linear light.
  vec3 layer(sampler2D tex, float aspect, vec4 p, float i) {
    float screenAspect = uScreen.x / uScreen.y;
    float t = uTime;
    // ~50–70 s cycles, different per photo.
    vec2 drift = vec2(sin(t * (0.09 + p.x * 0.03) + p.y * 6.28), cos(t * (0.08 + p.z * 0.03) + p.w * 6.28));
    drift *= 0.025 + uMis * 0.04;
    drift.x += (i - (uCount - 1.0) * 0.5) * uOverlap * 0.18; // film advance
    float zoom = 1.12 + 0.05 * sin(t * (0.07 + p.y * 0.02) + p.x * 6.28);
    float angle = sin(t * (0.05 + p.w * 0.02) + p.z * 6.28) * (0.01 + uMis * 0.03);

    vec2 uv = vUv - 0.5;
    uv.x *= screenAspect;
    uv = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * uv;
    uv.x /= screenAspect;
    // Cover-fit: crop the photo's longer side to fill the screen.
    vec2 fit = screenAspect > aspect ? vec2(1.0, aspect / screenAspect) : vec2(screenAspect / aspect, 1.0);
    uv = uv * fit / zoom + 0.5 + drift;
    // Off the photo = unexposed film = no light.
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    return toLinear(texture2D(tex, uv).rgb) * inside;
  }

  void main() {
    vec3 light = vec3(0.0);
    ${layers}
    light *= uGain;

    // Vignette (multiply), same curve as the still image.
    vec2 c = (vUv - 0.5) * uScreen;
    float r = length(c) / length(uScreen * 0.5);
    float edgeFade = clamp((r - 0.35) / 0.65, 0.0, 1.0);
    light *= 1.0 - uVignette * 0.85 * edgeFade * edgeFade * (3.0 - 2.0 * edgeFade);

    light *= uGrade;
    // Light leak (add): a soft glow from just outside one edge.
    vec2 d = (vUv - uLeakPos) * uScreen;
    light += uLeakStrength * exp(-dot(d, d) / (uLeakRadius * uLeakRadius)) * uLeakColor;

    if (uMono > 0.5) light = vec3(dot(light, vec3(${LUMA.join(', ')})));
    // Film shoulder, then back to screen colours.
    gl_FragColor = vec4(toSrgb(1.0 - exp(-light)), 1.0);
  }
`
}

function ExposureQuad({ textures, settings }: { textures: { texture: THREE.Texture; aspect: number }[]; settings: DoubleExposureSettings }) {
  const size = useThree((s) => s.size)
  const n = textures.length

  const material = useMemo(() => {
    const rng = mulberry32(settings.seed)
    const uniforms: Record<string, THREE.IUniform> = {
      uAspect: { value: textures.map((t) => t.aspect) },
      uPath: { value: textures.map(() => new THREE.Vector4(rng(), rng(), rng(), rng())) },
      uScreen: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uGain: { value: settings.exposure / Math.sqrt(n) },
      uVignette: { value: settings.vignette },
      uMis: { value: settings.misalignment },
      uOverlap: { value: settings.frameOverlap },
      uCount: { value: n },
      uMono: { value: settings.color === 'bw' ? 1 : 0 },
      uGrade: { value: new THREE.Vector3(...COLOR_GRADE[settings.color]) },
      uLeakColor: { value: new THREE.Vector3(...LEAK_COLOR[settings.color]) },
      uLeakPos: { value: new THREE.Vector2(0.5, 0.5) },
      uLeakRadius: { value: 1 },
      uLeakStrength: { value: settings.lightLeak * 1.6 },
    }
    textures.forEach((t, i) => (uniforms[`uTex${i}`] = { value: t.texture }))
    return new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: fragmentShader(n), uniforms, depthTest: false })
  }, [textures, settings, n])

  useEffect(() => () => material.dispose(), [material])

  // Screen size and the light leak's position follow the window size.
  useEffect(() => {
    const leak = leakGeometry(settings.seed, size.width, size.height)
    material.uniforms.uScreen.value.set(size.width, size.height)
    // The shader's y axis points up; the still image's points down.
    material.uniforms.uLeakPos.value.set(leak.x / size.width, 1 - leak.y / size.height)
    material.uniforms.uLeakRadius.value = leak.radius
  }, [material, size, settings.seed])

  useFrame(() => {
    material.uniforms.uTime.value = performance.now() / 1000
  })

  return (
    <mesh material={material} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
