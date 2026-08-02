<script setup lang="ts">
/**
 * BlogCard — bryllim-style single-column blog card:
 * thumbnail + mono date + serif title + 2-line excerpt + Read · N min.
 */
import { computed } from 'vue'

import type { BlogPost } from '@/types'

const props = defineProps<{
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

const readingTime = computed(() => {
  const words = props.post.content.split(/\s+/).length
  return `${Math.max(1, Math.round(words / 200))} min`
})
</script>

<template>
  <RouterLink
    :to="`/blog/${post.slug}`"
    class="post-card group flex flex-col gap-4 sm:flex-row"
  >
    <!-- thumbnail (gradient placeholder with monogram — no images needed) -->
    <div class="post-thumb relative shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 sm:w-44">
      <div
        class="flex h-36 w-full items-center justify-center bg-gradient-to-br from-gray-100 to-white sm:h-full"
      >
        <span class="font-pixel text-2xl text-gray-300 transition-colors group-hover:text-gray-400">
          EA
        </span>
      </div>
    </div>

    <!-- body -->
    <div class="post-body min-w-0 flex-1 py-1">
      <time class="font-mono text-[11.5px] text-gray-400">{{ formatDate(post.published_at) }}</time>
      <h2 class="mt-1 font-serif text-[18px] font-semibold leading-snug text-ink transition-colors group-hover:text-gray-500">
        {{ post.title }}
      </h2>
      <p class="post-excerpt mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-gray-500">
        {{ post.excerpt }}
      </p>
      <div class="mt-2.5 flex items-center gap-2 font-mono text-[11px] text-gray-400">
        <span class="group-hover:text-ink">Read</span>
        <span class="text-gray-300" aria-hidden="true">·</span>
        <span>{{ readingTime }}</span>
      </div>
    </div>
  </RouterLink>
</template>
