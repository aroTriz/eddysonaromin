<script setup lang="ts">
/**
 * SalaryCat — a kawaii "salary cat" desktop pet for the site (from the
 * OpenPets gallery: https://openpets.dev · pet: SalaryCat 月薪喵).
 *
 * Behavior:
 *  - When spawned (page load or "toggle pet"), the cat DROPS from the
 *    top-center with a smooth rAF gravity curve.
 *  - DRAGGABLE — grab and throw; falls back with physics on release.
 *  - Click (without dragging) makes it wave.
 *  - "Buy Me a Coffee" speech bubble floats above the cat — clicking the
 *    bubble opens a QR code modal for tips/donations.
 *  - Reads shared pet config (enabled / scale / speed / animate) from
 *    usePetConfig, so the navbar toggle and /aromin/pet control it.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { petConfig } from '@/composables/usePetConfig'

const FRAME_W = 192
const FRAME_H = 208
const COLS = 8

type AnimName = 'idle' | 'walkL' | 'walkR' | 'wave' | 'jump'
interface AnimDef { frames: number[]; fps: number; once?: boolean }

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
const minX = () => (window.innerWidth >= 1024 ? 232 : 8)

const x = ref(0)
const y = ref(0)
const bgPos = ref('0px 0px')
const dragging = ref(false)
const waving = ref(false)

// ── Buy Me a Coffee ──────────────────────────────────────────────
const BUBBLE_GAP = 10   // px between bubble bottom and cat top
const BUBBLE_W = 160
const coffeeOpen = ref(false)
const bubbleVisible = ref(false)
let bubbleTimer: ReturnType<typeof setTimeout> | null = null

/** Center the bubble horizontally on the cat, clamp to viewport. */
const bubbleX = computed(() => {
  const cx = x.value + catW.value / 2 - BUBBLE_W / 2
  return Math.max(8, Math.min(window.innerWidth - BUBBLE_W - 8, cx))
})
/** Position the bubble's bottom edge BUBBLE_GAP px above the cat's top. */
const bubbleY = computed(() => {
  const top = y.value - 52 - BUBBLE_GAP // 52 ≈ bubble height
  return Math.max(8, top)
})

function openCoffee(): void {
  coffeeOpen.value = true
}
function closeCoffee(): void {
  coffeeOpen.value = false
}

// ── Physics / animation ──────────────────────────────────────────
let vy = 0
let grounded = true
const GRAVITY = 5000
const BOUNCE = 0.35
const PHYS_STEP = 1 / 240
let physAccum = 0

let physTimer: ReturnType<typeof setInterval> | null = null
let lastT = 0
let frameAcc = 0
let frameIdx = 0
let anim: AnimDef = ANIMS.idle
let animName: AnimName = 'idle'
const WALK_SPEED = 55
let idleTimer: ReturnType<typeof setTimeout> | null = null
let waveTimer: ReturnType<typeof setTimeout> | null = null
let jumpTimer: ReturnType<typeof setTimeout> | null = null
let reduced = false

let dragOffX = 0, dragOffY = 0, downAt = 0, downX = 0, downY = 0, movedDuringPress = false

function drawFrame(i: number): void {
  bgPos.value = `${-((i % COLS) * FRAME_W * petConfig.scale)}px ${-(Math.floor(i / COLS) * FRAME_H * petConfig.scale)}px`
}
function setAnim(name: AnimName): void { animName = name; anim = ANIMS[name]; frameAcc = 0; frameIdx = 0 }
function startIdle(): void { setAnim('idle'); scheduleNext() }
function startWalk(d: 'L' | 'R'): void { setAnim(`walk${d}`) }
function startWave(): void {
  if (!petConfig.animate || reduced) return
  if (waveTimer) clearTimeout(waveTimer)
  waving.value = true; setAnim('wave')
  waveTimer = setTimeout(() => { waving.value = false; if (animName === 'wave') startIdle() }, (ANIMS.wave.frames.length / ANIMS.wave.fps) * 1000 + 40)
}
function startJump(): void {
  if (!petConfig.animate || reduced) return
  if (jumpTimer) clearTimeout(jumpTimer)
  setAnim('jump')
  jumpTimer = setTimeout(() => { if (animName === 'jump') startIdle() }, (ANIMS.jump.frames.length / ANIMS.jump.fps) * 1000 + 40)
}
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

