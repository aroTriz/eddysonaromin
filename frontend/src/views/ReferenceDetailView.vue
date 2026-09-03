<script setup lang="ts">
/**
 * ReferenceDetail — slug-driven reference page. Fetches from the
 * references CMS (/api/v1/references/:slug) with a static fallback.
 */
import { ArrowLeft, LoaderCircle, Mail, UserRound } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { references as fallbackReferences } from '@/data/profile'
import { fetchReference } from '@/services/api'
import type { Reference } from '@/types'

const route = useRoute()

const reference = ref<Reference | null>(null)
const loading = ref(true)
const notFound = ref(false)

async function load(): Promise<void> {
  const slug = String(route.params.slug ?? '')
  loading.value = true
  notFound.value = false
  try {
    reference.value = await fetchReference(slug)
  } catch {
    // Fallback to static data (keeps old slugs working offline)
    const local = fallbackReferences.find((r) => r.slug === slug) as unknown as Reference | undefined
    if (local) reference.value = local
    else notFound.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.params.slug, load)
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12 md:py-16">
    <RouterLink
      to="/certifications"
      class="inline-flex items-center gap-1.5 font-mono text-[13px] text-gray-500 hover:text-ink"
    >
      <ArrowLeft class="h-4 w-4" :stroke-width="1.8" />
      back to certifications
    </RouterLink>

    <div v-if="loading" class="mt-16 flex justify-center">
      <LoaderCircle class="h-6 w-6 animate-spin text-gray-400" :stroke-width="1.7" />
    </div>
    <template v-else-if="reference">
      <header class="mt-6">
        <div class="flex items-center gap-3">
          <div v-if="reference.photo_url" class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white p-2">
            <img :src="reference.photo_url" :alt="reference.name" class="h-full w-full object-contain" />
          </div>
          <div
            v-else
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[16px] font-semibold text-gray-600"
          >
            {{ reference.initials }}
          </div>
          <div class="min-w-0 flex-1 overflow-hidden">
            <p class="font-mono text-[12.5px] text-gray-500">reference</p>
            <h1 class="mt-0.5 flex min-w-0 items-center gap-2 text-[2rem] font-semibold leading-tight tracking-tightest md:text-[2.6rem]">
              <UserRound class="h-6 w-6 shrink-0 text-gray-500" :stroke-width="1.6" />
              <span class="truncate" :title="reference.name">{{ reference.name }}</span>
            </h1>
          </div>
        </div>

        <p class="mt-4 text-[15.5px] leading-relaxed text-gray-600">{{ reference.title }}</p>
      </header>

      <dl class="mt-8 rounded-xl border border-gray-200 bg-white p-5">
        <dt class="font-mono text-[11.5px] uppercase tracking-wide text-gray-500">about</dt>
        <dd class="mt-1 text-[14px] leading-relaxed text-ink">{{ reference.summary }}</dd>

        <template v-if="reference.email">
          <div class="mt-4 h-px w-full bg-gray-100"></div>
          <dt class="mt-4 font-mono text-[11.5px] uppercase tracking-wide text-gray-500">contact</dt>
          <dd class="mt-1">
            <a
              :href="`mailto:${reference.email}`"
              class="inline-flex items-center gap-1.5 font-mono text-[13.5px] text-gray-600 underline underline-offset-2 hover:text-ink"
            >
              <Mail class="h-3.5 w-3.5" :stroke-width="1.6" />
              {{ reference.email }}
            </a>
          </dd>
        </template>
      </dl>
    </template>

    <template v-else-if="notFound">
      <div class="mt-16 text-center">
        <p class="font-mono text-[13px] text-gray-500">reference not found.</p>
        <RouterLink
          to="/certifications"
          class="mt-4 inline-flex items-center gap-1.5 font-mono text-[13px] text-gray-500 hover:text-ink"
        >
          <ArrowLeft class="h-4 w-4" :stroke-width="1.8" />
          back to certifications
        </RouterLink>
      </div>
    </template>
  </div>
</template>
