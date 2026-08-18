<template>
  <div
    class="phone"
    :style="phoneStyle"
    role="img"
    aria-label="Eddyson Aromin profile terminal"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <!-- Front: profile.sh with image sequence -->
    <div class="phone-face phone-front">
      <div class="terminal-bar">
        <span class="dot-red"></span>
        <span class="dot-yellow"></span>
        <span class="dot-green"></span>
        <span class="terminal-title">profile.sh</span>
      </div>
      <div class="face-body">
        <div class="photo-container" style="view-transition-name: profile-video">
          <canvas ref="canvasRef" class="profile-canvas" aria-hidden="true"></canvas>
        </div>
        <div class="face-footer">
          <span class="fp">$</span>
          <span class="fc">whoami</span>
          <span class="fr">// eddyson_aromin</span>
        </div>
      </div>
    </div>

    <!-- Back: contact.json -->
    <div class="phone-face phone-back">
      <div class="terminal-bar">
        <span class="dot-red"></span>
        <span class="dot-yellow"></span>
        <span class="dot-green"></span>
        <span class="terminal-title">contact.json</span>
      </div>
      <div class="face-body back-body">
        <div class="back-content">
          <a
            v-for="row in contactRows"
            :key="row.label"
            :href="row.href ?? undefined"
            :target="row.external ? '_blank' : undefined"
            :rel="row.external ? 'noopener noreferrer' : undefined"
            class="br"
          >
            <span class="bl">{{ row.label }}</span>
            <span class="bv">{{ row.value }}</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ProfileVideo — 3D-flippable terminal card with a 151-frame image sequence.
 *
 * Behavior:
 *  - On page load: STATIC frame (1 for light, 151 for dark). ZERO animation.
 *  - Theme toggle light→dark: animates forward 1→151.
 *  - Theme toggle dark→light: animates backward 151→1.
 *  - Toggle mid-sequence (e.g. at frame 60): reverses from there.
 *    1→2→3→…→60→59→…→2→1 (ping-pong).
 *  - Animation end: FREEZES at last frame. NEVER snaps to frame 1.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { profile } from '@/data/profile'
import { THEME_CHANGE_EVENT, resolveIsDark } from '@/composables/useTheme'
import type { ThemePreference } from '@/composables/useTheme'

/* ── Frame sequence ────────────────────────────────────────── */
const TOTAL = 151
const FPS = 30
const PREFIX = '/profile-frames/ezgif-frame-'
const INTERVAL = 1000 / FPS

function frameSrc(i: number): string {
  return `${PREFIX}${String(i).padStart(3, '0')}.jpg`
}

/** Canvas-based rendering — bypasses Vue reactivity for butter-smooth 30fps. */
const canvasRef = ref<HTMLCanvasElement | null>(null)
const frameImages: HTMLImageElement[] = []
let loadedCount = 0
let firstFrameDrawn = false
const INITIAL_FRAME = 1
let currentFrame = INITIAL_FRAME

/* ── Preload + draw first frame instantly ──────────────────── */
let preloaded = false
function preload(): void {
  if (preloaded) return
  preloaded = true
  for (let i = 1; i <= TOTAL; i++) {
    const img = new Image()
    img.src = frameSrc(i)
    img.onload = () => {
      loadedCount++
      // Draw first frame as soon as it loads (no waiting for all 151).
      if (!firstFrameDrawn && i === INITIAL_FRAME) {
        drawFrame(INITIAL_FRAME)
        firstFrameDrawn = true
      }
    }
    frameImages[i] = img
  }
}

function drawFrame(frame: number): void {
  const c = canvasRef.value
  const img = frameImages[frame]
  if (!c || !img || !img.complete || !img.naturalWidth) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  // Match the CSS container size (DPR-aware for crisp rendering).
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = c.getBoundingClientRect()
  if (c.width !== rect.width * dpr || c.height !== rect.height * dpr) {
    c.width = rect.width * dpr
    c.height = rect.height * dpr
    ctx.scale(dpr, dpr)
  }
  // Clear + draw with cover behavior + 1.08 zoom.
  ctx.clearRect(0, 0, rect.width, rect.height)
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const scale = Math.max(rect.width / iw, rect.height / ih) * 1.08
  const sw = rect.width / scale
  const sh = rect.height / scale
  const sx = (iw - sw) / 2
  const sy = (ih - sh) * 0.2 // Shift up 20%
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, rect.width, rect.height)
}

/* ── Animation ─────────────────────────────────────────────── */
let raf = 0
let running = false
let dir: 1 | -1 = 1
let lastT = 0

function tick(ts: number): void {
  if (!running) return
  if (ts - lastT >= INTERVAL) {
    lastT = ts
    const next = currentFrame + dir
    if (next < 1 || next > TOTAL) {
      currentFrame = dir === 1 ? TOTAL : 1
      drawFrame(currentFrame)
      running = false
      return
    }
    currentFrame = next
    drawFrame(currentFrame)
  }
  raf = requestAnimationFrame(tick)
}

function animateTo(direction: 1 | -1): void {
  if (running) {
    cancelAnimationFrame(raf)
    running = false
  }
  dir = direction
  const target = direction === 1 ? TOTAL : 1
  if (currentFrame === target) return
  running = true
  lastT = 0
  raf = requestAnimationFrame(tick)
}

/* ── 3D drag/flip ──────────────────────────────────────────── */
const ox = ref(0)
const oy = ref(0)
const sx = ref(0)
const sy = ref(0)
const rx = ref(0)
const ry = ref(0)
const down = ref(false)
const snap = ref(false)