function stepPhysics(h: number): void {
  if (!dragging.value && !grounded) {
    vy += GRAVITY * h; y.value += vy * h
    if (y.value >= floorY()) {
      y.value = floorY()
      if (Math.abs(vy) > 160) vy = -vy * BOUNCE
      else { vy = 0; grounded = true; if (petConfig.animate && !reduced) startIdle() }
    }
  }
  if (!dragging.value && grounded && (animName === 'walkL' || animName === 'walkR')) {
    const dir = animName === 'walkL' ? -1 : 1
    x.value += dir * WALK_SPEED * petConfig.speed * h
    if (x.value <= minX()) { x.value = minX(); startWalk('R') }
    else if (x.value >= window.innerWidth - catW.value - 8) { x.value = window.innerWidth - catW.value - 8; startWalk('L') }
  }
}

function loop(): void {
  const now = performance.now()
  const dt = Math.min(0.15, Math.max(0, (now - lastT) / 1000))
  lastT = now
  physAccum += dt
  while (physAccum >= PHYS_STEP) { stepPhysics(PHYS_STEP); physAccum -= PHYS_STEP }
  frameAcc += dt
  const step = 1 / anim.fps
  while (frameAcc >= step) { frameAcc -= step; frameIdx++; if (frameIdx >= anim.frames.length) frameIdx = anim.once ? anim.frames.length - 1 : 0 }
  drawFrame(anim.frames[Math.min(frameIdx, anim.frames.length - 1)])
}

function onPointerDown(e: PointerEvent): void {
  dragging.value = true; grounded = false; vy = 0
  movedDuringPress = false; downAt = performance.now(); downX = e.clientX; downY = e.clientY
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  dragOffX = e.clientX - rect.left; dragOffY = e.clientY - rect.top
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  if (idleTimer) clearTimeout(idleTimer)
  if (petConfig.animate && !reduced) setAnim('jump')
}
function onPointerMove(e: PointerEvent): void {
  if (!dragging.value) return
  if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) movedDuringPress = true
  x.value = Math.max(minX(), Math.min(window.innerWidth - catW.value - 6, e.clientX - dragOffX))
  y.value = Math.max(0, Math.min(window.innerHeight - 4, e.clientY - dragOffY))
}
function onPointerUp(): void {
  if (!dragging.value) return; dragging.value = false
  if (!movedDuringPress && performance.now() - downAt < 400) {
    if (y.value >= floorY() - 2) { y.value = floorY(); grounded = true }; startWave(); return
  }
  if (y.value >= floorY() - 2) { y.value = floorY(); grounded = true; if (petConfig.animate && !reduced) startIdle() }
  else grounded = false
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  x.value = window.innerWidth / 2 - catW.value / 2

  if (reduced) {
    y.value = floorY(); grounded = true; drawFrame(0)
  } else {
    y.value = -catH.value
    grounded = false
    vy = 0
    setAnim('jump')
  }
  scheduleNext(); lastT = performance.now(); physAccum = 0; physTimer = requestAnimationFrame(function rafLoop() { loop(); physTimer = requestAnimationFrame(rafLoop) })

  // Show the "Buy Me a Coffee" bubble after the cat lands (2.5 s after spawn)
  bubbleTimer = setTimeout(() => { bubbleVisible.value = true }, 2500)
})
onBeforeUnmount(() => {
  if (physTimer) cancelAnimationFrame(physTimer)
  if (idleTimer) clearTimeout(idleTimer)
  if (waveTimer) clearTimeout(waveTimer)
  if (jumpTimer) clearTimeout(jumpTimer)
  if (bubbleTimer) clearTimeout(bubbleTimer)
})
</script>

