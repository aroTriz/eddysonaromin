<script setup lang="ts">
/**
 * Certifications — credentials + references with All/Certifications/References
 * filters, grouped by category when "All" is active, and URL-driven pagination
 * (8 per category per page) — mirroring the projects page pattern.
 * Cards link to slug-based detail pages (/certifications/:slug, /references/:slug).
 */
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowUpRight, Award, UserRound } from 'lucide-vue-next'

import PageHeader from '@/components/ui/PageHeader.vue'
import Pagination from '@/components/ui/Pagination.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { certifications, references } from '@/data/profile'

/** Items per category per page (matches the projects page). */
const ITEMS_PER_PAGE = 8

const filters = [
  { label: 'All', value: '' },
  { label: 'Certifications', value: 'certifications' },
  { label: 'References', value: 'references' },
] as const

const activeFilter = ref<(typeof filters)[number]['value']>('')

const route = useRoute()

/** Current page from the `?page=` query. */
const page = computed(() => {
  const raw = Number(route.query.page)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})

/** All certifications (unpaginated). */
const certAll = computed(() => certifications)

/** All references (unpaginated). */
const refAll = computed(() => references)

/** Certifications on the current page (8 per page). */
const certPage = computed(() => {
  if (activeFilter.value === 'references') return []
  const start = (page.value - 1) * ITEMS_PER_PAGE
  return certAll.value.slice(start, start + ITEMS_PER_PAGE)
})

/** References on the current page (8 per page). */
const refPage = computed(() => {
  if (activeFilter.value === 'certifications') return []
  const start = (page.value - 1) * ITEMS_PER_PAGE
  return refAll.value.slice(start, start + ITEMS_PER_PAGE)
})

/** Certifications on the current page when the specific filter is active. */
const certListed = computed(() => {
  if (activeFilter.value !== 'certifications') return []
  const start = (page.value - 1) * ITEMS_PER_PAGE
  return certAll.value.slice(start, start + ITEMS_PER_PAGE)
})

/** References on the current page when the specific filter is active. */
const refListed = computed(() => {
  if (activeFilter.value !== 'references') return []
  const start = (page.value - 1) * ITEMS_PER_PAGE
  return refAll.value.slice(start, start + ITEMS_PER_PAGE)
})

