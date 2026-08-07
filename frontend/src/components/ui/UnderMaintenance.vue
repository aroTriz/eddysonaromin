<script setup lang="ts">
/**
 * UnderMaintenance — the single, reusable "under maintenance" screen.
 *
 * Every page that's temporarily down uses THIS component, so the whole
 * site always speaks one design language (terminal vibe, monochrome,
 * pixel title, pulsing status dot).
 *
 * Usage:
 *   <UnderMaintenance page="shop" />
 *   <UnderMaintenance
 *     page="blog"
 *     title="back soon"
 *     message="I'm rewriting this section — check back later."
 *   />
 */
import { ArrowLeft } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    /** Page/section under maintenance — shown in the terminal line, e.g. "shop". */
    page: string
    /** Big pixel title. Defaults to "under maintenance". */
    title?: string
    /** Short mono message under the title. */
    message?: string
    /** Show the "back home" pill (default true). */
    showHome?: boolean
  }>(),
  {
    title: 'under maintenance',
    message: 'This section is currently being rebuilt — check back soon.',
    showHome: true,
  },
)
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col items-start px-6 py-24 md:py-32">
    <!-- terminal line -->
    <p class="terminal-comment text-[13px]">
      $ ./{{ page }} --status<span class="ml-1 inline-block h-3.5 w-[7px] translate-y-0.5 bg-gray-400" aria-hidden="true"></span>
    </p>

    <!-- pixel title -->
    <h1 class="mt-4 font-pixel text-2xl leading-none md:text-3xl">{{ title }}</h1>

    <!-- status card -->
    <div class="mt-9 w-full max-w-md rounded-xl border border-dashed border-gray-300 p-5">
      <div class="flex items-center gap-2.5">
        <span class="pulse-dot h-2 w-2 rounded-full bg-gray-600" aria-hidden="true"></span>
        <span class="font-mono text-[11px] uppercase tracking-widest text-gray-500">
          work in progress
        </span>
      </div>
      <p class="mt-3 text-[15px] leading-relaxed text-gray-600">{{ message }}</p>
    </div>

    <!-- back home -->
    <RouterLink
      v-if="showHome"
      to="/"
      class="mt-9 inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 font-mono text-[13px] text-gray-600 hover:border-gray-300 hover:text-ink"
    >
      <ArrowLeft class="h-4 w-4" :stroke-width="1.8" />
      back home
    </RouterLink>
  </div>
</template>
