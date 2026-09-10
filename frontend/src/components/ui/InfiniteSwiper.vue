<script setup lang="ts">
/**
 * InfiniteSwiper — generic infinite loop carousel.
 * - Stays on ONE line no matter how many items (no wrapping).
 * - If items.length <= visibleCount, renders a simple flex row with overflow (no loop).
 * - If items.length > visibleCount, creates 3 copies of the deck and slides infinitely
 *   by teleporting back to the middle copy without animation (same technique as ServicesView ring).
 * - Supports: arrows, touch/pointer drag, mouse drag, keyboard, snap without jump.
 * - Card width is measured from the first rendered card (offsetWidth + gap) so it
 *   respects responsive CSS (mobile 78%/85% vs desktop 1/3).
 */
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    items: unknown[]
    /** gap in px between cards (must match the flex gap class) */
    gap?: number
    /** show arrow buttons */
    arrows?: boolean
  }>(),
  {
    gap: 12,
    arrows: true,
  },
)

const N = computed(() => props.items.length)
const needsLoop = computed(() => N.value > 3)

/** 3 copies for seamless loop, 1 copy when no loop needed */
const deck = computed(() => (needsLoop.value ? [...props.items, ...props.items, ...props.items] : props.items))

const container = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const current = ref(0)
const animating = ref(true)
const cardStep = ref(0) // cardWidth + gap
const cardWidth = ref(0)
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

function getCardWidth(): number {
  const cw = container.value?.offsetWidth ?? 0
  if (!cw) return 0
  // mobile: 92% peek — shows ~16px peek of next card so gap + side margins look balanced
  // desktop stays exact 3-up. 0.92 on 343px => 315px card + 12 gap + 16 outer = balanced rhythm
  if (windowWidth.value < 640) return Math.floor(cw * 0.92)
  // desktop: 3 cards whole, gap*2 subtracted — exact fit, no half
  return Math.floor((cw - props.gap * 2) / 3)
}

function measureStep(): void {
  const w = getCardWidth()
  if (!w) return
  cardWidth.value = w
  cardStep.value = w + props.gap
}

const offset = computed(() => {
  if (!needsLoop.value) return 0
  const base = -current.value * cardStep.value
  // mobile peek is centered — add half the leftover so left/right breathing is equal (balanced vs outer px-4)
  if (windowWidth.value < 640 && cardWidth.value && container.value) {
    const cw = container.value.offsetWidth
    const pad = Math.floor((cw - cardWidth.value) / 2)
    // shift track right by pad so first card sits with equal side margins, not flush-left
    return base + pad
  }
  return base
})

// initialise to middle copy
watch(
  N,
  async (n) => {
    if (n > 3) {
      current.value = n
    } else {
      current.value = 0
    }
    await nextTick()
    measureStep()
  },
  { immediate: true },
)

let snapTimer: ReturnType<typeof setTimeout> | undefined
let snapPending = false

function doSnap(): void {
  if (!snapPending) return
  snapPending = false
  animating.value = false
  if (current.value >= 2 * N.value) current.value -= N.value
  else if (current.value < N.value) current.value += N.value
  if (track.value) void track.value.offsetWidth
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animating.value = true
    })
  })
}

function scheduleSnap(): void {
  if (snapPending) return
  snapPending = true
  clearTimeout(snapTimer)
  snapTimer = setTimeout(doSnap, 600)
}

function slide(dir: 1 | -1): void {
  if (!needsLoop.value) {
    // simple bounded scroll when <=3: just translate via scrollLeft
    const el = container.value
    if (!el) return
    const delta = dir * (cardStep.value || 280)
    el.scrollBy({ left: delta, behavior: 'smooth' })
    return
  }
  current.value += dir
  if (current.value >= 2 * N.value || current.value < N.value) {
    scheduleSnap()
  }
}

function onTrackTransitionEnd(e: TransitionEvent): void {
  if (e.propertyName !== 'transform') return
  if (current.value >= 2 * N.value || current.value < N.value) {
    requestAnimationFrame(() => requestAnimationFrame(doSnap))
  }
}

// — drag / swipe (pointer) —
let startX = 0
let dragging = false
let dragDelta = 0

function onPointerDown(e: PointerEvent): void {
  if (!needsLoop.value) return
  startX = e.clientX
  dragging = true
  dragDelta = 0
  animating.value = false
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!dragging) return
  dragDelta = e.clientX - startX
  if (track.value) {
    const pad = windowWidth.value < 640 && cardWidth.value && container.value ? Math.floor((container.value.offsetWidth - cardWidth.value) / 2) : 0
    const base = -current.value * cardStep.value + pad
    track.value.style.transform = `translateX(${base + dragDelta}px)`
  }
}

function onPointerUp(e: PointerEvent): void {
  if (!dragging) return
  dragging = false
  animating.value = true
  if (track.value) track.value.style.transform = ''
  const threshold = Math.max(40, cardStep.value * 0.15)
  if (Math.abs(dragDelta) > threshold) {
    slide(dragDelta < 0 ? 1 : -1)
  } else {
    // snap back
    if (track.value) void track.value.offsetWidth
  }
  dragDelta = 0
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {}
}