/** Total pages = the largest category's page count (keeps headers together). */
const paginationTotal = computed(() => {
  if (activeFilter.value === 'certifications') return certAll.value.length
  if (activeFilter.value === 'references') return refAll.value.length
  return Math.max(certAll.value.length, refAll.value.length)
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12 md:py-16">
    <PageHeader
      comment="$ cat ./certifications.md"
      title="certifications"
      description="Credentials, affiliations & references."
    />

    <!-- ── Filters (rounded-full pill chips) ────────────────── -->
    <Reveal :delay="1" class="mt-8 flex flex-wrap gap-2">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        class="rounded-full border px-4 py-2 font-mono text-[12.5px] shadow-sm transition-colors"
        :class="
          activeFilter === filter.value
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-500 hover:text-ink'
        "
        @click="activeFilter = filter.value"
      >
        {{ filter.label }}
      </button>
    </Reveal>

    <!-- ── All → grouped with separator ─────────────────────── -->
    <template v-if="activeFilter === ''">
      <div v-if="certPage.length" class="mt-10">
        <p class="font-mono text-[11px] uppercase tracking-wider text-gray-400">
          certifications
        </p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <RouterLink
            v-for="cert in certPage"
            :key="cert.slug"
            :to="`/certifications/${cert.slug}`"
            class="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 font-mono text-[12px] text-gray-500">
                <Award class="h-3.5 w-3.5" :stroke-width="1.6" />
                {{ cert.category }}
              </div>
              <ArrowUpRight
                class="h-4 w-4 text-gray-500 transition-colors group-hover:text-ink"
                :stroke-width="1.6"
              />
            </div>

            <div>
              <h3 class="text-[15px] font-semibold leading-snug tracking-tight text-ink">
                {{ cert.title }}
              </h3>
              <p class="mt-1 font-mono text-[12.5px] text-gray-500">{{ cert.issuer }}</p>
              <p class="mt-0.5 font-mono text-[12px] text-gray-500">{{ cert.year }}</p>
            </div>

            <span
              class="mt-auto inline-flex items-center gap-1 font-mono text-[12px] text-gray-500 transition-colors group-hover:text-ink"
            >
              view credential
              <ArrowUpRight class="h-3.5 w-3.5" :stroke-width="1.8" />
            </span>
          </RouterLink>
        </div>
      </div>

      <!-- separator line between the two groups -->
      <div v-if="certPage.length && refPage.length" class="my-10 h-px bg-gray-200" aria-hidden="true" />

      <div v-if="refPage.length" class="mt-10">
        <p class="font-mono text-[11px] uppercase tracking-wider text-gray-400">
          references
        </p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <RouterLink
            v-for="reference in refPage"
            :key="reference.slug"
            :to="`/references/${reference.slug}`"
            class="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[13px] font-semibold text-gray-600"
              >
                {{ reference.initials }}
              </div>
              <div class="min-w-0">
                <h3 class="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-ink">
                  <UserRound class="h-3.5 w-3.5 text-gray-500" :stroke-width="1.6" />
                  {{ reference.name }}
                </h3>
                <p class="mt-0.5 text-[12.5px] leading-snug text-gray-500">{{ reference.title }}</p>
              </div>
            </div>

            <span
              class="mt-auto inline-flex items-center gap-1 font-mono text-[12px] text-gray-500 transition-colors group-hover:text-ink"
            >
              view reference
              <ArrowUpRight class="h-3.5 w-3.5" :stroke-width="1.8" />
            </span>
          </RouterLink>
        </div>
      </div>
    </template>

    <!-- ── Specific filter → flat grid ──────────────────────── -->
    <div v-if="activeFilter === 'certifications' && certListed.length" class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <RouterLink
        v-for="cert in certListed"
        :key="cert.slug"
        :to="`/certifications/${cert.slug}`"
        class="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 font-mono text-[12px] text-gray-500">
            <Award class="h-3.5 w-3.5" :stroke-width="1.6" />
            {{ cert.category }}
          </div>
          <ArrowUpRight class="h-4 w-4 text-gray-500 transition-colors group-hover:text-ink" :stroke-width="1.6" />
        </div>
        <div>
          <h3 class="text-[15px] font-semibold leading-snug tracking-tight text-ink">{{ cert.title }}</h3>
          <p class="mt-1 font-mono text-[12.5px] text-gray-500">{{ cert.issuer }}</p>
          <p class="mt-0.5 font-mono text-[12px] text-gray-500">{{ cert.year }}</p>
        </div>
        <span class="mt-auto inline-flex items-center gap-1 font-mono text-[12px] text-gray-500 transition-colors group-hover:text-ink">
          view credential
          <ArrowUpRight class="h-3.5 w-3.5" :stroke-width="1.8" />
        </span>
      </RouterLink>
    </div>

    <div v-if="activeFilter === 'references' && refListed.length" class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <RouterLink
        v-for="reference in refListed"
        :key="reference.slug"
        :to="`/references/${reference.slug}`"
        class="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[13px] font-semibold text-gray-600"
          >
            {{ reference.initials }}
          </div>
          <div class="min-w-0">
            <h3 class="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-ink">
              <UserRound class="h-3.5 w-3.5 text-gray-500" :stroke-width="1.6" />
              {{ reference.name }}
            </h3>
            <p class="mt-0.5 text-[12.5px] leading-snug text-gray-500">{{ reference.title }}</p>
          </div>
        </div>
        <span class="mt-auto inline-flex items-center gap-1 font-mono text-[12px] text-gray-500 transition-colors group-hover:text-ink">
          view reference
          <ArrowUpRight class="h-3.5 w-3.5" :stroke-width="1.8" />
        </span>
      </RouterLink>
    </div>

    <!-- Pagination (bryllim-exact: ← prev · N / M · next →) -->
    <Pagination :total="paginationTotal" :page-size="ITEMS_PER_PAGE" />
  </div>
</template>
