<script setup lang="ts">
/**
 * Recommendations — masonry testimonial wall (CSS columns),
 * mirroring bryllim.com/recommendations exactly. Content is served
 * from the /api/v1/recommendations endpoint (managed in /aromin admin).
 */
import { ArrowLeft } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'

import { fetchRecommendations } from '@/services/api'
import type { Recommendation } from '@/types'

const items = ref<Recommendation[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    items.value = await fetchRecommendations()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load recommendations'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-14 sm:py-20">
    <!-- header -->
    <header class="mb-12">
      <RouterLink
        to="/"
        class="mb-6 inline-flex items-center gap-1.5 font-mono text-[12px] text-gray-400 hover:text-ink"
      >
        <ArrowLeft class="h-3.5 w-3.5" :stroke-width="1.8" />
        home
      </RouterLink>
      <h1 class="font-pixel text-2xl leading-none">recommendations</h1>
    </header>

    <p class="reveal mb-12 max-w-xl text-[15px] leading-relaxed text-gray-600">
      What leaders, teammates, and mentors say about working with me — straight from my network.
    </p>

    <!-- loading skeleton -->
    <div v-if="loading" class="columns-1 gap-4 sm:columns-2 lg:columns-3">
      <div
        v-for="i in 6"
        :key="i"
        class="mb-4 h-44 skeleton break-inside-avoid rounded-xl border border-gray-200 bg-gray-50"
      ></div>
    </div>

    <div v-else-if="error" class="rounded-xl border border-dashed border-gray-200 p-10 text-center">
      <p class="font-mono text-[12px] text-gray-500">// {{ error }}</p>
    </div>

    <!-- testimonial wall (masonry via CSS columns) -->
    <div v-else-if="items.length > 0" class="columns-1 gap-4 sm:columns-2 lg:columns-3">
      <figure
        v-for="rec in items"
        :key="rec.id"
        class="rec-card reveal mb-4 break-inside-avoid rounded-xl border border-gray-200 bg-white p-5 shadow-[0_8px_22px_-18px_rgba(10,10,10,0.22)]"
      >
        <svg class="h-6 w-6 text-gray-200" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9 7H6a3 3 0 00-3 3v1a3 3 0 003 3h1v1a2 2 0 01-2 2H4v2h1a4 4 0 004-4V7zm11 0h-3a3 3 0 00-3 3v1a3 3 0 003 3h1v1a2 2 0 01-2 2h-1v2h1a4 4 0 004-4V7z" />
        </svg>

        <blockquote class="mt-2 whitespace-pre-line font-serif text-[15px] leading-[1.65] text-gray-700">
          {{ rec.quote }}
        </blockquote>

        <figcaption class="mt-5 flex items-start gap-3 border-t border-gray-100 pt-4">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[11px] font-medium text-gray-600">
            {{ rec.initials }}
          </div>
          <div class="min-w-0">
            <div class="truncate text-[13px] font-semibold leading-snug text-ink" :title="rec.author">{{ rec.author }}</div>
            <div class="mt-0.5 truncate text-[11px] leading-snug text-gray-500">{{ rec.role }}</div>
          </div>
        </figcaption>
      </figure>
    </div>

    <div v-else class="rounded-xl border border-dashed border-gray-200 p-10 text-center">
      <p class="font-mono text-[12px] text-gray-500">No recommendations yet.</p>
    </div>
  </div>
</template>

<style scoped>
.rec-card {
  transition:
    box-shadow 0.3s ease,
    transform 0.3s ease;
}
.rec-card:hover {
  box-shadow: 0 18px 40px -22px rgba(10, 10, 10, 0.32);
  transform: translateY(-3px);
}
.rec-card blockquote {
  font-family: var(--font-serif);
}
</style>
