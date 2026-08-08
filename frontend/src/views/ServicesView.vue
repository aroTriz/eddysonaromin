<script setup lang="ts">
/**
 * Services — bryllim consulting-exact cards in an infinite ring carousel.
 * Window shows 3 cards: left + right neighbors peek at half width and are
 * blurred (opacity 0.5 + blur), the center card is full width and clear.
 * Arrows rotate the ring forever in one direction (no back-to-start jump).
 */
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Code2,
  Database,
  MonitorSmartphone,
  Palette,
  Search,
  X,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/** Service detail modal — opens on card click with a blurred backdrop. */
const activeService = ref<(typeof services)[number] | null>(null)
const modalOpen = ref(false)

function openService(service: (typeof services)[number]): void {
  activeService.value = service
  modalOpen.value = true
  document.documentElement.style.overflow = 'hidden'
}

function closeService(): void {
  modalOpen.value = false
  document.documentElement.style.overflow = ''
  // Clear after the closing transition so content doesn't swap mid-fade.
  setTimeout(() => {
    activeService.value = null
  }, 250)
}

function onModalKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeService()
}

const CARD_WIDTH = 340
const GAP = 20

const services = [
  {
    icon: MonitorSmartphone,
    title: 'Web Development',
    price: 'Custom',
    desc: 'Responsive, modern websites and web apps built with Vue, Ionic, Laravel, and Tailwind.',
    points: ['Pixel-perfect UIs', 'Mobile-first', 'Fast & accessible'],
    details:
      'From marketing sites to full web applications, I build responsive, modern experiences that load fast and work everywhere. Using Vue, Ionic, Laravel, and Tailwind, I deliver clean, maintainable code that matches your design exactly — and scales when your product grows.',
  },
  {
    icon: Code2,
    title: 'Front-End Engineering',
    price: 'Custom',
    desc: 'Pixel-perfect interfaces that match designs exactly — from design tokens to components.',
    points: ['Design systems', 'Component architecture', 'Performance tuning'],
    details:
      'I turn Figma designs into production interfaces with pixel-perfect fidelity. This means building design tokens, reusable component systems, and tuning performance so every page feels instant. The result: a UI that looks exactly like the mockup and stays consistent as it grows.',
  },
  {
    icon: Database,
    title: 'Backend & APIs',
    price: 'Custom',
    desc: 'Clean REST APIs with Laravel and solid database design with MySQL / SQLite.',
    points: ['REST API design', 'Database modeling', 'Auth & validation'],
    details:
      'A strong product needs a strong foundation. I design and build clean REST APIs with Laravel, model databases with MySQL or SQLite, and wire up authentication and validation so your data is secure and your endpoints are predictable for any frontend to consume.',
  },
  {
    icon: Search,
    title: 'Quality Assurance',
    price: 'Custom',
    desc: 'Test cases, bug tracking, regression testing, and documentation review.',
    points: ['Test case authoring', 'Bug & regression tracking', 'Release readiness'],
    details:
      'Having worked as a QA Analyst intern, I know quality is a discipline, not an afterthought. I author thorough test cases, track bugs and regressions, and review documentation so your release is safe. Catching issues early saves hours — and protects user trust.',
  },
  {
    icon: Palette,
    title: 'UI/UX & Design',
    price: 'Custom',
    desc: 'Figma wireframes, prototyping, and design systems that scale with your product.',
    points: ['Wireframes & mockups', 'Prototyping', 'Design tokens'],
    details:
      'Before a single line of code, good products start with good design. I create Figma wireframes, clickable prototypes, and design systems — spacing, type, color tokens — that keep the product cohesive and make implementation straightforward for any developer.',
  },
  {
    icon: Bot,
    title: 'AI & Automation',
    price: 'Custom',
    desc: 'AI research and automation to ship smarter products and cut manual work.',
    points: ['AI workflows', 'Automation', 'Integration'],
    details:
      'I research and integrate AI into real products — from assistant features and automation pipelines to workflows that cut repetitive manual work. If you have a process that feels like it should run itself, it probably can. Let me build the bridge.',
  },
]

