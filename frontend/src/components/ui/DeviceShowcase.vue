<script setup lang="ts">
/**
 * DeviceShowcase — greyfolio-style device swiper for a project detail page.
 * Shows ONE device at a time in a horizontal swiper sequence:
 *   laptop 1 → phone 1 → laptop 2 → phone 2 → …
 * Arrows, dots, and touch-swipe cycle through views.
 */
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import LaptopMockup from '@/components/ui/LaptopMockup.vue'
import PhoneMockup from '@/components/ui/PhoneMockup.vue'
import type { Project, ShowcaseMedia } from '@/types'

const props = defineProps<{
  project: Project
}>()

/** Ordered device views: laptop media first, then phone media.
 *  IMPORTANT: no fallback — if nothing was added in /aromin/projects
 *  (showcase empty), render nothing. The admin "Add" is the single source
 *  of truth; image_url fallback is intentionally removed so empty showcase
 *  means no device mockups at all.
 */
const views = computed(() => {
  const show = props.project.showcase
  // Keep ALL devices added in admin — even empty src ones (they render as
  // placeholder Monitor/Smartphone icons). "Add" is the source of truth;
  // backend now keeps empty entries, so we must not filter by src.
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

watch(views, () => {
  if (index.value >= views.value.length) index.value = 0
})

function prev(): void {
  index.value = (index.value - 1 + views.value.length) % views.value.length
}

function next(): void {
  index.value = (index.value + 1) % views.value.length
}

/** Current view object */
const current = computed(() => views.value[index.value] ?? null)

/** Touch swipe */
let touchStartX = 0
function onTouchStart(e: TouchEvent): void {
  touchStartX = e.changedTouches[0].clientX
}
function onTouchEnd(e: TouchEvent): void {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(dx) < 40) return
  if (dx < 0) next()
  else prev()
}
</script>

<template>
  <div v-if="views.length > 0" class="mt-8">
    <div class="relative mx-auto flex max-w-3xl items-center gap-3 sm:gap-4">
      <!-- prev arrow -->
      <button
        type="button"
        aria-label="Previous view"
        class="z-20 shrink-0 p-2 text-gray-400 transition-colors hover:text-ink"
        :disabled="views.length <= 1"
        @click="prev"
      >
        <ArrowLeft class="h-5 w-5" :stroke-width="1.8" />
      </button>

      <!-- device stage — HEIGHT EQUAL (not width): both devices share the same
           visual height so the phone interface height == laptop height.
           Stage has a fixed height; laptop uses equalHeight height-driven mode
           and phone already is h-full, so they match pixel-perfect. -->
      <div
        class="min-w-0 flex-1 flex items-center justify-center"
        style="height: clamp(360px, 42vw, 420px)"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <div class="flex h-full w-full max-w-3xl items-center justify-center">
          <LaptopMockup
            v-if="current?.device === 'laptop'"
            :key="`lap-${index}`"
            :src="current.src"
            :video="current.media === 'video'"
            :alt="`${project.title} laptop view ${index + 1}`"
            :url="project.url"
            :equal-height="true"
            class="h-full w-auto max-h-full"
          />
          <PhoneMockup
            v-else-if="current?.device === 'phone'"
            :key="`ph-${index}`"
            :src="current.src"
            :video="current.media === 'video'"
            :alt="`${project.title} phone view ${index + 1}`"
            class="h-full w-auto max-h-full mx-auto"
          />
        </div>
      </div>

      <!-- next arrow -->
      <button
        type="button"
        aria-label="Next view"
        class="z-20 shrink-0 p-2 text-gray-400 transition-colors hover:text-ink"
        :disabled="views.length <= 1"
        @click="next"
      >
        <ArrowRight class="h-5 w-5" :stroke-width="1.8" />
      </button>
    </div>

    <!-- indicator dots -->
    <div class="mt-4 flex justify-center gap-1.5">
      <button
        v-for="(view, i) in views"
        :key="i"
        type="button"
        class="h-1.5 rounded-full transition-all"
        :class="[
          index === i ? 'bg-ink' : 'bg-gray-300',
          view.device === 'phone' ? 'w-1.5' : 'w-5',
        ]"
        :aria-label="`Show ${view.device} view ${i + 1}`"
        @click="index = i"
      />
    </div>
  </div>
</template>
