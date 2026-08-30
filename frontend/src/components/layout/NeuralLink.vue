<script setup lang="ts">
/**
 * NeuralLink — page-wide animated background (greyfolio "neural link" look):
 * a field of drifting nodes connected by lines that fade with distance.
 * Rendered on a fixed canvas behind the content; decorative, pointer-events
 * disabled, and pauses when the tab is hidden. Respects prefers-reduced-motion
 * (renders a single static frame). Reads the --ink token for color so it stays
 * on-theme. Used for light mode; dark mode keeps the 3D star sphere.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { THEME_CHANGE_EVENT } from '@/composables/useTheme'

const canvasRef = ref<HTMLCanvasElement | null>(null)

/**
 * Whether this layer is the visible theme backdrop. When false (the other
 * theme is showing) the rAF loop is stopped so the hidden canvas costs
 * nothing — no wasted per-frame draws while only the stars run.
 */
const props = defineProps<{ active?: boolean }>()

interface LinkNode {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

const LINK_DIST = 150

let raf = 0
let nodes: LinkNode[] = []
let w = 0
let h = 0
let dpr = 1
let ink = '10 10 10'
let resizeObserver: ResizeObserver | null = null
let reduced = false
let frameCount = 0

function readInk(): void {
  const val = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()
  if (val) ink = val
}

function buildNodes(width: number, height: number): LinkNode[] {
  // Lower density for smoothness: area/12000 → ~175 @1080p, ~300 @1440p, cap 320.
  // Visually almost identical (halftone already sparse) but ~35% fewer links.
  const count = Math.round(Math.min(320, Math.max(80, (width * height) / 12000)))
  const arr: LinkNode[] = []
  for (let i = 0; i < count; i++) {
    arr.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.6 + 0.8,
    })
  }
  return arr
}

function resize(): void {
  const c = canvasRef.value
  if (!c) return
  // DPR capped at 1 — crisp enough for 1px dots, huge perf win on HiDPI
  dpr = Math.min(window.devicePixelRatio || 1, 1)
  w = window.innerWidth
  h = window.innerHeight
  c.width = Math.round(w * dpr)
  c.height = Math.round(h * dpr)
  c.style.width = `${w}px`
  c.style.height = `${h}px`
  nodes = buildNodes(w, h)
  if (reduced) draw()
}

function draw(): void {
  const c = canvasRef.value
  const ctx = c?.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const [r, g, b] = ink.split(/\s+/).map(Number)

  // Drift
  for (const n of nodes) {
    n.x += n.vx
    n.y += n.vy
    if (n.x < -24) n.x = w + 24
    else if (n.x > w + 24) n.x = -24
    if (n.y < -24) n.y = h + 24
    else if (n.y > h + 24) n.y = -24
  }

  // Uniform grid — only nodes in the same or adjacent cells (within
  // LINK_DIST) can ever link, so the O(n²) pass becomes ~O(n) without
  // changing a single visible pixel.
  const cell = LINK_DIST
  const cols = Math.max(1, Math.ceil(w / cell))
  const rows = Math.max(1, Math.ceil(h / cell))
  const grid = new Map<number, number[]>()
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    const key = Math.floor(n.y / cell) * cols + Math.floor(n.x / cell)
    let bucket = grid.get(key)
    if (!bucket) {
      bucket = []
      grid.set(key, bucket)
    }
    bucket.push(i)
  }

  // Link lines — alpha fades with distance (exactly as before)
  const n = nodes.length
  for (let i = 0; i < n; i++) {
    const a = nodes[i]
    const gx = Math.floor(a.x / cell)
    const gy = Math.floor(a.y / cell)
    for (let dy = -1; dy <= 1; dy++) {
      const cy = gy + dy
      if (cy < 0 || cy >= rows) continue
      for (let dx = -1; dx <= 1; dx++) {
        const cx = gx + dx
        if (cx < 0 || cx >= cols) continue
        const bucket = grid.get(cy * cols + cx)
        if (!bucket) continue
        for (const j of bucket) {
          if (j <= i) continue
          const bNode = nodes[j]
          const dx2 = a.x - bNode.x
          const dy2 = a.y - bNode.y
          const d2 = dx2 * dx2 + dy2 * dy2
          if (d2 < LINK_DIST * LINK_DIST) {
            const t = 1 - Math.sqrt(d2) / LINK_DIST
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${t * 0.18})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(bNode.x, bNode.y)
            ctx.stroke()
          }
        }
      }
    }
  }

  // Nodes
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.4)`
  for (const n of nodes) {
    ctx.beginPath()
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function tick(): void {
  // Throttle to ~30fps — halftone drift is imperceptible at 60fps, 30fps halves CPU
  frameCount++
  if (frameCount % 2 === 0) draw()
  raf = requestAnimationFrame(tick)
}

function onVisibility(): void {
  const nowVisible = document.visibilityState === 'visible'
  if (nowVisible && !reduced && props.active !== false && !raf) {
    raf = requestAnimationFrame(tick)
  } else if (!nowVisible && raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
}

function onThemeChange(): void {
  readInk()
  // Repaint immediately so the node color matches the new --ink token
  // (light 10 10 10 vs dark 244 244 245) without waiting for next rAF.
  draw()
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  readInk()
  resize()
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(document.body)
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange)
  // Draw the FIRST frame synchronously — do NOT wait for the rAF loop.
  // During a View-Transition theme switch the browser freezes rAF until the
  // transition finishes, so waiting would leave the canvas blank (pure white)
  // until a manual refresh. Drawing here guarantees the backdrop is visible
  // the instant the component mounts, even mid-transition.
  draw()
  // Start the loop only if this layer is the active backdrop (the other
  // theme's canvas stays mounted but paused → zero animation cost).
  if (props.active !== false && !reduced) {
    raf = requestAnimationFrame(tick)
  }
  document.addEventListener('visibilitychange', onVisibility)
})

// When the theme flips, the new layer becomes visible. Draw synchronously
// so the new View Transition snapshot already contains the painted backdrop
// (setTimeout would paint AFTER the snapshot → blank tail flash).
watch(
  () => props.active,
  (active) => {
    if (active && !reduced && !raf) {
      readInk()
      draw()
      raf = requestAnimationFrame(tick)
    } else if (!active && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  },
)

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  resizeObserver?.disconnect()
  resizeObserver = null
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange)
})
</script>

<template>
  <canvas ref="canvasRef" aria-hidden="true" class="h-full w-full" />
</template>
