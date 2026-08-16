<script setup lang="ts">
/**
 * SalaryCat — a kawaii "salary cat" desktop pet for the site (from the
 * OpenPets gallery: https://openpets.dev · pet: SalaryCat 月薪喵, pack
 * https://zip.openpets.dev/pets/salary-cat-9d6f7679/salary-cat.zip, source
 * https://github.com/yunKKang/salarycat-codex-pet).
 *
 * Behavior:
 *  - Lives on the "floor" (bottom of the viewport), patrolling left/right,
 *    idling, waving and jumping.
 *  - DRAGGABLE — grab it and throw it anywhere; on release it falls back
 *    down with gravity and a little bounce.
 *  - Click (without dragging) makes it wave.
 *  - Reads the shared pet config (enabled / scale / speed / animate) from
 *    usePetConfig, so the navbar toggle and /aromin/preferences control it.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { petConfig } from '@/composables/usePetConfig'

const FRAME_W = 192
const FRAME_H = 208
const COLS = 8

type AnimName = 'idle' | 'walkL' | 'walkR' | 'wave' | 'jump'
interface AnimDef {
  frames: number[]
  fps: number
  once?: boolean
}

const ANIMS: Record<AnimName, AnimDef> = {
  idle: { frames: [0, 1, 2, 3, 4, 5], fps: 8 },
  walkL: { frames: [16, 17, 18, 19, 20, 21, 22, 23], fps: 12 },
  walkR: { frames: [8, 9, 10, 11, 12, 13, 14, 15], fps: 12 },
  wave: { frames: [24, 25, 26, 27], fps: 10, once: true },
  jump: { frames: [32, 33, 34, 35, 36], fps: 10, once: true },
}

const catW = computed(() => FRAME_W * petConfig.scale)
const catH = computed(() => FRAME_H * petConfig.scale)
const floorY = () => window.innerHeight - FRAME_H * petConfig.scale

/** Walk/drag left limit — on desktop stay right of the fixed sidebar
 *  (w-56 = 224px) so the cat never roams behind/over the navbar. */
const minX = () => (window.innerWidth >= 1024 ? 232 : 8)

const x = ref(0) // top-left x in viewport px
const y = ref(0) // top-left y in viewport px
const bgPos = ref('0px 0px')
const dragging = ref(false)
const waving = ref(false)

// ── Physics ──────────────────────────────────────────────────────
let vy = 0
let grounded = true
const GRAVITY = 2400 // px/s²
const BOUNCE = 0.32
// Fixed-timestep integration (120Hz) — gravity is always the same speed,
// even when the frame rate drops (a naive capped dt used to make the cat
// fall in slow motion during heavy frames / theme transitions).
const PHYS_STEP = 1 / 120
let physAccum = 0

// ── Animation state ──────────────────────────────────────────────
let rafId = 0
let lastT = 0
let frameAcc = 0
let frameIdx = 0
let anim: AnimDef = ANIMS.idle
let animName: AnimName = 'idle'
const WALK_SPEED = 55 // px/s at speed=1
let idleTimer: ReturnType<typeof setTimeout> | null = null
let waveTimer: ReturnType<typeof setTimeout> | null = null
let jumpTimer: ReturnType<typeof setTimeout> | null = null
let reduced = false

// ── Drag bookkeeping ─────────────────────────────────────────────
let dragOffX = 0
let dragOffY = 0
let downAt = 0
let downX = 0
let downY = 0
let movedDuringPress = false

function drawFrame(index: number): void {
  const col = index % COLS
  const row = Math.floor(index / COLS)
  const s = petConfig.scale
  bgPos.value = `${-(col * FRAME_W * s)}px ${-(row * FRAME_H * s)}px`
}

function setAnim(name: AnimName): void {
  animName = name
  anim = ANIMS[name]
  frameAcc = 0
  frameIdx = 0
}

function startIdle(): void {
  setAnim('idle')
  scheduleNext()
}

function startWalk(direction: 'L' | 'R'): void {
  setAnim(`walk${direction}`)
}

function startWave(): void {
  if (!petConfig.animate || reduced) return
  if (waveTimer) clearTimeout(waveTimer)
  waving.value = true
  setAnim('wave')
  waveTimer = setTimeout(() => {
    waving.value = false
    if (animName === 'wave') startIdle()
  }, (ANIMS.wave.frames.length / ANIMS.wave.fps) * 1000 + 40)
}

function startJump(): void {
  if (!petConfig.animate || reduced) return
  if (jumpTimer) clearTimeout(jumpTimer)
  setAnim('jump')
  jumpTimer = setTimeout(() => {
    if (animName === 'jump') startIdle()
  }, (ANIMS.jump.frames.length / ANIMS.jump.fps) * 1000 + 40)
}

/** After an idle pause, randomly patrol / wave / jump. */
function scheduleNext(): void {
  if (!petConfig.animate || reduced) return
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    if (!grounded || dragging.value) return
    const r = Math.random()
    if (r < 0.55) startWalk(Math.random() < 0.5 ? 'L' : 'R')
    else if (r < 0.75) startWalk('L')
    else if (r < 0.9) startWave()
    else startJump()
  }, 2000 + Math.random() * 3500)
}

