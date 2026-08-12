<script setup lang="ts">
/**
 * ProjectCard — used in project grids. Links to the slug-based detail page.
 * Tech tags live on the slug page only (see ProjectDetailView).
 */
import { ArrowUpRight, ExternalLink, Folder } from 'lucide-vue-next'

import type { Project } from '@/types'
import { projectTypeLabel } from '@/utils/format'

defineProps<{
  project: Project
}>()
</script>

<template>
  <RouterLink
    :to="`/projects/${project.slug}`"
    class="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2 font-mono text-[12px] text-gray-500">
        <img
          v-if="project.favicon_url"
          :src="project.favicon_url"
          :alt="`${project.title} icon`"
          class="h-5 w-5 shrink-0 rounded-md border border-gray-200 bg-white object-cover"
          loading="lazy"
        />
        <Folder v-else class="h-3.5 w-3.5" :stroke-width="1.6" />
        {{ project.category }}
      </div>
      <span
        v-if="project.url"
        class="text-gray-500 transition-colors group-hover:text-ink"
        :title="`Open ${project.title} live`"
      >
        <ExternalLink class="h-4 w-4" :stroke-width="1.6" />
      </span>
    </div>

    <div>
      <h3 class="flex items-center gap-1.5 text-[17px] font-semibold tracking-tight text-ink">
        {{ project.title }}
        <span class="font-mono text-[12px] font-normal text-gray-500">
          // {{ projectTypeLabel(project.type) }}
        </span>
      </h3>
      <p class="mt-1.5 line-clamp-3 text-[13.5px] leading-relaxed text-gray-500">
        {{ project.summary }}
      </p>
    </div>

    <span
      class="mt-auto inline-flex items-center gap-1 font-mono text-[12px] text-gray-500 transition-colors group-hover:text-ink"
    >
      view project
      <ArrowUpRight class="h-3.5 w-3.5" :stroke-width="1.8" />
    </span>
  </RouterLink>
</template>
