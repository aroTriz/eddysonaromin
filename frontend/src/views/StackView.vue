<script setup lang="ts">
/**
 * Stack — bryllim-exact: banner + description + flat category sections.
 * Each section: uppercase mono h2 + flex-wrap row of `tag` pills.
 */
import Reveal from '@/components/ui/Reveal.vue'
import { stackGroups } from '@/data/profile'
</script>

<template>
  <div class="mx-auto w-full max-w-2xl px-6 py-14 sm:py-20">
    <!-- header -->
    <header class="mb-12">
      <p class="terminal-comment mb-3 text-[13px]">$ ls ./stack/</p>
      <h1 class="font-pixel text-2xl leading-none">stack</h1>
      <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-gray-600">
        Technologies and tools I work with — from frontend frameworks to backend, mobile, and data.
      </p>
    </header>

    <!-- grouped stack: bryllim-exact flat sections -->
    <div class="space-y-12">
      <Reveal v-for="group in stackGroups" :key="group.label">
        <h2 class="mb-4 font-mono text-[11px] uppercase tracking-wider text-gray-400">
          {{ group.label }}
        </h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="tech in group.items"
            :key="tech"
            class="tag rounded-md border border-gray-200 bg-white px-3 py-1.5 font-mono text-[13px] text-gray-700 transition-colors hover:border-gray-400 hover:text-ink"
          >
            {{ tech }}
          </span>
        </div>
      </Reveal>
    </div>
  </div>
</template>
