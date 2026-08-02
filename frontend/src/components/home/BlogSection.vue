<script setup lang="ts">
/**
 * BlogSection — bryllim-style blog list on the home page
 * (01 — blog): divided rows of recent posts with date.
 */
import { onMounted, ref } from 'vue'

import { fetchBlogPosts } from '@/services/api'
import type { BlogPost } from '@/types'

const posts = ref<BlogPost[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    posts.value = (await fetchBlogPosts()).slice(0, 3)
  } catch {
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
  <div v-if="loading" class="py-8 text-center font-mono text-[13px] text-gray-400">
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