<template>
  <div v-if="petConfig.enabled" class="pointer-events-none fixed inset-0 z-[70]">
    <!-- ── "Buy Me a Coffee" speech bubble ──────────────────── -->
    <button
      v-if="bubbleVisible && !coffeeOpen"
      type="button"
      class="coffee-bubble pointer-events-auto coffee-bubble-enter absolute z-[71]"
      :style="{ left: `${bubbleX}px`, top: `${bubbleY}px`, width: `${BUBBLE_W}px` }"
      @click.stop="openCoffee"
    >
      <span class="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-[11.5px] font-medium text-ink shadow-md transition-all hover:shadow-lg hover:border-gray-300">
        <span class="text-[14px]" aria-hidden="true">☕</span>
        Buy Me a Coffee
      </span>
      <!-- Tail / triangle pointing down -->
      <span class="coffee-tail absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full" />
    </button>

    <!-- ── SalaryCat sprite ──────────────────────────────── -->
    <button
      type="button"
      class="salary-cat group pointer-events-auto absolute left-0 top-0 block cursor-grab touch-none select-none border-0 bg-transparent p-0"
      :class="dragging ? 'cursor-grabbing' : ''"
      :style="{
        transform: `translate(${x}px, ${y}px)`,
        width: `${catW}px`, height: `${catH}px`,
        backgroundImage: 'url(/pets/salary-cat.webp)',
        backgroundSize: `${FRAME_W * COLS * petConfig.scale}px ${FRAME_H * 9 * petConfig.scale}px`,
        backgroundPosition: bgPos, backgroundRepeat: 'no-repeat',
      }"
      :aria-label="'Salary Cat — drag it around, click to wave'"
      :title="'SalaryCat 月薪喵 — drag me!'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <span
        class="absolute -top-7 right-0 whitespace-nowrap rounded-full border border-gray-200 bg-white px-2 py-0.5 font-mono text-[10px] text-gray-500 shadow-sm transition-opacity"
        :class="waving ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
        :aria-hidden="true"
      >// salary cat</span>
    </button>
  </div>

  <!-- ── QR Code modal (teleported to body) ─────────────────── -->
  <Teleport to="body">
    <div
      v-if="coffeeOpen"
      class="fixed inset-0 z-[200] flex items-center justify-center p-6 coffee-bubble-enter"
      role="dialog"
      aria-modal="true"
      aria-label="Buy Me a Coffee"
    >
      <!-- Frosted backdrop -->
      <div
        class="absolute inset-0 bg-gray-500/20 backdrop-blur-md"
        aria-hidden="true"
        @click="closeCoffee"
      />
      <!-- Card -->
      <div class="relative z-10 w-full max-w-xs overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div class="flex items-center gap-2">
            <span class="text-[16px]" aria-hidden="true">☕</span>
            <span class="font-mono text-[13px] font-semibold text-ink">Buy Me a Coffee</span>
          </div>
          <button
            type="button"
            class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
            aria-label="Close"
            @click="closeCoffee"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <!-- QR -->
        <div class="flex flex-col items-center gap-3 px-5 py-5">
          <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <img
              src="https://aromin-resume.pages.dev/images/qr-tip.jpg"
              alt="Buy me a Coffee QR — GCash, PayMaya, or Bank Transfer"
              class="block h-44 w-44 rounded-md object-contain"
              loading="lazy"
            />
          </div>
          <p class="text-center font-mono text-[11px] leading-relaxed text-gray-500">
            scan the qr to send a tip<br />
            <span class="text-gray-400">GCash · PayMaya · Bank Transfer</span>
          </p>
          <!-- Fallback link -->
          <a
            href="https://www.buymeacoffee.com/eddysonaromin"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFDD00] px-4 py-2.5 font-mono text-[12px] font-semibold text-[#000000] transition-opacity hover:opacity-80"
          >
            <span class="text-[14px]">☕</span>
            buymeacoffee.com/eddysonaromin
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.salary-cat { filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.18)); }
.salary-cat:hover { filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.25)); }

/* Speech bubble entrance animation */
.coffee-bubble-enter {
  animation: bubble-pop-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes bubble-pop-in {
  from { opacity: 0; transform: translateY(6px) scale(0.92); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Speech-bubble tail — a tiny CSS triangle pointing down */
.coffee-tail {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgb(var(--g200, 233 233 233));
}
/* Inner white triangle (covers the grey border, leaves only the tail) */
.coffee-tail::after {
  content: '';
  position: absolute;
  top: -7px;
  left: -5px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid white;
}
html.dark .coffee-tail::after {
  border-top-color: rgb(var(--bg, 10 10 10));
}
</style>
