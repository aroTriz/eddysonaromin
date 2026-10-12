<script setup lang="ts">
/**
 * CertificationDeck — services-style infinite ring for home certifications.
 * Window shows the centered card clear with blurred neighbors peeking on
 * both sides; arrows rotate the ring forever in one direction (no
 * back-to-start jump). Same 3-copy + snap technique as ServicesView.
 */
import { ArrowLeft, ArrowRight, GraduationCap } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface DeckCertification {
  slug: string
  title: string
  issuer: string
  year: string
}

const props = defineProps<{
  items: DeckCertification[]
}>()

const CARD_WIDTH_DESKTOP = 300
const GAP = 20
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

const N = computed(() => props.items.length)
/**
 * 5 copies so the window can never reach past either edge: with only
 * 3 copies, rapid clicks slipped past the outer copy before the snap
 * fired and flashed empty space (the "not infinite" gap).
 */
const COPIES = 5
const deck = computed(() => Array.from({ length: COPIES }, () => props.items).flat())

/** Slot (index into `deck`) of the centered card. Starts on the middle copy. */
const current = ref(0)
const animating = ref(true)
const container = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)

watch(
  N,
  (n) => {
    current.value = 2 * n
  },
  { immediate: true },
)

function getCardWidth(): number {
  const cw = container.value?.offsetWidth
  if (windowWidth.value < 640) return Math.max(220, Math.min(300, (cw ?? 320) - 120))
  return CARD_WIDTH_DESKTOP
}

const STEP = computed(() => getCardWidth() + GAP)

/** Translate so the centered card sits in the middle of the visible window. */
const offset = computed(() => {
  const cw = getCardWidth()
  const w = container.value?.offsetWidth ?? cw
  return (w - cw) / 2 - current.value * STEP.value
})

/** Content of a given deck slot (slots stay in range via the ring snap). */
function at(slot: number): DeckCertification {
  return deck.value[slot]
}

/** Distance of a slot from the centered one (0 = center). */
function distance(slot: number): number {
  return Math.abs(slot - current.value)
}

let snapTimer: ReturnType<typeof setTimeout> | undefined
let snapPending = false

/**
 * True infinite ring: the deck repeats every N slots, so shifting the track by
 * exactly one full ring (N * STEP) lands on identical pixels. The shift must
 * happen with the transition OFF, only after the previous slide fully
 * finished (transitionend), and be followed by a forced reflow + double rAF
 * so the browser paints the new position before the transition is re-enabled.
 */
function doSnap(): void {
  if (!snapPending || N.value === 0) return
  snapPending = false
  animating.value = false
  // Fold back into the middle copy (identical pixels, any distance).
  current.value = ((current.value % N.value) + N.value) % N.value + 2 * N.value
  // Force a reflow so the transform applies without any transition, then
  // re-enable the transition on the next painted frame.
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
  // Fallback in case transitionend never fires (reduced motion etc.)
  snapTimer = setTimeout(doSnap, 600)
}

function slide(dir: 1 | -1): void {
  if (N.value === 0) return
  current.value += dir
  // Left the middle copy → wait for the slide's transitionend,
  // then fold back. The ring rotates forever with no jump.
  if (N.value > 0 && (current.value < 2 * N.value || current.value >= 3 * N.value)) {
    scheduleSnap()
  }
}

/** Snap only once the slide's transform transition actually completed. */
function onTrackTransitionEnd(e: TransitionEvent): void {
  if (e.propertyName !== 'transform') return
  if (current.value < 2 * N.value || current.value >= 3 * N.value) {
    scheduleSnap()
    // Defer the actual shift to the next frame so the transition end state
    // is fully committed before we strip the transition class.
    requestAnimationFrame(() => requestAnimationFrame(doSnap))
  }
}

/** Re-center after resize (keeps the ring in sync with the new width). */
let resizeTimer: ReturnType<typeof setTimeout> | undefined
function onResize(): void {
  windowWidth.value = window.innerWidth
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    // Fold back into the middle copy without animating (position is identical
    // modulo one full ring, so it's invisible).
    if (N.value > 0 && (current.value < 2 * N.value || current.value >= 3 * N.value)) {
      animating.value = false
      current.value = ((current.value % N.value) + N.value) % N.value + 2 * N.value
      requestAnimationFrame(() => {
        animating.value = true
      })
    }
  }, 100)
}

onMounted(() => {
  windowWidth.value = window.innerWidth
  window.addEventListener('resize', onResize)
  track.value?.addEventListener('transitionend', onTrackTransitionEnd)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(snapTimer)
  clearTimeout(resizeTimer)
  track.value?.removeEventListener('transitionend', onTrackTransitionEnd)
})
</script>

<template>
  <div v-if="N > 0" class="relative mx-auto flex w-full items-center gap-3 sm:gap-4">
    <!-- prev arrow — 44px touch target -->
    <button
      type="button"
      aria-label="Previous certification"
      class="z-20 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md p-2 text-gray-400 transition-colors hover:text-ink"
      @click="slide(-1)"
    >
      <ArrowLeft class="h-5 w-5" :stroke-width="1.8" />
    </button>

    <!-- carousel window -->
    <div ref="container" class="relative min-w-0 flex-1 overflow-hidden">
      <!-- track -->
      <div
        ref="track"
        class="flex"
        :class="animating ? 'transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]' : ''"
        :style="{ transform: `translateX(${offset}px)` }"
      >
        <div
          v-for="(_cert, i) in deck"
          :key="`${at(i).slug}-${i}`"
          class="shrink-0 select-none"
          :class="distance(i) === 0 ? 'z-10 opacity-100 blur-0' : 'opacity-50 blur-[3px]'"
          :style="{ width: `${getCardWidth()}px`, marginRight: `${GAP}px` }"
        >
          <RouterLink
            :to="`/certifications/${at(i).slug}`"
            class="group relative flex h-full min-h-[156px] w-full flex-col items-center rounded-md bg-gradient-to-b from-gray-50 to-white px-4 py-5 text-center shadow-[0_8px_22px_-14px_rgba(10,10,10,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(10,10,10,0.4)]"
          >
            <span aria-hidden="true" class="pointer-events-none absolute inset-[5px] rounded-md border border-gray-200/70"></span>
            <div class="relative flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white">
              <GraduationCap class="h-5 w-5 text-gray-500" :stroke-width="1.6" />
            </div>
            <h3 class="relative mt-3 w-full truncate text-center text-[13px] font-semibold leading-snug text-ink" :title="at(i).title">{{ at(i).title }}</h3>
            <p class="relative mt-1 w-full truncate text-center font-mono text-[9.5px] uppercase tracking-wider text-gray-400" :title="at(i).issuer">{{ at(i).issuer }}</p>
            <div class="relative mt-3 flex items-center gap-1.5 text-gray-300 group-hover:text-ink">
              <span class="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400 group-hover:text-ink">
                {{ at(i).year }}
              </span>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- next arrow — 44px touch target -->
    <button
      type="button"
      aria-label="Next certification"
      class="z-20 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md p-2 text-gray-400 transition-colors hover:text-ink"
      @click="slide(1)"
    >
      <ArrowRight class="h-5 w-5" :stroke-width="1.8" />
    </button>
  </div>
</template>
