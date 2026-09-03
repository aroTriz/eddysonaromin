<script setup lang="ts">
/**
 * DeviceShowcase — greyfolio-style device swiper for a project detail page.
 * Shows ONE device at a time in a horizontal swiper sequence:
 *   laptop 1 → phone 1 → laptop 2 → phone 2 → …
 * Arrows, dots, and touch-swipe cycle through views.
 * Swipe has buhay — slide + scale + drag follow.
 */
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import LaptopMockup from '@/components/ui/LaptopMockup.vue'
import PhoneMockup from '@/components/ui/PhoneMockup.vue'
import type { Project, ShowcaseMedia } from '@/types'

const props = defineProps<{
  project: Project
}>()

/** Ordered device views: laptop media first, then phone media. */
const views = computed(() => {
  const show = props.project.showcase
  const laptops = show?.laptops ?? []
  const phones = show?.phones ?? []
  const hasShow = laptops.length > 0 || phones.length > 0
  if (!hasShow) return []
  const map = (items: ShowcaseMedia[], device: 'laptop' | 'phone') =>
    items.map((item) => {
      if (typeof item === 'string') return { device, src: item, media: 'image' as const, label: '' }
      return { device, src: item.src ?? '', media: item.kind ?? 'image', label: item.label ?? '' }
    })
  return [...map(laptops, 'laptop'), ...map(phones, 'phone')]
})

const index = ref(0)
const direction = ref<1 | -1>(1)
const isDragging = ref(false)
const dragOffset = ref(0)

watch(views, () => {
  if (index.value >= views.value.length) index.value = 0
})

function prev(): void {
  direction.value = -1
  index.value = (index.value - 1 + views.value.length) % views.value.length
}

function next(): void {
  direction.value = 1
  index.value = (index.value + 1) % views.value.length
}

function goTo(i: number): void {
  if (i === index.value) return
  direction.value = i > index.value ? 1 : -1
  // handle wrap-around shortest path
  if (views.value.length > 2) {
    const forward = (i - index.value + views.value.length) % views.value.length
    const backward = (index.value - i + views.value.length) % views.value.length
    direction.value = forward <= backward ? 1 : -1
  }
  index.value = i
}

/** Current view object */
const current = computed(() => views.value[index.value] ?? null)

/** Touch swipe with drag follow + direction-aware slide */
let touchStartX = 0
let touchStartY = 0
function onTouchStart(e: TouchEvent): void {
  if (views.value.length <= 1) return
  const t = e.changedTouches[0]
  touchStartX = t.clientX
  touchStartY = t.clientY
  isDragging.value = true
  dragOffset.value = 0
}
function onTouchMove(e: TouchEvent): void {
  if (!isDragging.value) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStartX
  const dy = t.clientY - touchStartY
  // ignore vertical scroll
  if (Math.abs(dy) > Math.abs(dx)) return
  // clamp drag to +/- 80px for subtle follow
  dragOffset.value = Math.max(-80, Math.min(80, dx))
}
function onTouchEnd(e: TouchEvent): void {
  if (!isDragging.value) return
  const dx = e.changedTouches[0].clientX - touchStartX
  isDragging.value = false
  dragOffset.value = 0
  if (Math.abs(dx) < 45) return
  if (dx < 0) next()
  else prev()
}
</script>

<template>
  <div v-if="views.length > 0" class="mt-8">
    <div class="relative mx-auto flex max-w-3xl items-center gap-3 sm:gap-4">
      <!-- prev arrow — hidden when only one device -->
      <button
        v-if="views.length > 1"
        type="button"
        aria-label="Previous view"
        class="z-20 shrink-0 p-2 text-gray-400 transition-colors hover:text-ink active:scale-95"
        @click="prev"
      >
        <ArrowLeft class="h-5 w-5" :stroke-width="1.8" />
      </button>

      <!-- device stage — fixed height so phone === laptop visually -->
      <div
        class="min-w-0 flex-1 flex items-center justify-center overflow-hidden"
        style="height: clamp(360px, 42vw, 420px)"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <Transition :name="direction === 1 ? 'swipe-next' : 'swipe-prev'" mode="out-in">
          <div
            :key="`${current?.device}-${index}`"
            class="flex h-full w-full max-w-3xl items-center justify-center will-change-transform"
            :style="isDragging ? `transform: translateX(${dragOffset}px); transition: none;` : undefined"
          >
            <LaptopMockup
              v-if="current?.device === 'laptop'"
              :src="current.src"
              :video="current.media === 'video'"
              :alt="`${project.title} laptop view ${index + 1}`"
              :url="project.url"
              :equal-height="true"
              class="h-full w-auto max-h-full"
            />
            <PhoneMockup
              v-else-if="current?.device === 'phone'"
              :src="current.src"
              :video="current.media === 'video'"
              :alt="`${project.title} phone view ${index + 1}`"
              class="h-full w-auto max-h-full mx-auto"
            />
          </div>
        </Transition>
      </div>

      <!-- next arrow — hidden when only one device -->
      <button
        v-if="views.length > 1"
        type="button"
        aria-label="Next view"
        class="z-20 shrink-0 p-2 text-gray-400 transition-colors hover:text-ink active:scale-95"
        @click="next"
      >
        <ArrowRight class="h-5 w-5" :stroke-width="1.8" />
      </button>
    </div>

    <!-- indicator dots — hidden when only one device -->
    <div v-if="views.length > 1" class="mt-4 flex justify-center gap-1.5">
      <button
        v-for="(view, i) in views"
        :key="i"
        type="button"
        class="h-1.5 rounded-full transition-all active:scale-90"
        :class="[
          index === i ? 'bg-ink w-5' : 'bg-gray-300 hover:bg-gray-400',
          view.device === 'phone' ? (index === i ? 'w-5' : 'w-1.5') : 'w-5',
        ]"
        :aria-label="`Show ${view.device} view ${i + 1}`"
        @click="goTo(i)"
      />
    </div>
  </div>
</template>

<style scoped>
/* Swipe slide — may buhay, not instant.
   Next: new enters from right (30% + fade + scale), old exits to left.
   Prev: mirrored. Uses same easing as theme ViewTransition for consistency. */
.swipe-next-enter-active,
.swipe-next-leave-active,
.swipe-prev-enter-active,
.swipe-prev-leave-active {
  transition:
    transform 380ms cubic-bezier(0.32, 0.08, 0.24, 1),
    opacity 320ms ease;
}
.swipe-next-enter-from {
  transform: translateX(32%) scale(0.96);
  opacity: 0;
}
.swipe-next-leave-to {
  transform: translateX(-32%) scale(0.96);
  opacity: 0;
}
.swipe-prev-enter-from {
  transform: translateX(-32%) scale(0.96);
  opacity: 0;
}
.swipe-prev-leave-to {
  transform: translateX(32%) scale(0.96);
  opacity: 0;
}
</style>
