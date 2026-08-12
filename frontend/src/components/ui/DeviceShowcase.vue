<script setup lang="ts">
/**
 * DeviceShowcase — greyfolio-style device switcher for a project detail page.
 * Two interfaces: a laptop (PC screen) mockup and a phone mockup. Arrows
 * (services-swiper style) + horizontal swipe gesture + indicator dots toggle
 * between the two. Both mockups stay mounted in a stacked grid cell so the
 * stage never changes height (no layout shift when switching).
 */
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { ref } from 'vue'

import LaptopMockup from '@/components/ui/LaptopMockup.vue'
import PhoneMockup from '@/components/ui/PhoneMockup.vue'
import type { Project } from '@/types'

const props = defineProps<{
  project: Project
}>()

const DEVICES = ['laptop', 'phone'] as const
type Device = (typeof DEVICES)[number]

const device = ref<Device>('laptop')

function show(view: Device): void {
  device.value = view
}

/** Horizontal swipe flips between laptop and phone (left swipe → phone). */
let touchStartX = 0
function onTouchStart(e: TouchEvent): void {
  touchStartX = e.changedTouches[0].clientX
}
function onTouchEnd(e: TouchEvent): void {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(dx) < 40) return
  device.value = dx < 0 ? 'phone' : 'laptop'
}
</script>

<template>
  <div class="mt-8">
    <div class="relative mx-auto flex max-w-3xl items-center gap-3 sm:gap-4">
      <!-- prev arrow → laptop -->
      <button
        type="button"
        :aria-label="'Show laptop view'"
        class="z-20 shrink-0 p-2 text-gray-400 transition-colors hover:text-ink"
        @click="show('laptop')"
      >
        <ArrowLeft class="h-5 w-5" :stroke-width="1.8" />
      </button>

      <!-- device stage — both mockups stacked in one grid cell (no height jump) -->
      <div
        class="grid min-w-0 flex-1 grid-cols-1 items-start justify-items-center"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <LaptopMockup
          :src="project.image_url"
          :alt="`${project.title} snapshot`"
          :url="project.url"
          class="col-start-1 row-start-1 transition-opacity duration-300"
          :class="device === 'laptop' ? 'opacity-100' : 'pointer-events-none opacity-0'"
        />
        <PhoneMockup
          :src="project.image_url"
          :alt="`${project.title} mobile view`"
          class="col-start-1 row-start-1 transition-opacity duration-300"
          :class="device === 'phone' ? 'opacity-100' : 'pointer-events-none opacity-0'"
        />
      </div>

      <!-- next arrow → phone -->
      <button
        type="button"
        :aria-label="'Show phone view'"
        class="z-20 shrink-0 p-2 text-gray-400 transition-colors hover:text-ink"
        @click="show('phone')"
      >
        <ArrowRight class="h-5 w-5" :stroke-width="1.8" />
      </button>
    </div>

    <!-- indicator dots -->
    <div class="mt-4 flex justify-center gap-1.5">
      <button
        v-for="view in DEVICES"
        :key="view"
        type="button"
        class="h-1.5 rounded-full transition-all"
        :class="device === view ? 'w-5 bg-ink' : 'w-1.5 bg-gray-300'"
        :aria-label="`Show ${view} view`"
        @click="show(view)"
      ></button>
    </div>
  </div>
</template>
