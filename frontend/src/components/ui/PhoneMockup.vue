<script setup lang="ts">
/**
 * PhoneMockup — renders a screenshot inside a CSS phone frame (rounded bezel
 * + dynamic island + screen), greyfolio-style. Matches the LaptopMockup frame
 * language: monochrome chrome so the screenshot's own colors carry the visual
 * weight. When no `src` is available, a smartphone icon is shown in the screen
 * instead — so every project gets the same phone layout.
 */
import { Smartphone } from 'lucide-vue-next'

defineProps<{
  src?: string | null
  alt?: string
  /** Render a <video> instead of an <img> (uploaded showcase clips). */
  video?: boolean
}>()
</script>

<template>
  <figure class="mx-auto w-full max-w-[240px] select-none">
    <!-- ── Phone body (bezel) ────────────────────────────────── -->
    <div
      class="rounded-[2.4rem] bg-gradient-to-b from-gray-300 via-gray-200 to-gray-300 p-[6px] shadow-md ring-1 ring-gray-200"
    >
      <div class="relative overflow-hidden rounded-[1.9rem] bg-white">
        <!-- Dynamic island -->
        <div
          class="absolute left-1/2 top-2.5 z-10 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-gray-200"
          aria-hidden="true"
        ></div>
        <!-- Screen -->
        <div v-if="src" class="aspect-[9/19] w-full bg-gray-100">
          <video
            v-if="video"
            :src="src"
            class="h-full w-full object-cover"
            muted
            loop
            playsinline
            controls
            preload="metadata"
            :aria-label="alt"
          ></video>
          <img
            v-else
            :src="src"
            :alt="alt"
            class="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div
          v-else
          class="flex aspect-[9/19] w-full items-center justify-center bg-gray-50"
          aria-hidden="true"
        >
          <Smartphone class="h-10 w-10 text-gray-300" :stroke-width="1.2" />
        </div>
      </div>
    </div>
  </figure>
</template>
