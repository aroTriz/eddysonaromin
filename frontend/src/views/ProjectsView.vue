<script setup lang="ts">
/**
 * Projects — filterable grid (All / category / type) served by the Laravel API.
 */
import { ref, watchEffect } from 'vue'

import ProjectCard from '@/components/project/ProjectCard.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { fetchProjects } from '@/services/api'
import type { Project } from '@/types'

const filters = [
  { label: 'All', value: '' },
  { label: 'Personal', value: 'personal' },
  { label: 'Academic', value: 'academic' },
] as const

const activeFilter = ref<(typeof filters)[number]['value']>('')
const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    projects.value = await fetchProjects(
      activeFilter.value ? { category: activeFilter.value } : {},
    )
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load projects.'
  } finally {
    loading.value = false
  }
}

watchEffect(() => {
  void load()
})
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
    <!-- ── Header ───────────────────────────────────────────── -->
    <Reveal>
      <p class="terminal-comment text-[13px]">$ ls ./projects/</p>
      <h1 class="mt-2 text-[2.1rem] font-semibold leading-tight tracking-tightest md:text-[3rem]">
        [ Portfolio ]
      </h1>
      <p class="mt-1 font-mono text-[13px] text-gray-400">// Academic and personal projects I've built</p>
    </Reveal>

    <!-- ── Filters ──────────────────────────────────────────── -->
    <Reveal :delay="1" class="mt-8 flex flex-wrap gap-2">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        class="rounded-full border px-4 py-1.5 font-mono text-[12.5px] transition-colors"
        :class="
          activeFilter === filter.value
            ? 'border-ink bg-ink text-bg'
            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-ink'
        "
        @click="activeFilter = filter.value"
      >
        {{ filter.label }}
      </button>
    </Reveal>

    <!-- ── Grid with async states ───────────────────────────── -->
    <AsyncState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && projects.length === 0"
      empty-message="No projects match this filter."
      :on-retry="load"
    >
      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <ProjectCard v-for="project in projects" :key="project.slug" :project="project" />
      </div>
    </AsyncState>
  </div>
</template>
