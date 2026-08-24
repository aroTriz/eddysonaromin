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

/** Ordered device views: laptop media first, then phone media. */
const views = computed(() => {
  const show = props.project.showcase
  const hasShow = Boolean(show?.laptops?.length || show?.phones?.length)

  if (hasShow) {
    const map = (items: ShowcaseMedia[], device: 'laptop' | 'phone') =>
      (items ?? []).map((item) => {
        if (typeof item === 'string') return { device, src: item, media: 'image' as const, label: '' }
        return { device, src: item.src, media: item.kind, label: item.label ?? '' }
      })
    return [
      ...map(show?.laptops ?? [], 'laptop'),
      ...map(show?.phones ?? [], 'phone'),
    ]
  }

  // Fallback: one laptop + one phone using image_url
  return [
    { device: 'laptop' as const, src: props.project.image_url ?? null, media: 'image' as const },
    { device: 'phone' as const, src: props.project.image_url ?? null, media: 'image' as const },
  ]
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
  <div class="mt-8">
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

      <!-- device stage — fixed height so laptop & phone occupy the same space -->
      <div
        class="min-w-0 flex-1 overflow-hidden"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <div class="flex h-[320px] items-center justify-center sm:h-[380px]">
          <LaptopMockup
            v-if="current?.device === 'laptop'"
            :key="`lap-${index}`"
            :src="current.src"
            :video="current.media === 'video'"
            :alt="`${project.title} laptop view ${index + 1}`"
            :url="project.url"
            class="w-full transition-opacity duration-300"
          />
          <PhoneMockup
            v-else-if="current?.device === 'phone'"
            :key="`ph-${index}`"
            :src="current.src"
            :video="current.media === 'video'"
            :alt="`${project.title} phone view ${index + 1}`"
            class="transition-opacity duration-300"
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
