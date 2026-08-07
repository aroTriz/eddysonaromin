<script setup lang="ts">
/**
 * CertificationDetail — slug-driven credential page. Looks up the certification
 * from local profile data by slug; shows a not-found state for unknown slugs.
 */
import { ArrowLeft, Award, CalendarDays, GraduationCap } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { certifications } from '@/data/profile'

const route = useRoute()

const cert = computed(() =>
  certifications.find((c) => c.slug === route.params.slug),
)

const categoryLabel = computed(() =>
  cert.value?.category === 'degree' ? 'degree' : 'certification',
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

    <template v-if="cert">
      <header class="mt-6">
        <div class="flex flex-wrap items-center gap-2 font-mono text-[12.5px] text-gray-500">
          <span class="inline-flex items-center gap-1.5">
            <Award class="h-3.5 w-3.5" :stroke-width="1.6" />
            {{ categoryLabel }}
          </span>
          <span aria-hidden="true">·</span>
          <span class="inline-flex items-center gap-1.5">
            <CalendarDays class="h-3.5 w-3.5" :stroke-width="1.6" />
            {{ cert.year }}
          </span>
        </div>

        <h1 class="mt-3 text-[2rem] font-semibold leading-tight tracking-tightest md:text-[2.8rem]">
          {{ cert.title }}
        </h1>

        <p class="mt-4 font-mono text-[14px] text-gray-500">{{ cert.issuer }}</p>
      </header>

      <dl class="mt-8 rounded-xl border border-gray-200 bg-white p-5">
        <dt class="font-mono text-[11.5px] uppercase tracking-wide text-gray-500">
          <span class="inline-flex items-center gap-1.5">
            <GraduationCap class="h-3.5 w-3.5" :stroke-width="1.6" />
            issuer
          </span>
        </dt>
        <dd class="mt-1 text-[14px] text-ink">{{ cert.issuer }}</dd>
      </dl>

      <section class="mt-8">
        <h2 class="font-mono text-[12.5px] uppercase tracking-wide text-gray-500">about</h2>
        <p class="mt-3 text-[15.5px] leading-relaxed text-gray-600">{{ cert.summary }}</p>
      </section>
    </template>

    <template v-else>
      <div class="mt-16 text-center">
        <p class="font-mono text-[13px] text-gray-500">credential not found.</p>
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
