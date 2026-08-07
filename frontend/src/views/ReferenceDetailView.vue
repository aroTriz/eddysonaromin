<script setup lang="ts">
/**
 * ReferenceDetail — slug-driven reference page. Looks up the reference from
 * local profile data by slug; shows a not-found state for unknown slugs.
 */
import { ArrowLeft, Mail, UserRound } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { references } from '@/data/profile'

const route = useRoute()

const reference = computed(() =>
  references.find((r) => r.slug === route.params.slug),
)
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
    <RouterLink
      to="/certifications"
      class="inline-flex items-center gap-1.5 font-mono text-[13px] text-gray-500 hover:text-ink"
    >
      <ArrowLeft class="h-4 w-4" :stroke-width="1.8" />
      back to certifications
    </RouterLink>

    <template v-if="reference">
      <header class="mt-6">
        <div class="flex items-center gap-3">
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[16px] font-semibold text-gray-600"
          >
            {{ reference.initials }}
          </div>
          <div class="min-w-0">
            <p class="font-mono text-[12.5px] text-gray-500">reference</p>
            <h1 class="mt-0.5 flex items-center gap-2 text-[2rem] font-semibold leading-tight tracking-tightest md:text-[2.6rem]">
              <UserRound class="h-6 w-6 shrink-0 text-gray-500" :stroke-width="1.6" />
              {{ reference.name }}
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

    <template v-else>
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
