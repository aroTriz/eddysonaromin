<script setup lang="ts">
/**
 * ProjectDetail — slug-driven project page. Fetches by slug from the API,
 * handles loading / error / not-found states.
 */
import { ArrowLeft, CalendarDays, ExternalLink, Folder } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import AsyncState from '@/components/ui/AsyncState.vue'
import TechTag from '@/components/ui/TechTag.vue'
import { fetchProject } from '@/services/api'
import type { Project } from '@/types'
import { projectTypeLabel } from '@/utils/format'

const route = useRoute()
const project = ref<Project | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    project.value = await fetchProject(route.params.slug as string)
  } catch (err) {
    error.value =
      err instanceof Error && err.message.includes('404')
        ? 'Project not found.'
        : 'Failed to load this project.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await load()
  if (project.value) {
    document.title = `${project.value.title} — Eddyson Aromin`
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
    <RouterLink
      to="/projects"
      class="inline-flex items-center gap-1.5 font-mono text-[13px] text-gray-500 hover:text-ink"
    >
      <ArrowLeft class="h-4 w-4" :stroke-width="1.8" />
      back to projects
    </RouterLink>

    <AsyncState :loading="loading" :error="error" :on-retry="load">
      <template v-if="project">
        <header class="mt-6">
          <div class="flex flex-wrap items-center gap-2 font-mono text-[12.5px] text-gray-500">
            <span class="inline-flex items-center gap-1.5">
              <Folder class="h-3.5 w-3.5" :stroke-width="1.6" />
              {{ project.category }}
            </span>
            <span aria-hidden="true">·</span>
            <span>{{ projectTypeLabel(project.type) }}</span>
            <template v-if="project.year">
              <span aria-hidden="true">·</span>
              <span class="inline-flex items-center gap-1.5">
                <CalendarDays class="h-3.5 w-3.5" :stroke-width="1.6" />
                {{ project.year }}
              </span>
            </template>
          </div>

          <h1 class="mt-3 text-[2rem] font-semibold leading-tight tracking-tightest md:text-[2.8rem]">
            {{ project.title }}
          </h1>

          <div class="mt-4 flex flex-wrap items-center gap-3">
            <a
              v-if="project.url"
              :href="project.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-mono text-[12.5px] text-bg hover:opacity-80"
            >
              view live
              <ExternalLink class="h-3.5 w-3.5" :stroke-width="1.8" />
            </a>
          </div>
        </header>

        <!-- Project snapshot image -->
        <figure class="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <img
            v-if="project.image_url"
            :src="project.image_url"
            :alt="`${project.title} snapshot`"
            class="aspect-video w-full object-cover"
            loading="lazy"
          />
          <div
            v-else
            class="flex aspect-video w-full items-center justify-center bg-gray-50"
            aria-hidden="true"
          >
            <Folder class="h-10 w-10 text-gray-300" :stroke-width="1.2" />
          </div>
        </figure>

        <section class="mt-10">
          <p class="text-[15.5px] leading-relaxed text-gray-600 md:text-[16px]">
            {{ project.summary }}
          </p>
          <p
            v-if="project.description"
            class="mt-4 text-[14.5px] leading-relaxed text-gray-500"
          >
            {{ project.description }}
          </p>
        </section>

        <dl v-if="project.role" class="mt-8 rounded-xl border border-gray-200 bg-white p-5">
          <dt class="font-mono text-[11.5px] uppercase tracking-wide text-gray-500">role</dt>
          <dd class="mt-1 text-[14px] text-ink">{{ project.role }}</dd>
        </dl>

        <section class="mt-8">
          <h2 class="font-mono text-[12.5px] uppercase tracking-wide text-gray-500">technologies</h2>
          <div class="mt-3 flex flex-wrap gap-2">
            <TechTag v-for="tech in project.technologies" :key="tech" :label="tech" />
          </div>
        </section>
      </template>
    </AsyncState>
  </div>
</template>
