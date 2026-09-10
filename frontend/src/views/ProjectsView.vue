<script setup lang="ts">
/**
 * Projects - filterable grid (All / category / type) served by the Laravel API.
 * When "All" is active, projects are grouped by category (Professional / Personal / Academic)
 * each with its OWN independent pagination - 4 per category per page (4 cols x 1 row).
 * Pagination is shown only if that category exceeds 4 items; otherwise hidden.
 * When a specific filter is active, a single flat list is paginated at 4/page.
 */
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'

import Pagination from '@/components/ui/Pagination.vue'
import ProjectCard from '@/components/project/ProjectCard.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { fetchProjects } from '@/services/api'
import type { Project } from '@/types'

/** Items per category per page - 4 before pagination. */
const PROJECTS_PER_PAGE = 4

const filters = [
  { label: 'All', value: '' },
  { label: 'Professional', value: 'professional' },
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

/** Current page for single-filter view from `?page=` */
const page = computed(() => {
  const raw = Number(route.query.page)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})

/** Per-category pages for "All" view - each independent via its own query param */
const pageProfessional = computed(() => {
  const raw = Number(route.query.page_professional)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})
const pagePersonal = computed(() => {
  const raw = Number(route.query.page_personal)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})
const pageAcademic = computed(() => {
  const raw = Number(route.query.page_academic)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})

/** All professional projects (unpaginated). */
const professionalAll = computed(() =>
  projects.value.filter((p) => p.category === 'professional'),
)

/** All personal projects (unpaginated). */
const personalAll = computed(() =>
  projects.value.filter((p) => p.category === 'personal'),
)

/** All academic projects (unpaginated). */
const academicAll = computed(() =>
  projects.value.filter((p) => p.category === 'academic'),
)

/** Professional projects on the current page (4 per page, clamped). */
const professionalProjects = computed(() => {
  const totalPages = Math.max(1, Math.ceil(professionalAll.value.length / PROJECTS_PER_PAGE))
  const current = Math.min(pageProfessional.value, totalPages)
  const start = (current - 1) * PROJECTS_PER_PAGE
  return professionalAll.value.slice(start, start + PROJECTS_PER_PAGE)
})

/** Personal projects on the current page (4 per page, clamped). */
const personalProjects = computed(() => {
  const totalPages = Math.max(1, Math.ceil(personalAll.value.length / PROJECTS_PER_PAGE))
  const current = Math.min(pagePersonal.value, totalPages)
  const start = (current - 1) * PROJECTS_PER_PAGE
  return personalAll.value.slice(start, start + PROJECTS_PER_PAGE)
})

/** Academic projects on the current page (4 per page, clamped). */
const academicProjects = computed(() => {
  const totalPages = Math.max(1, Math.ceil(academicAll.value.length / PROJECTS_PER_PAGE))
  const current = Math.min(pageAcademic.value, totalPages)
  const start = (current - 1) * PROJECTS_PER_PAGE
  return academicAll.value.slice(start, start + PROJECTS_PER_PAGE)
})

/** Single-list projects on the current page (when a specific filter is active). */
const listedProjects = computed(() => {
  if (activeFilter.value === '') return []
  const totalPages = Math.max(1, Math.ceil(projects.value.length / PROJECTS_PER_PAGE))
  const current = Math.min(page.value, totalPages)
  const start = (current - 1) * PROJECTS_PER_PAGE
  return projects.value.slice(start, start + PROJECTS_PER_PAGE)
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12 md:py-16">
    <Reveal>
      <p class="terminal-comment text-[13px]">$ ls ./projects/</p>
      <h1 class="mt-3 font-pixel text-2xl leading-none">projects</h1>
      <p class="mt-12 max-w-xl text-[15px] leading-relaxed text-gray-600">
        Professional, personal, and academic projects I've designed and built — spanning web apps,
        mobile, games, AI tools, and more.
      </p>
    </Reveal>

    <Reveal :delay="1" class="mt-8 flex flex-wrap gap-2">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        class="rounded-md border px-4 py-2 min-h-[44px] font-mono text-[12.5px] shadow-sm transition-colors"
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

    <AsyncState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && projects.length === 0"
      empty-message="No projects match this filter."
      :on-retry="load"
    >
      <template v-if="activeFilter === ''">
        <div v-if="professionalAll.length" class="mt-10">
          <p class="font-mono text-[11px] uppercase tracking-wider text-gray-400">
            professional projects
          </p>
          <div class="mt-4 grid gap-4 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ProjectCard v-for="project in professionalProjects" :key="project.slug" :project="project" />
          </div>
          <Pagination :total="professionalAll.length" :page-size="PROJECTS_PER_PAGE" param="page_professional" />
        </div>

        <div v-if="professionalAll.length && personalAll.length" class="my-10 h-px bg-gray-200" aria-hidden="true" />

        <div v-if="personalAll.length" class="mt-10">
          <p class="font-mono text-[11px] uppercase tracking-wider text-gray-400">
            personal projects
          </p>
          <div class="mt-4 grid gap-4 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ProjectCard v-for="project in personalProjects" :key="project.slug" :project="project" />
          </div>
          <Pagination :total="personalAll.length" :page-size="PROJECTS_PER_PAGE" param="page_personal" />
        </div>

        <div v-if="personalAll.length && academicAll.length" class="my-10 h-px bg-gray-200" aria-hidden="true" />

        <div v-if="academicAll.length" class="mt-10">
          <p class="font-mono text-[11px] uppercase tracking-wider text-gray-400">
            academic projects
          </p>
          <div class="mt-4 grid gap-4 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ProjectCard v-for="project in academicProjects" :key="project.slug" :project="project" />
          </div>
          <Pagination :total="academicAll.length" :page-size="PROJECTS_PER_PAGE" param="page_academic" />
        </div>
      </template>

      <template v-else>
        <div class="mt-8 grid gap-4 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ProjectCard v-for="project in listedProjects" :key="project.slug" :project="project" />
        </div>
        <Pagination :total="projects.length" :page-size="PROJECTS_PER_PAGE" />
      </template>
    </AsyncState>
  </div>
</template>