// Touch fallback for older browsers
let touchStartX = 0
function onTouchStart(e: TouchEvent): void {
  if (!needsLoop.value) return
  touchStartX = e.changedTouches[0].clientX
  dragging = true
  dragDelta = 0
  animating.value = false
}
function onTouchMove(e: TouchEvent): void {
  if (!dragging) return
  dragDelta = e.changedTouches[0].clientX - touchStartX
  if (track.value) {
    const pad = windowWidth.value < 640 && cardWidth.value && container.value ? Math.floor((container.value.offsetWidth - cardWidth.value) / 2) : 0
    const base = -current.value * cardStep.value + pad
    track.value.style.transform = `translateX(${base + dragDelta}px)`
  }
}
function onTouchEnd(): void {
  if (!dragging) return
  dragging = false
  animating.value = true
  if (track.value) track.value.style.transform = ''
  const threshold = Math.max(40, cardStep.value * 0.15)
  if (Math.abs(dragDelta) > threshold) slide(dragDelta < 0 ? 1 : -1)
  dragDelta = 0
}

function onResize(): void {
  windowWidth.value = window.innerWidth
  measureStep()
  // keep loop aligned after resize without animation
  if (needsLoop.value && (current.value >= 2 * N.value || current.value < N.value)) {
    animating.value = false
    if (current.value >= 2 * N.value) current.value -= N.value
    else if (current.value < N.value) current.value += N.value
    requestAnimationFrame(() => (animating.value = true))
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  windowWidth.value = window.innerWidth
  await nextTick()
  measureStep()
  window.addEventListener('resize', onResize)
  track.value?.addEventListener('transitionend', onTrackTransitionEnd)
  if (container.value) {
    resizeObserver = new ResizeObserver(() => measureStep())
    resizeObserver.observe(container.value)
    if (track.value) resizeObserver.observe(track.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(snapTimer)
  track.value?.removeEventListener('transitionend', onTrackTransitionEnd)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="relative">
    <!-- desktop arrows - outside the viewport so cards consume full width -->
    <button
      v-if="arrows && (needsLoop || items.length > 3)"
      type="button"
      aria-label="Previous"
      class="hidden sm:inline-flex absolute -left-12 top-1/2 -translate-y-1/2 z-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-gray-400 transition-colors hover:text-ink active:scale-95"
      @click="slide(-1)"
    >
      <ArrowLeft class="h-5 w-5" :stroke-width="1.8" />
    </button>
    <button
      v-if="arrows && (needsLoop || items.length > 3)"
      type="button"
      aria-label="Next"
      class="hidden sm:inline-flex absolute -right-12 top-1/2 -translate-y-1/2 z-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-gray-400 transition-colors hover:text-ink active:scale-95"
      @click="slide(1)"
    >
      <ArrowRight class="h-5 w-5" :stroke-width="1.8" />
    </button>

    <!-- viewport - py-2/-my-2 lets card shadows show while still clipping X; now full width -->
    <div
      ref="container"
      class="overflow-hidden py-2 -my-2"
        :class="{ 'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden': !needsLoop }"
      >
        <!-- track — transforms when looping, scrolls naturally when not -->
        <div
          ref="track"
          class="flex items-stretch py-1"
          :class="[
            animating && needsLoop ? 'transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]' : '',
            needsLoop ? 'will-change-transform' : '',
          ]"
          :style="needsLoop ? { transform: `translateX(${offset}px)`, gap: `${gap}px` } : { gap: `${gap}px` }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend.passive="onTouchEnd"
        >
          <div
            v-for="(item, i) in deck"
            :key="i"
            class="shrink-0 select-none"
            :style="{ width: cardWidth ? `${cardWidth}px` : undefined, touchAction: 'pan-y' }"
          >
            <slot :item="item" :index="i % N" />
          </div>
        </div>
      </div>
    <!-- mobile arrows — SYMMETRIC: line - arrow - line - swipe - line - arrow - line (center = swipe) -->
    <div v-if="needsLoop || items.length > 3" class="mt-3 flex items-center justify-center gap-3 sm:hidden">
      <button
        v-if="arrows"
        type="button"
        aria-label="Previous"
        class="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md p-2 text-gray-400 transition-colors hover:text-ink active:scale-95"
        @click="slide(-1)"
      >
        <ArrowLeft class="h-4 w-4" :stroke-width="1.8" />
      </button>
      <span class="h-px w-6 shrink-0 bg-gray-200"></span>
      <span class="font-mono text-[10px] tracking-wider text-gray-400">swipe</span>
      <span class="h-px w-6 shrink-0 bg-gray-200"></span>
      <button
        v-if="arrows"
        type="button"
        aria-label="Next"
        class="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md p-2 text-gray-400 transition-colors hover:text-ink active:scale-95"
        @click="slide(1)"
      >
        <ArrowRight class="h-4 w-4" :stroke-width="1.8" />
      </button>
    </div>
  </div>
</template>