const N = services.length
const STEP = CARD_WIDTH + GAP

/** 3 copies of the deck so the ring never shows a gap. */
const deck = [...services, ...services, ...services]

/** Slot (index into `deck`) of the centered card. Starts on the middle copy. */
const current = ref(N)
const animating = ref(true)
const container = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)

/** Translate so the centered card sits in the middle of the visible window. */
const offset = computed(() => {
  const w = container.value?.offsetWidth ?? CARD_WIDTH
  return (w - CARD_WIDTH) / 2 - current.value * STEP
})

/** Content of a given deck slot, wrapped mod N. */
function at(slot: number) {
  return deck[slot]
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
  if (!snapPending) return
  snapPending = false
  animating.value = false
  current.value += current.value >= 2 * N ? -N : N
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
  current.value += dir
  // Crossed into the 3rd (or 1st) copy → wait for the slide's transitionend,
  // then shift back one ring. The ring rotates 1,2,3,1,2,3… with no jump.
  if (current.value >= 2 * N || current.value < N) {
    scheduleSnap()
  }
}

/** Snap only once the slide's transform transition actually completed. */
function onTrackTransitionEnd(e: TransitionEvent): void {
  if (e.propertyName !== 'transform') return
  if (current.value >= 2 * N || current.value < N) {
    scheduleSnap()
    // Defer the actual shift to the next frame so the transition end state
    // is fully committed before we strip the transition class.
    requestAnimationFrame(() => requestAnimationFrame(doSnap))
  }
}

