<script setup lang="ts">
/**
 * ClickRipple — global ink ripple on every click (greyfolio "click effect").
 * A fixed full-viewport canvas sits above the UI (pointer-events: none) and
 * draws a small expanding ring + center flash at every pointerdown. Theme
 * aligned: reads the --ink token, re-reads it when the theme flips. Pauses
 * when the tab is hidden and skips under prefers-reduced-motion.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { THEME_CHANGE_EVENT } from '@/composables/useTheme'

const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Ripple {
  x: number
  y: number
  start: number
}

const DURATION = 620
const MAX_RADIUS = 18
const MAX_RIPPLES = 14

let raf = 0
let w = 0
let h = 0
let dpr = 1
let ink = '10 10 10'
let ripples: Ripple[] = []
let reduced = false
let visible = true

function readInk(): void {
  const val = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()
  if (val) ink = val
}

function resize(): void {
  const c = canvasRef.value
  if (!c) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = window.innerWidth
  h = window.innerHeight
  c.width = Math.round(w * dpr)
  c.height = Math.round(h * dpr)
  c.style.width = `${w}px`
  c.style.height = `${h}px`
}

/** Ease-out cubic — fast start, gentle settle. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function onPointerDown(e: PointerEvent): void {
  if (reduced) return
  ripples.push({ x: e.clientX, y: e.clientY, start: performance.now() })
  if (ripples.length > MAX_RIPPLES) ripples.shift()
}

function draw(now: number): void {
  const c = canvasRef.value
  const ctx = c?.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const [r, g, b] = ink.split(/\s+/).map(Number)

  ripples = ripples.filter((rp) => now - rp.start < DURATION)

  for (const rp of ripples) {
    const t = (now - rp.start) / DURATION
    const eased = easeOut(t)

    // Expanding ring
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(1 - t) * 0.35})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(rp.x, rp.y, 3 + eased * MAX_RADIUS, 0, Math.PI * 2)
    ctx.stroke()

    // Center flash — quick dot that fades almost immediately
    if (t < 0.25) {
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(1 - t * 4) * 0.28})`
      ctx.beginPath()
      ctx.arc(rp.x, rp.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function tick(now: number): void {
  draw(now)
  raf = requestAnimationFrame(tick)
}

function onVisibility(): void {
  visible = document.visibilityState === 'visible'
  if (visible && !reduced && !raf) {
    raf = requestAnimationFrame(tick)
  } else if (!visible && raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
}

function onThemeChange(): void {
  readInk()
}

onMounted(() => {
  if (typeof window === 'undefined') return
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  readInk()
  resize()
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('resize', resize)
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange)
  document.addEventListener('visibilitychange', onVisibility)
  if (!reduced) raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('resize', resize)
  window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    aria-hidden="true"
    class="pointer-events-none fixed left-0 top-0 z-[180]"
  />
</template>
