<script setup lang="ts">
/**
 * CertificationDetail - slug-driven credential page. Fetches from the
 * certifications CMS (/api/v1/certifications/:slug) with a static fallback.
 */
import { ArrowLeft, Award, CalendarDays, GraduationCap, LoaderCircle } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { certifications as fallbackCerts } from '@/data/profile'
import { fetchCertification } from '@/services/api'
import type { Certification } from '@/types'

const route = useRoute()

const cert = ref<Certification | null>(null)
const loading = ref(true)
const notFound = ref(false)

const categoryLabel = ref('certification')

async function load(): Promise<void> {
  const slug = String(route.params.slug ?? '')
  loading.value = true
  notFound.value = false
  try {
    const data = await fetchCertification(slug)
    cert.value = data
    categoryLabel.value = data.category === 'degree' ? 'degree' : 'certification'
    document.title = `${data.title} - Eddyson Aromin`
  } catch {
    const local = fallbackCerts.find((c) => c.slug === slug) as unknown as Certification | undefined
    if (local) {
      cert.value = local
      categoryLabel.value = local.category === 'degree' ? 'degree' : 'certification'
      document.title = `${local.title} - Eddyson Aromin`
    } else {
      notFound.value = true
      document.title = 'Credential - Eddyson Aromin'
    }
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

    <template v-else-if="cert">
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

    <template v-else-if="notFound">
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
