<script setup lang="ts">
/**
 * Stack — greyfolio-style tech stack: banner + description + category
 * sections, each a dashed-border pill row of technologies WITH their brand
 * logos (Simple Icons) + name. Categories come from the API (stack_groups)
 * with the static profile data as fallback while loading or offline.
 */
import { onMounted, ref } from 'vue'

import Reveal from '@/components/ui/Reveal.vue'
import TechLogo from '@/components/ui/TechLogo.vue'
import { stackGroups as staticGroups } from '@/data/profile'
import { fetchStackGroups } from '@/services/api'
import type { StackGroup } from '@/types'

const groups = ref<StackGroup[]>([])

onMounted(async () => {
  try {
    const data = await fetchStackGroups()
    if (data && data.length > 0) {
      groups.value = data
    }
  } catch {
    // fall back to static data below
  }
})

/** Static fallback shaped like API rows (used before/if the fetch fails). */
const fallbackGroups: StackGroup[] = staticGroups.map((g, i) => ({
  id: i + 1,
  label: g.label,
  items: g.items,
  sort_order: i,
  archived_at: null,
  created_at: null,
  updated_at: null,
}))
</script>

<template>
  <div class="mx-auto w-full max-w-2xl px-6 py-14 sm:py-20">
    <!-- header -->
    <header class="mb-12">
      <p class="terminal-comment mb-3 text-[13px]">$ ls ./stack/</p>
      <h1 class="font-pixel text-2xl leading-none">tech stack</h1>
      <p class="mt-12 max-w-xl text-[15px] leading-relaxed text-gray-600">
        Technologies and tools I work with — from frontend frameworks to backend, mobile, and data.
      </p>
    </header>

    <!-- grouped stack: greyfolio-style categories with brand logos -->
    <div class="space-y-12">
      <Reveal v-for="group in groups.length > 0 ? groups : fallbackGroups" :key="group.label">
        <section class="border-b border-dashed border-gray-200 pb-10 dark:border-gray-800">
          <h2 class="mb-4 font-mono text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {{ group.label }}
          </h2>
          <div class="flex flex-wrap gap-2.5">
            <span
              v-for="tech in group.items"
              :key="tech"
              class="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white px-3 py-1.5 font-mono text-[13px] text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-400 hover:bg-gray-50 hover:text-ink dark:border-gray-300 dark:bg-gray-100 dark:text-gray-500 dark:hover:border-gray-500 dark:hover:bg-gray-200 dark:hover:text-gray-950"
            >
              <TechLogo :name="tech" :size="18" />
              {{ tech }}
            </span>
          </div>
        </section>
      </Reveal>
    </div>
  </div>
</template>
