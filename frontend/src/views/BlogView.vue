<script setup lang="ts">
/**
 * Blog — index of published posts served by the Laravel API.
 * Bryllim-style: pixel "blog" header + description + list/grid view toggle.
 * Paginated 9 per page via the `?page=` query (bryllim-exact pager).
 */
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import BlogCard from '@/components/blog/BlogCard.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import Pagination from '@/components/ui/Pagination.vue'
import { fetchBlogPosts } from '@/services/api'
import type { BlogPost } from '@/types'

const POSTS_PER_PAGE = 9

const posts = ref<BlogPost[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const view = ref<'list' | 'grid'>('list')

const route = useRoute()

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    posts.value = await fetchBlogPosts()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load posts.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** Posts on the current page (page from the `?page=` query). */
const pagedPosts = computed(() => {
  const raw = Number(route.query.page)
  const page = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
  const start = (page - 1) * POSTS_PER_PAGE
  return posts.value.slice(start, start + POSTS_PER_PAGE)
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-14 sm:py-20">
    <!-- Header (bryllim-style with view toggle) -->
    <header class="mb-10 flex items-start justify-between gap-4">
      <div>
        <p class="terminal-comment mb-3 text-[13px]">$ ls ./blog/</p>
        <h1 class="font-pixel text-2xl leading-none">blog</h1>
        <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-gray-600">
          Notes on building, learning & shipping.
        </p>
      </div>

      <div class="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-gray-200 p-0.5">
        <button
          type="button"
          class="rounded-md p-1.5 transition"
          :class="view === 'list' ? 'text-ink' : 'text-gray-400 hover:text-ink'"
          title="List view"
          aria-label="List view"
          @click="view = 'list'"
        >
          <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4">
            <path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            <circle cx="4" cy="6" r="1.1" fill="currentColor" />
            <circle cx="4" cy="12" r="1.1" fill="currentColor" />
            <circle cx="4" cy="18" r="1.1" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-md p-1.5 transition"
          :class="view === 'grid' ? 'text-ink' : 'text-gray-400 hover:text-ink'"
          title="Grid view"
          aria-label="Grid view"
          @click="view = 'grid'"
        >
          <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4">
            <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6" />
          </svg>
        </button>
      </div>
    </header>

    <AsyncState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && posts.length === 0"
      empty-message="No posts published yet."
      :on-retry="load"
    >
      <!-- List view: stacked horizontal cards (bryllim-style) -->
      <div v-if="view === 'list'" class="flex flex-col gap-6">
        <BlogCard v-for="post in pagedPosts" :key="post.slug" :post="post" layout="list" />
      </div>

      <!-- Grid view: 3 columns (bryllim-style) -->
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BlogCard v-for="post in pagedPosts" :key="post.slug" :post="post" layout="grid" />
      </div>

      <!-- Pagination (bryllim-exact: ← prev · N / M · next →) -->
      <Pagination :total="posts.length" :page-size="POSTS_PER_PAGE" />
    </AsyncState>
  </div>
</template>
