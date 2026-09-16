<script setup lang="ts">
/**
 * Recommendations — masonry testimonial wall (CSS columns),
 * mirroring bryllim.com/recommendations exactly. Content is served
 * from the /api/v1/recommendations endpoint (managed in /aromin admin).
 */
import { ArrowLeft, Images, Phone, X } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'

import { recommendations as staticRecommendations } from '@/data/profile'
import { fetchRecommendations } from '@/services/api'
import type { Recommendation } from '@/types'

/**
 * Seed with the static profile testimonials so the page renders instantly
 * (blur transition only — same as every other page). The API (managed in
 * /aromin admin) silently overrides the seed when it responds, so CMS edits
 * still show up — but a slow/offline API can never blank the page.
 */
const fallbackItems: Recommendation[] = staticRecommendations.map((rec, i) => ({
  id: i + 1,
  initials: rec.initials,
  quote: rec.quote,
  author: rec.author,
  role: rec.role,
  email: rec.email ?? null,
  phone: null,
  photo_url: null,
  letter_url: null,
  sort_order: i,
  archived_at: null,
  created_at: null,
  updated_at: null,
}))

const items = ref<Recommendation[]>(fallbackItems)
const letterModal = ref<string | null>(null)

function openLetter(url: string): void {
  letterModal.value = url
  document.documentElement.style.overflow = 'hidden'
}
function closeLetter(): void {
  letterModal.value = null
  document.documentElement.style.overflow = ''
}

onMounted(async () => {
  try {
    const data = await fetchRecommendations()
    if (data && data.length > 0) {
      items.value = data
    }
  } catch {
    // Keep the static seed — a failed fetch must never blank the page.
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 sm:py-14 lg:py-20">
    <!-- header -->
    <header class="mb-12">
      <RouterLink
        to="/"
        class="mb-6 inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 font-mono text-[12px] text-gray-400 hover:text-ink"
      >
        <ArrowLeft class="h-3.5 w-3.5" :stroke-width="1.8" />
        home
      </RouterLink>
      <h1 class="font-pixel text-2xl leading-none">recommendations</h1>
    </header>

    <p class="reveal mb-12 max-w-xl text-[15px] leading-relaxed text-gray-600">
      What leaders, teammates, and mentors say about working with me — straight from my network.
    </p>

    <!-- testimonial wall (masonry via CSS columns) — always seeded, so it
         renders instantly; the API silently refreshes it when available -->
    <div class="columns-1 gap-4 sm:columns-2 lg:columns-3">
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
          <div v-if="rec.photo_url" class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
            <img :src="rec.photo_url" :alt="rec.author" class="h-full w-full object-cover" loading="lazy" />
          </div>
          <div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 font-mono text-[11px] font-medium text-gray-600">
            {{ rec.initials }}
          </div>
          <div class="min-w-0">
            <div class="truncate text-[13px] font-semibold leading-snug text-ink" :title="rec.author">{{ rec.author }}</div>
            <div class="mt-0.5 truncate text-[11px] leading-snug text-gray-500">{{ rec.role }}</div>
            <a v-if="rec.phone" :href="`tel:${rec.phone}`" class="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-gray-500 hover:text-ink">
              <Phone class="h-3 w-3" :stroke-width="1.6" />
              {{ rec.phone }}
            </a>
          </div>
          <button v-if="rec.letter_url" type="button" class="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-ink" aria-label="View recommendation letter" @click="openLetter(rec.letter_url!)">
            <Images class="h-3.5 w-3.5" :stroke-width="1.6" />
          </button>
        </figcaption>
      </figure>
    </div>

    <!-- Letter modal — like experience album modal -->
    <Teleport to="body">
      <div v-if="letterModal" class="fixed inset-0 z-[100] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Recommendation letter" @click.self="closeLetter">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeLetter"></div>
        <div class="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <p class="font-mono text-[12px] text-gray-500">// recommendation letter</p>
            <button type="button" class="rounded p-1 text-gray-400 hover:text-ink" @click="closeLetter"><X class="h-4 w-4" :stroke-width="1.7" /></button>
          </div>
          <div class="flex-1 overflow-auto bg-gray-50 p-4 flex items-center justify-center">
            <img :src="letterModal" alt="Recommendation letter" class="max-h-[70vh] w-auto max-w-full object-contain rounded-md border border-gray-200 bg-white" />
          </div>
        </div>
      </div>
    </Teleport>
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
