<script setup lang="ts">
/**
 * LaptopMockup — renders a project screenshot inside a CSS laptop frame
 * (screen bezel + browser chrome + base deck), greyfolio-style.
 * Monochrome frame so the screenshot's own colors carry the visual weight.
 * When no `src` image is available, a computer icon is shown in the screen
 * instead — so every project gets the same laptop layout.
 */
import { Monitor } from 'lucide-vue-next'

defineProps<{
  src?: string | null
  alt?: string
  /** Shown in the browser address bar; hidden when absent. */
  url?: string | null
  /** Render a <video> instead of an <img> (uploaded showcase clips). */
  video?: boolean
  /** Optional device label shown below the mockup. */
  label?: string
}>()
</script>

<template>
  <figure class="mx-auto w-full max-w-3xl select-none">
    <!-- ── Laptop lid (bezel + browser window) ───────────────── -->
    <div
      class="rounded-[14px] bg-gradient-to-b from-gray-300 via-gray-200 to-gray-300 p-2 shadow-md ring-1 ring-gray-200 sm:p-2.5"
    >
      <div class="overflow-hidden rounded-[8px] bg-white shadow-sm">
        <!-- Browser chrome -->
        <div class="flex items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-3 py-2">
          <span class="h-2.5 w-2.5 rounded-full bg-gray-200" aria-hidden="true"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-gray-200" aria-hidden="true"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-gray-200" aria-hidden="true"></span>
          <span
            v-if="url"
            class="ml-3 flex-1 truncate rounded-md bg-white px-2.5 py-1 font-mono text-[10px] text-gray-400 ring-1 ring-gray-200"
          >{{ url }}</span>
        </div>
        <!-- Screen -->
        <div v-if="src" class="aspect-[16/9] w-full bg-gray-100">
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
          class="flex aspect-[16/9] w-full items-center justify-center bg-gray-50"
          aria-hidden="true"
        >
          <Monitor class="h-10 w-10 text-gray-300" :stroke-width="1.2" />
        </div>
      </div>
    </div>

    <!-- ── Hinge + deck (laptop base) ────────────────────────── -->
    <div
      class="mx-auto -mt-1 h-2.5 w-[96%] rounded-b-[10px] bg-gradient-to-b from-gray-400 to-gray-300"
      aria-hidden="true"
    ></div>
    <div
      class="mx-auto h-1.5 w-[88%] rounded-b-lg bg-gradient-to-b from-gray-300 to-gray-200"
      aria-hidden="true"
    ></div>
  </figure>
  <p v-if="label" class="mt-2 text-center font-mono text-[11px] text-gray-400">
    {{ label }}
  </p>
</template>