// ── Drag / gravity handlers ──────────────────────────────────────
function onPointerDown(e: PointerEvent): void {
  dragging.value = true
  grounded = false
  vy = 0
  movedDuringPress = false
  downAt = performance.now()
  downX = e.clientX
  downY = e.clientY
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  dragOffX = e.clientX - rect.left
  dragOffY = e.clientY - rect.top
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  if (idleTimer) clearTimeout(idleTimer)
  if (petConfig.animate && !reduced) setAnim('jump')
}

function onPointerMove(e: PointerEvent): void {
  if (!dragging.value) return
  if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) {
    movedDuringPress = true
  }
  x.value = Math.max(minX(), Math.min(window.innerWidth - catW.value - 6, e.clientX - dragOffX))
  y.value = Math.max(0, Math.min(window.innerHeight - 4, e.clientY - dragOffY))
}

function onPointerUp(): void {
  if (!dragging.value) return
  dragging.value = false

  const wasClick = !movedDuringPress && performance.now() - downAt < 400
  if (wasClick) {
    // Just a tap — wave. Stay wherever the tap happened (grounded check).
    if (y.value >= floorY() - 2) {
      y.value = floorY()
      grounded = true
    }
    startWave()
    return
  }

  // Released above the floor — gravity pulls it back down.
  if (y.value >= floorY() - 2) {
    y.value = floorY()
    grounded = true
    if (petConfig.animate && !reduced) startIdle()
  } else {
    grounded = false
  }
}

/** One fixed physics step — gravity + walking, integrated at 120Hz. */
function stepPhysics(h: number): void {
  // ── Gravity — only when it isn't being held ─────────────────
  if (!dragging.value && !grounded) {
    vy += GRAVITY * h
    y.value += vy * h
    const floor = floorY()
    if (y.value >= floor) {
      y.value = floor
      if (Math.abs(vy) > 160) {
        vy = -vy * BOUNCE // bounce
      } else {
        vy = 0
        grounded = true
        if (petConfig.animate && !reduced) startIdle()
      }
    }
  }

  // ── Walking on the floor — bounce off the content-area edges ──
  if (!dragging.value && grounded && (animName === 'walkL' || animName === 'walkR')) {
    const dir = animName === 'walkL' ? -1 : 1
    x.value += dir * WALK_SPEED * petConfig.speed * h
    if (x.value <= minX()) {
      x.value = minX()
      startWalk('R')
    } else if (x.value >= window.innerWidth - catW.value - 8) {
      x.value = window.innerWidth - catW.value - 8
      startWalk('L')
    }
  }
}

function tick(t: number): void {
  const dt = Math.min(0.25, (t - lastT) / 1000)
  lastT = t

  // Run the physics on a fixed cadence so the fall/landing is identical
  // regardless of how many frames actually render per second.
  physAccum += dt
  while (physAccum >= PHYS_STEP) {
    stepPhysics(PHYS_STEP)
    physAccum -= PHYS_STEP
  }

  // ── Frame stepping (real time) ──────────────────────────────
  frameAcc += dt
  const step = 1 / anim.fps
  while (frameAcc >= step) {
    frameAcc -= step
    frameIdx++
    if (frameIdx >= anim.frames.length) {
      frameIdx = anim.once ? anim.frames.length - 1 : 0
    }
  }
  drawFrame(anim.frames[Math.min(frameIdx, anim.frames.length - 1)])
  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Park at the bottom-right corner.
  x.value = window.innerWidth - catW.value - 14
  y.value = floorY()
  if (reduced) {
    drawFrame(0)
    return
  }
  setAnim('idle')
  scheduleNext()
  lastT = performance.now()
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (idleTimer) clearTimeout(idleTimer)
  if (waveTimer) clearTimeout(waveTimer)
  if (jumpTimer) clearTimeout(jumpTimer)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div v-if="petConfig.enabled" class="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
    <button
      type="button"
      class="salary-cat group pointer-events-auto absolute left-0 top-0 block cursor-grab touch-none select-none border-0 bg-transparent p-0"
      :class="dragging ? 'cursor-grabbing' : ''"
      :style="{
        transform: `translate(${x}px, ${y}px)`,
        width: `${catW}px`,
        height: `${catH}px`,
        backgroundImage: 'url(/pets/salary-cat.webp)',
        backgroundSize: `${FRAME_W * COLS * petConfig.scale}px ${FRAME_H * 9 * petConfig.scale}px`,
        backgroundPosition: bgPos,
        backgroundRepeat: 'no-repeat',
      }"
      :aria-label="'Salary Cat — drag it around, click to wave'"
      :title="'SalaryCat 月薪喵 — drag me!'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <!-- hover label (also shows while waving) -->
      <span
        class="absolute -top-7 right-0 whitespace-nowrap rounded-full border border-gray-200 bg-white px-2 py-0.5 font-mono text-[10px] text-gray-500 shadow-sm transition-opacity"
        :class="waving ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
        :aria-hidden="true"
      >
        // salary cat
      </span>
    </button>
  </div>
</template>

<style scoped>
.salary-cat {
  filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.18));
}
.salary-cat:hover {
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.25));
}
</style>
