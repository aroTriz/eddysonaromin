<script setup lang="ts">
/**
 * ProjectDeck — bryllim-style spotlight card deck for PERSONAL projects.
 * Three cards fanned (center / left / right); clicking a side card
 * swaps it to the center with a smooth spring transition.
 */
import { ArrowUpRight, Folder } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { fetchProjects } from '@/services/api'
import type { Project } from '@/types'
import { projectTypeLabel } from '@/utils/format'

const router = useRouter()

const projects = ref<Project[]>([])
const order = ref<number[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const all = await fetchProjects({ category: 'personal' })
    projects.value = all
    order.value = all.map((_, i) => i)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load projects.'
  } finally {
    loading.value = false
  }
})

/** Center card is always order[1] (middle of the 3 visible). */
function slotClass(index: number): string {
  if (order.value.length < 3) return 'is-center'
  if (index === 1) return 'is-center'
  if (index === 0) return 'is-left'
  return 'is-right'
}

function activate(index: number): void {
  if (index === 1) return // already center
  if (order.value.length < 3) return

  const current = [...order.value]
  if (index === 0) {
    // rotate right → bring left card to center
    const last = current.pop()
    if (last !== undefined) current.unshift(last)
  } else {
    // rotate left → bring right card to center
    const first = current.shift()
    if (first !== undefined) current.push(first)
  }
  order.value = current
}

/** Center card → navigate to the project's slug detail page. */
function openProject(index: number): void {
  if (slotClass(index) !== 'is-center') {
    activate(index)
    return
  }
  const project = projects.value[order.value[index]]
  if (project) {
    void router.push(`/projects/${project.slug}`)
  }
}
</script>

<template>
  <div
    v-if="loading"
    class="animate-blink py-16 text-center font-mono text-[13px] text-gray-400"
    aria-busy="true"
  >
    loading...
  </div>

  <div v-else-if="error" class="py-16 text-center font-mono text-[13px] text-gray-500">
    {{ error }}
  </div>

  <div v-else-if="projects.length" class="deck" data-deck>
    <article
      v-for="(idx, i) in order"
      :key="projects[idx].slug"
      class="deck-card rounded-2xl border border-gray-200 bg-white p-5"
      :class="slotClass(i)"
      role="button"
      tabindex="0"
      :aria-label="`Show ${projects[idx].title}`"
      @click="openProject(i)"
      @keydown.enter="openProject(i)"
      @keydown.space.prevent="openProject(i)"
    >
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white">
          {{ projectTypeLabel(projects[idx].type) }}
        </span>
      </div>

      <div class="mt-4 flex items-center gap-3.5">
        <div
          v-if="projects[idx].favicon_url"
          class="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <img
            :src="projects[idx].favicon_url"
            :alt="`${projects[idx].title} icon`"
            class="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div
          v-else
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-400"
        >
          <Folder class="h-5 w-5" :stroke-width="1.5" />
        </div>
        <h3 class="font-pixel text-base leading-tight text-ink">{{ projects[idx].title }}</h3>
      </div>

      <p class="mt-3 line-clamp-3 text-[13px] leading-relaxed text-gray-600">
        {{ projects[idx].tagline ?? projects[idx].summary }}
      </p>

      <div class="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <span class="font-mono text-[9px] uppercase tracking-wider text-gray-400">
          {{ projects[idx].year }}
        </span>
        <span
          class="inline-flex items-center gap-1 font-mono text-[10px] text-gray-500 group-hover:text-ink"
        >
          view
          <ArrowUpRight class="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" :stroke-width="2" />
        </span>
      </div>
    </article>
  </div>
</template>
