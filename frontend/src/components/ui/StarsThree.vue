<template>
  <canvas ref="canvasRef" class="stars-three"></canvas>
</template>

<script setup lang="ts">
/**
 * StarsThree — rotating 3D starfield background (ported from the previous
 * Resume project). Originally used the `three` WebGL renderer; this version
 * projects the same 3000-point sphere with plain Canvas 2D so the site ships
 * WITHOUT the ~365 KB three.js dependency. Fixed, pointer-events-none; sits
 * behind overlays. Pauses when the tab is hidden and respects
 * prefers-reduced-motion (renders a single static frame).
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

let animId: number | null = null
let resizeHandler: (() => void) | null = null
let visibilityHandler: (() => void) | null = null
let running = false
let reduced = false
let positions: Float32Array = new Float32Array(0)
let count = 0
let rotX = Math.PI / 4 // matches the original points.rotation.x start
let rotY = 0

/** Perspective factor — (h/2) / tan(fov/2) with fov 60°, scaled per height. */
const FOV_F = 0.866
/** Camera distance along +Z (matches the original camera.position.z = 1.5). */
const CAM_Z = 1.5
/** Near-plane distance — points closer than this are clipped (as in THREE). */
const NEAR = 0.1

function generateSphere(n: number): Float32Array {
  const pos = new Float32Array(n * 3)
  const radius = 2
  for (let i = 0; i < n; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = Math.cbrt(Math.random()) * radius
    pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r
    pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r
    pos[i * 3 + 2] = Math.cos(phi) * r
  }
  return pos
}

function resize(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const lowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false
  const mobile = window.innerWidth < 768
  const dpr = Math.min(window.devicePixelRatio || 1, reduced || lowEnd ? 1 : 1.5)
  const w = Math.round(window.innerWidth * dpr)
  const h = Math.round(window.innerHeight * dpr)
  canvas.width = w
  canvas.height = h
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
  const n = mobile || lowEnd ? 1500 : 3000
  if (n !== count) {
    count = n
    positions = generateSphere(n)
  }
}

/** One frame — rotate the sphere and project every point with perspective. */
function draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h)
  if (count === 0) return

  rotX -= 0.0001
  rotY -= 0.0002

  const cosX = Math.cos(rotX)
  const sinX = Math.sin(rotX)
  const cosY = Math.cos(rotY)
  const sinY = Math.sin(rotY)
  const cx = w / 2
  const cy = h / 2
  const f = FOV_F * h

  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]

    // Rotate around Y then X (visually identical order to the original).
    const x1 = x * cosY + z * sinY
    const z1 = -x * sinY + z * cosY
    const y1 = y * cosX - z1 * sinX
    const z2 = y * sinX + z1 * cosX

    // Camera at (0,0,CAM_Z) looking down -Z; clip behind the near plane.
    const dz = z2 - CAM_Z
    if (dz >= -NEAR) continue

    const proj = f / -dz
    const px = cx + x1 * proj
    const py = cy + y1 * proj
    if (px < -2 || px > w + 2 || py < -2 || py > h + 2) continue

    // Point size 0.003 world units projected to screen space (THREE default).
    const s = Math.max(1, proj * 0.003)
    ctx.fillRect(px - s / 2, py - s / 2, s, s)
  }
}

function tick(): void {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (canvas && ctx) draw(ctx, canvas.width, canvas.height)
  animId = requestAnimationFrame(tick)
}

function stop(): void {
  if (animId) {
    cancelAnimationFrame(animId)
    animId = null
  }
  running = false
}

function start(): void {
  if (running || reduced) return
  running = true
  animId = requestAnimationFrame(tick)
}

function onVisibility(): void {
  if (document.visibilityState === 'visible') start()
  else stop()
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  resize()
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (canvas && ctx) {
    if (reduced) {
      // Static frame — no animation loop.
      draw(ctx, canvas.width, canvas.height)
    } else {
      start()
    }
  }
  resizeHandler = () => {
    resize()
    if (reduced) {
      const c = canvasRef.value
      const g = c?.getContext('2d')
      if (c && g) draw(g, c.width, c.height)
    }
  }
  window.addEventListener('resize', resizeHandler)
  visibilityHandler = onVisibility
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stop()
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
})
</script>

<style scoped>
.stars-three {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100%;
  min-height: 100vh;
  /* z 0 — paints above element backgrounds but below content (z-10+). */
  z-index: 0;
  pointer-events: none;
  display: block;
}
</style>
