<script setup lang="ts">
/**
 * BlogSection — bryllim-style blog list on the home page
 * (dynamic number — blog): divided rows of recent posts with date.
 * Accepts optional `posts` prop so parent (HomeView) can control
 * visibility + numbering and avoid duplicate fetches. Falls back to
 * fetching when no prop is provided (standalone use).
 */
import { onMounted, ref, watch } from 'vue'

import { fetchBlogPosts } from '@/services/api'
import type { BlogPost } from '@/types'

const props = defineProps<{ posts?: BlogPost[] }>()

const internalPosts = ref<BlogPost[]>([])
const loading = ref(true)

// When parent passes posts, use them directly (reactive, no fetch).
// Otherwise fetch internally for standalone usage.
watch(
  () => props.posts,
  (val) => {
    if (val !== undefined) {
      internalPosts.value = val.slice(0, 3)
      loading.value = false
    }
  },
  { immediate: true },
)

const posts = ref<BlogPost[]>([])
// posts is the rendered list — either from prop or internal fetch
// We keep `posts` as the unified source for the template.
watch(
  [internalPosts, () => props.posts],
  () => {
    if (props.posts !== undefined) posts.value = props.posts.slice(0, 3)
    else posts.value = internalPosts.value
  },
  { immediate: true },
)

onMounted(async () => {
  if (props.posts !== undefined) return
  try {
    internalPosts.value = (await fetchBlogPosts()).slice(0, 3)
    posts.value = internalPosts.value
  } catch {
    internalPosts.value = []
    posts.value = []
  } finally {
    loading.value = false
  }
})

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}
</script>

<template>
  <div
    v-if="loading"
    class="animate-blink py-8 text-center font-mono text-[13px] text-gray-400"
    aria-busy="true"
  >
    loading...
  </div>

  <div v-else-if="posts.length" class="divide-y divide-gray-200 border-y border-gray-200">
    <RouterLink
      v-for="post in posts"
      :key="post.slug"
      :to="`/blog/${post.slug}`"
      class="group flex items-baseline justify-between gap-6 py-5 hover:bg-gray-50/80"
    >
      <div class="min-w-0">
        <h3 class="truncate text-[15px] font-medium text-ink group-hover:text-gray-500">
          {{ post.title }}
        </h3>
        <p v-if="post.excerpt" class="mt-1 truncate text-sm text-gray-500">
          {{ post.excerpt }}
        </p>
      </div>
      <time class="shrink-0 font-mono text-[12px] text-gray-400">
        {{ formatDate(post.published_at) }}
      </time>
    </RouterLink>
  </div>
</template>
