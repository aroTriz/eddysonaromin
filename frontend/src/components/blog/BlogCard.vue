<script setup lang="ts">
/**
 * BlogCard — used in the blog index. Links to the slug-based post page.
 */
import { ArrowUpRight, CalendarDays } from 'lucide-vue-next'

import type { BlogPost } from '@/types'
import TechTag from '@/components/ui/TechTag.vue'

defineProps<{
  post: BlogPost
}>()

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <RouterLink
    :to="`/blog/${post.slug}`"
    class="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300"
  >
    <div class="flex items-center gap-2 font-mono text-[12px] text-gray-500">
      <CalendarDays class="h-3.5 w-3.5" :stroke-width="1.6" />
      {{ formatDate(post.published_at) }}
    </div>

    <h3 class="text-[17px] font-semibold leading-snug tracking-tight text-ink">
      {{ post.title }}
    </h3>
    <p class="line-clamp-3 text-[13.5px] leading-relaxed text-gray-500">
      {{ post.excerpt }}
    </p>

    <div class="mt-auto flex flex-wrap gap-1.5 pt-1">
      <TechTag v-for="tag in post.tags?.slice(0, 3)" :key="tag" :label="tag" />
    </div>

    <span
      class="mt-1 inline-flex items-center gap-1 font-mono text-[12px] text-gray-500 transition-colors group-hover:text-ink"
    >
      read post
      <ArrowUpRight class="h-3.5 w-3.5" :stroke-width="1.8" />
    </span>
  </RouterLink>
</template>
