<script setup lang="ts">
/**
 * Projects — filterable grid (All / category / type) served by the Laravel API.
 * When "All" is active, projects are grouped by category (Personal / Academic)
 * with a separator between the two groups.
 */
import { computed, ref, watchEffect } from 'vue'

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

/** Personal projects (grouped only when "All" is active). */
const personalProjects = computed(() =>
  activeFilter.value === '' ? projects.value.filter((p) => p.category === 'personal') : [],
)

/** Academic projects (grouped only when "All" is active). */
const academicProjects = computed(() =>
  activeFilter.value === '' ? projects.value.filter((p) => p.category === 'academic') : [],
)

/** Single-list projects (when a specific filter is active). */
const listedProjects = computed(() =>
  activeFilter.value !== '' ? projects.value : [],
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
    <!-- ── Header (bryllim-style) ────────────────────────────── -->
    <Reveal>
      <p class="terminal-comment text-[13px]">$ ls ./projects/</p>
      <h1 class="mt-3 font-pixel text-2xl leading-none">projects</h1>
      <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-gray-600">
        Academic and personal projects I've designed and built — spanning web apps,
        mobile, games, AI tools, and more.
      </p>
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
      <!-- All → grouped with separator -->
      <template v-if="activeFilter === ''">
        <div class="mt-10">
          <p class="font-mono text-[11px] uppercase tracking-wider text-gray-400">
            personal projects
          </p>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ProjectCard v-for="project in personalProjects" :key="project.slug" :project="project" />
          </div>
        </div>

        <!-- separator line between the two groups -->
        <div class="my-10 h-px bg-gray-200" aria-hidden="true" />

        <div>
          <p class="font-mono text-[11px] uppercase tracking-wider text-gray-400">
            academic projects
          </p>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ProjectCard v-for="project in academicProjects" :key="project.slug" :project="project" />
          </div>
        </div>
      </template>

      <!-- Specific filter → flat grid -->
      <div v-else class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <ProjectCard v-for="project in listedProjects" :key="project.slug" :project="project" />
      </div>
    </AsyncState>
  </div>
</template>
