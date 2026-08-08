<script setup lang="ts">
/**
 * BlogCard — bryllim-style blog card, adapts to list/grid layout:
 *  - list: horizontal (thumb left ~136px, body right, gap 20px)
 *  - grid: vertical (thumb full-width 8:5, body below)
 */
import { computed } from 'vue'

import { useNow } from '@/composables/useNow'
import { editedLabel, readingTime, timeAgo } from '@/utils/format'
import type { BlogPost } from '@/types'

const props = withDefaults(
  defineProps<{
    post: BlogPost
    layout?: 'list' | 'grid'
  }>(),
  { layout: 'list' },
)

const { now } = useNow()

const posted = computed(() => timeAgo(props.post.published_at, now()))
const edited = computed(() => editedLabel(props.post.published_at, props.post.updated_at, now()))
const readTime = computed(() => readingTime(props.post.content))
</script>

<template>
  <RouterLink
    :to="`/blog/${post.slug}`"
    class="post-card group"
    :class="layout === 'grid'
      ? 'flex flex-col'
      : 'flex items-start gap-5 border-t border-gray-200 py-6'"
  >
    <!-- thumbnail (first post image, or gradient placeholder with monogram) -->
    <div
      class="post-thumb relative shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
      :class="layout === 'grid'
        ? 'mb-[0.9rem] aspect-[16/10] w-full'
        : 'h-[92px] w-[136px] flex-none'"
    >
      <img
        v-if="post.images && post.images.length > 0"
        :src="post.images[0]"
        :alt="post.title"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-white">
        <span class="font-pixel text-2xl text-gray-300 transition-colors group-hover:text-gray-400">EA</span>
      </div>
    </div>

    <!-- body -->
    <div class="post-body min-w-0 flex-1 py-1">
      <time class="font-mono text-[11.5px] text-gray-400">{{ posted }}</time>
      <span v-if="edited" class="ml-1.5 font-mono text-[10.5px] text-gray-400">· {{ edited }}</span>
      <h2
        class="post-title mt-1 line-clamp-2 h-[2.75em] font-serif text-[18px] font-semibold leading-snug text-ink transition-colors group-hover:text-gray-500"
      >
        {{ post.title }}
      </h2>
      <!-- Fixed 2-line excerpt block: 1-line and 2-line descriptions occupy
           the same height so every card in the list stays the same size.
           Hidden in grid view (bryllim hides it there). -->
      <p
        v-if="layout !== 'grid'"
        class="post-excerpt mt-1.5 line-clamp-2 h-[3.25em] text-[14px] leading-relaxed text-gray-500"
      >
        {{ post.excerpt }}
      </p>
      <div class="mt-2.5 flex items-center gap-2 font-mono text-[11px] text-gray-400">
        <span class="group-hover:text-ink">Read</span>
        <span class="text-gray-300" aria-hidden="true">·</span>
        <span>{{ readTime }}</span>
      </div>
    </div>
  </RouterLink>
</template>
