<script setup lang="ts">
/**
 * DeviceShowcase — greyfolio-style device switcher for a project detail page.
 * Renders the project's CMS-configured screens:
 *  - laptop views (LaptopMockup) from `showcase.laptops`
 *  - phone views (PhoneMockup) from `showcase.phones`
 * When the showcase is empty (existing projects), it falls back to a single
 * laptop + phone shot using `image_url` — so old data keeps its current look.
 * Arrows + horizontal swipe + indicator dots cycle through the views.
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
  const hasShow = Boolean(show?.laptops?.length || show?.phones?.length)

  // CMS-configured showcase wins when present. Each entry is either a legacy
  // URL string (image) or an uploaded {src, kind} media object.
  if (hasShow) {
    const map = (items: ShowcaseMedia[], device: 'laptop' | 'phone') =>
      (items ?? []).map((item) => {
        if (typeof item === 'string') return { device, src: item, media: 'image' as const }
        return { device, src: item.src, media: item.kind }
      })
    return [
      ...map(show?.laptops ?? [], 'laptop'),
      ...map(show?.phones ?? [], 'phone'),
    ]
  }

  // Fallback (existing projects): one laptop + one phone shot. With no
  // image_url, both mockups render their built-in icon placeholder.
  return [
    { device: 'laptop' as const, src: props.project.image_url ?? null, media: 'image' as const },
    { device: 'phone' as const, src: props.project.image_url ?? null, media: 'image' as const },
  ]
})

const index = ref(0)

// Keep the index valid when the project (or its showcase) changes.
watch(views, () => {
  if (index.value >= views.value.length) index.value = 0
})

function prev(): void {
  index.value = (index.value - 1 + views.value.length) % views.value.length
}

function next(): void {
  index.value = (index.value + 1) % views.value.length
}

/** Horizontal swipe flips between views (left swipe → next). */
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
  <div class="mt-8">
    <div class="relative mx-auto flex max-w-3xl items-center gap-3 sm:gap-4">
      <!-- prev arrow -->
      <button
        type="button"
        :aria-label="'Previous view'"
        class="z-20 shrink-0 p-2 text-gray-400 transition-colors hover:text-ink"
        :disabled="views.length <= 1"
        @click="prev"
      >
        <ArrowLeft class="h-5 w-5" :stroke-width="1.8" />
      </button>

      <!-- device stage — all views stacked in one grid cell (no height jump) -->
      <div
        class="grid min-w-0 flex-1 grid-cols-1 items-start justify-items-center"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <LaptopMockup
          v-for="(view, i) in views.filter((v) => v.device === 'laptop')"
          :key="`lap-${i}`"
          :src="view.src"
          :video="view.media === 'video'"
          :alt="`${project.title} laptop view ${i + 1}`"
          :url="project.url"
          class="col-start-1 row-start-1 transition-opacity duration-300"
          :class="views[index] === view ? 'opacity-100' : 'pointer-events-none opacity-0'"
        />
        <PhoneMockup
          v-for="(view, i) in views.filter((v) => v.device === 'phone')"
          :key="`ph-${i}`"
          :src="view.src"
          :video="view.media === 'video'"
          :alt="`${project.title} phone view ${i + 1}`"
          class="col-start-1 row-start-1 transition-opacity duration-300"
          :class="views[index] === view ? 'opacity-100' : 'pointer-events-none opacity-0'"
        />
      </div>

      <!-- next arrow -->
      <button
        type="button"
        :aria-label="'Next view'"
        class="z-20 shrink-0 p-2 text-gray-400 transition-colors hover:text-ink"
        :disabled="views.length <= 1"
        @click="next"
      >
        <ArrowRight class="h-5 w-5" :stroke-width="1.8" />
      </button>
    </div>

    <!-- indicator dots — laptop views shown as wide, phone views as narrow -->
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
      ></button>
    </div>
  </div>
</template>
