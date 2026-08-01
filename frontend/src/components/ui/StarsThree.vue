<template>
  <canvas ref="canvasRef" class="stars-three" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
/**
 * StarsThree — 3D rotating star sphere (Three.js), ported from the
 * resume site's homepage. Renders ONLY in dark mode; hidden in light.
 * Uses the locally installed `three` package (no CDN).
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId: number | null = null

let renderer: THREE.WebGLRenderer | null = null
let geometry: THREE.BufferGeometry | null = null
let material: THREE.PointsMaterial | null = null
let points: THREE.Points | null = null
let camera: THREE.PerspectiveCamera | null = null
let scene: THREE.Scene | null = null
let observer: MutationObserver | null = null
let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null

function isDark(): boolean {
  return document.documentElement.classList.contains('dark')
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  // Only build the 3D scene when dark mode is active (visible).
  if (!isDark()) return

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  )
  camera.position.z = 1.5

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  gl = renderer.getContext()

  // Stars geometry — points distributed inside a sphere
  const count = 3000
  const positions = new Float32Array(count * 3)
  const radius = 2
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = Math.cbrt(Math.random()) * radius
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r
    positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r
    positions[i * 3 + 2] = Math.cos(phi) * r
  }

  geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.003,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true,
    depthWrite: false,
  })

  points = new THREE.Points(geometry, material)
  points.rotation.x = Math.PI / 4
  scene.add(points)

  // Animation
  function loop(): void {
    if (points) {
      points.rotation.x -= 0.0001
      points.rotation.y -= 0.0002
    }
    if (renderer && scene && camera) renderer.render(scene, camera)
    animId = requestAnimationFrame(loop)
  }
  animId = requestAnimationFrame(loop)

  // Resize
  function resize(): void {
    if (!renderer || !camera) return
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', resize)

  // Tear down when switching to light mode; rebuild on dark.
  observer = new MutationObserver(() => {
    if (isDark()) return // already rendering
    dispose()
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  onUnmounted(() => {
    dispose()
  })

  function dispose(): void {
    if (animId) cancelAnimationFrame(animId)
    animId = null
    window.removeEventListener('resize', resize)
    if (observer) observer.disconnect()
    observer = null
    geometry?.dispose()
    material?.dispose()
    renderer?.dispose()
    geometry = null
    material = null
    renderer = null
    scene = null
    camera = null
    points = null
    // Release the exact WebGL context that was created (avoids
    // "existing context of a different type" on rapid re-mounts).
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    gl = null
  }
})
</script>

<style scoped>
.stars-three {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100%;
  min-height: 100vh;
  z-index: 0;
  pointer-events: none;
  display: block;
}

/*
 * NOTE: This component is only mounted in dark mode (HalftoneBackdrop
 * uses <StarsThree v-else />), so no light-mode hiding is needed here.
 * A previous `:global(html:not(.dark)) .stars-three { display:none }`
 * compiled to `html:not(.dark){display:none}` — which hid the ENTIRE
 * <html> element in light mode and white-screened the whole site.
 */
</style>
