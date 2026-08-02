<script setup lang="ts">
/**
 * Projects — filterable grid (All / category / type) served by the Laravel API.
 * When "All" is active, projects are grouped by category (Personal / Academic)
 * with a separator between the two groups. Paginated 9 per page via `?page=`.
 */
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'

import Pagination from '@/components/ui/Pagination.vue'
import ProjectCard from '@/components/project/ProjectCard.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { fetchProjects } from '@/services/api'
import type { Project } from '@/types'

const PROJECTS_PER_PAGE = 9

const filters = [
  { label: 'All', value: '' },
  { label: 'Personal', value: 'personal' },
  { label: 'Academic', value: 'academic' },
] as const

const activeFilter = ref<(typeof filters)[number]['value']>('')
const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const route = useRoute()

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

/** Current page from the `?page=` query. */
const page = computed(() => {
  const raw = Number(route.query.page)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})

/** Projects on the current page — personal group first, then academic. */
const pagedProjects = computed(() => {
  const ordered = activeFilter.value === ''
    ? [...projects.value.filter((p) => p.category === 'personal'), ...projects.value.filter((p) => p.category === 'academic')]
    : projects.value
  const start = (page.value - 1) * PROJECTS_PER_PAGE
  return ordered.slice(start, start + PROJECTS_PER_PAGE)
})

/** Personal slice of the current page (grouped only when "All" is active). */
const personalProjects = computed(() =>
  activeFilter.value === '' ? pagedProjects.value.filter((p) => p.category === 'personal') : [],
)

/** Academic slice of the current page (grouped only when "All" is active). */
const academicProjects = computed(() =>
  activeFilter.value === '' ? pagedProjects.value.filter((p) => p.category === 'academic') : [],
)

/** Single-list projects on the current page (when a specific filter is active). */
const listedProjects = computed(() =>
  activeFilter.value !== '' ? pagedProjects.value : [],
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
        <div v-if="personalProjects.length" class="mt-10">
          <p class="font-mono text-[11px] uppercase tracking-wider text-gray-400">
            personal projects
          </p>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ProjectCard v-for="project in personalProjects" :key="project.slug" :project="project" />
          </div>
        </div>

        <!-- separator line between the two groups -->
        <div v-if="personalProjects.length && academicProjects.length" class="my-10 h-px bg-gray-200" aria-hidden="true" />

        <div v-if="academicProjects.length">
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

      <!-- Pagination (bryllim-exact: ← prev · N / M · next →) -->
      <Pagination :total="projects.length" :page-size="PROJECTS_PER_PAGE" />
    </AsyncState>
  </div>
</template>