const phoneStyle = computed(() => ({
  transform: `translate(${ox.value}px,${oy.value}px) rotateX(${rx.value}deg) rotateY(${ry.value}deg)`,
  transition: snap.value ? 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
  cursor: down.value ? 'grabbing' : 'grab',
  zIndex: down.value ? 999 : 1,
}))

function onPointerDown(e: PointerEvent): void {
  down.value = true
  snap.value = false
  sx.value = e.clientX - ox.value
  sy.value = e.clientY - oy.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function onPointerMove(e: PointerEvent): void {
  if (!down.value) return
  ox.value = e.clientX - sx.value
  oy.value = e.clientY - sy.value
  rx.value = -(oy.value / 300) * 180
  ry.value = (ox.value / 300) * 180
}
function onPointerUp(): void {
  if (!down.value) return
  down.value = false
  snap.value = true
  ox.value = 0
  oy.value = 0
  rx.value = 0
  ry.value = 0
  setTimeout(() => { snap.value = false }, 600)
}

/* ── Contact data ──────────────────────────────────────────── */
const contactRows = [
  { label: 'email', value: profile.email, href: `mailto:${profile.email}`, external: false },
  { label: 'phone', value: profile.phone, href: `tel:${profile.phone.replace(/\s/g, '')}`, external: false },
  { label: 'location', value: profile.location, href: null as string | null, external: false },
  { label: 'github', value: 'github.com/EddysonA15', href: profile.github, external: true },
  { label: 'linkedin', value: '/in/eddyson-tristan-aromin', href: profile.linkedin, external: true },
]

/* ── Theme listener — BULLETPROOF guard ────────────────────── */
let themeListener: ((e: Event) => void) | null = null
let clickListener: ((e: Event) => void) | null = null
let userToggled = false // Only true AFTER user explicitly clicks theme switch

function currentThemeIsDark(): boolean {
  const stored = (localStorage.getItem('theme') ?? 'light') as ThemePreference
  return resolveIsDark(stored)
}

onMounted(() => {
  // Set correct starting frame. Draw it immediately on the canvas.
  const dark = currentThemeIsDark()
  currentFrame = dark ? TOTAL : 1

  // Preload all frames in background.
  preload()

  // Draw the first frame once the canvas is mounted and the first image loads.
  // Use a ResizeObserver to handle the case where the canvas has 0 dimensions
  // on first mount (e.g. hidden behind another element).
  const drawInitial = (): void => {
    drawFrame(currentFrame)
  }
  // Try drawing immediately (works if canvas has dimensions).
  requestAnimationFrame(() => drawInitial())
  // Also try after a short delay for slow mounts.
  setTimeout(drawInitial, 100)

  // THEME listener — only responds AFTER user has clicked theme switch.
  const onThemeChange = (e: Event): void => {
    if (!userToggled) return
    const d = (e as CustomEvent).detail?.dark
    if (typeof d === 'boolean') {
      animateTo(d ? 1 : -1)
    }
  }
  themeListener = onThemeChange
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange)

  // Detect ACTUAL click on the theme switch button in the DOM.
  const onDocClick = (e: Event): void => {
    if ((e.target as HTMLElement).closest('.theme-switch')) {
      userToggled = true
    }
  }
  clickListener = onDocClick
  document.addEventListener('click', onDocClick, true)
})

onUnmounted(() => {
  if (running) cancelAnimationFrame(raf)
  if (themeListener) {
    window.removeEventListener(THEME_CHANGE_EVENT, themeListener)
    themeListener = null
  }
  if (clickListener) {
    document.removeEventListener('click', clickListener, true)
    clickListener = null
  }
})
</script>

<style scoped>
.phone {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  perspective: 1000px;
  touch-action: none;
  user-select: none;
  will-change: transform;
}
.phone-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 26px 55px -22px rgba(10, 10, 10, 0.3),
    0 0 0 1px rgb(var(--g200));
  background: rgb(var(--bg));
}
.phone-back {
  transform: rotateY(180deg);
}
.terminal-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgb(var(--g100));
  border-bottom: 1px solid rgb(var(--g200));
  flex-shrink: 0;
}
.terminal-title {
  margin-left: 16px;
  font-size: 12px;
  color: rgb(var(--g600));
  font-family: var(--font-mono);
}
.dot-red,
.dot-yellow,
.dot-green {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-red { background: #ff5f57; }
.dot-yellow { background: #ffbd2e; }
.dot-green { background: #28c840; }
.face-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.photo-container {
  position: relative;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
.profile-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.face-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 10px 16px;
  background: rgb(var(--g100));
  border-top: 1px solid rgb(var(--g200));
  flex-shrink: 0;
  font-family: var(--font-mono);
}
.fp { color: rgb(var(--ink)); font-weight: 700; }
.fc { color: rgb(var(--ink)); font-weight: 500; }
.fr { color: rgb(var(--g600)); font-style: italic; }
.back-body {
  align-items: stretch;
  justify-content: flex-start;
  overflow-y: auto;
}
.back-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  width: 100%;
}
.br {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 10px;
  border-left: 2px solid rgb(var(--g300));
  border-radius: 0 8px 8px 0;
  background: rgb(var(--g50));
  transition: border-color 0.2s, background 0.2s;
}
.br:hover {
  border-left-color: rgb(var(--ink));
  background: rgb(var(--g100));
}
.bl {
  font-size: 9.5px;
  color: rgb(var(--g600));
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.bv {
  font-size: 12px;
  color: rgb(var(--ink));
  font-family: var(--font-mono);
  line-height: 1.4;
  overflow-wrap: anywhere;
}
</style>