/** Re-center after resize (keeps the ring in sync with the new width). */
let resizeTimer: ReturnType<typeof setTimeout> | undefined
function onResize(): void {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    // Snap back into the middle copy without animating (position is identical
    // modulo one full ring, so it's invisible).
    if (current.value >= 2 * N || current.value < N) {
      animating.value = false
      current.value += current.value >= 2 * N ? -N : N
      requestAnimationFrame(() => {
        animating.value = true
      })
    }
  }, 100)
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  track.value?.addEventListener('transitionend', onTrackTransitionEnd)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(snapTimer)
  track.value?.removeEventListener('transitionend', onTrackTransitionEnd)
  // Ensure the scroll lock is released if the view unmounts while open.
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
    <!-- header -->
    <header class="mb-12">
      <p class="terminal-comment mb-3 text-[13px]">$ ls ./services/</p>
      <h1 class="font-pixel text-2xl leading-none">services</h1>
      <p class="mt-12 max-w-xl text-[15px] leading-relaxed text-gray-600">
        What I can build for you — from full websites to polished interfaces, clean APIs,
        and quality-assured delivery. Here's how we can work together.
      </p>
    </header>

    <!-- services ring: 3 full cards visible (sides blurred, center clear) -->
    <!-- Arrows sit adjacent to the window (flex siblings) — never covering the slides. -->
    <div class="relative mx-auto flex w-full max-w-[1060px] items-center gap-3 sm:gap-4">
      <!-- prev arrow -->
      <button
        type="button"
        aria-label="Previous service"
        class="z-20 shrink-0 p-2 text-gray-400 transition-colors hover:text-ink"
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
          v-for="(service, i) in deck"
          :key="`${service.title}-${i}`"
          class="group relative flex shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-6 text-left transition-all duration-500"
          :class="distance(i) === 0
            ? 'z-10 opacity-100 blur-0'
            : 'opacity-50 blur-[3px]'"
          :style="{ width: `${CARD_WIDTH}px`, marginRight: `${GAP}px` }"
          role="button"
          tabindex="0"
          :aria-label="`Open details for ${at(i).title}`"
          @click="openService(at(i))"
          @keydown.enter.prevent="openService(at(i))"
        >
          <!-- dithered corner accent (top-right) -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute right-0 top-0 h-24 w-24 select-none opacity-[0.18] transition-opacity duration-300 group-hover:opacity-30"
            style="background-image: radial-gradient(rgb(10 10 10 / 0.8) 1px, transparent 1px); background-size: 8px 8px;"
          ></div>

          <!-- icon as lower-right background decoration -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute -bottom-5 -right-4 h-28 w-28 text-gray-100 transition-all duration-300 group-hover:-rotate-6 group-hover:text-gray-200"
          >
            <component :is="at(i).icon" class="h-full w-full" :stroke-width="1.2" />
          </div>

          <div class="relative z-10 flex h-full flex-col">
            <div class="flex items-start justify-between gap-3">
              <h2 class="text-[16px] font-semibold tracking-tight text-ink">{{ at(i).title }}</h2>
              <span
                class="shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-[11px] text-ink"
              >
                {{ at(i).price }}
              </span>
            </div>
            <p class="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-gray-600">
              {{ at(i).desc }}
            </p>

            <div class="mt-5 h-px w-full bg-gray-100"></div>
            <ul class="mt-4 grid gap-2">
              <li
                v-for="point in at(i).points"
                :key="point"
                class="flex items-center gap-2.5 text-[12px] text-gray-600"
              >
                <svg
                  class="h-3.5 w-3.5 shrink-0 text-ink"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12.5l4.5 4.5L19 7"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                {{ point }}
              </li>
            </ul>
          </div>
        </div>
        </div>
      </div>

      <!-- next arrow -->
      <button
        type="button"
        aria-label="Next service"
        class="z-20 shrink-0 p-2 text-gray-400 transition-colors hover:text-ink"
        @click="slide(1)"
      >
        <ArrowRight class="h-5 w-5" :stroke-width="1.8" />
      </button>
    </div>

    <!-- service detail modal -->
    <Teleport to="body">
      <div
        v-if="modalOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        :aria-label="activeService ? `Details — ${activeService.title}` : 'Service details'"
        @keydown="onModalKeydown"
      >
        <!-- blurred backdrop — pure blur, no dark overlay -->
        <div
          class="absolute inset-0 bg-transparent backdrop-blur-xl transition-opacity duration-300"
          @click="closeService"
        ></div>

        <!-- modal card -->
        <div
          v-if="activeService"
          class="relative z-10 w-full max-w-[520px] rounded-xl border border-gray-200 bg-white p-7 shadow-2xl sm:p-9"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-ink">
                <component :is="activeService.icon" class="h-5 w-5" :stroke-width="1.7" />
              </div>
              <div>
                <h2 class="text-[18px] font-semibold tracking-tight text-ink">
                  {{ activeService.title }}
                </h2>
                <span class="mt-0.5 inline-block rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-mono text-[11px] text-ink">
                  {{ activeService.price }}
                </span>
              </div>
            </div>
            <button
              type="button"
              class="-mr-1 -mt-1 rounded p-1.5 text-gray-400 transition-colors hover:text-ink"
              :aria-label="`Close ${activeService.title} details`"
              @click="closeService"
            >
              <X class="h-5 w-5" :stroke-width="1.7" />
            </button>
          </div>

          <p class="mt-5 text-[14.5px] leading-relaxed text-gray-600">
            {{ activeService.details }}
          </p>

          <div class="mt-6 h-px w-full bg-gray-100"></div>
          <p class="mt-5 font-mono text-[10.5px] uppercase tracking-wider text-gray-400">
            // what's included
          </p>
          <ul class="mt-3 grid gap-2.5">
            <li
              v-for="point in activeService.points"
              :key="point"
              class="flex items-center gap-2.5 text-[13px] text-gray-600"
            >
              <svg
                class="h-4 w-4 shrink-0 text-ink"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 12.5l4.5 4.5L19 7"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{ point }}
            </li>
          </ul>

          <div class="mt-7 flex justify-end">
            <button
              type="button"
              class="rounded-md bg-ink px-4 py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80"
              @click="closeService"
            >
              got it
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
