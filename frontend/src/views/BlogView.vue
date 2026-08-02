<script setup lang="ts">
/**
 * Blog — index of published posts served by the Laravel API.
 */
import { ref, onMounted } from 'vue'

import BlogCard from '@/components/blog/BlogCard.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { fetchBlogPosts } from '@/services/api'
import type { BlogPost } from '@/types'

const posts = ref<BlogPost[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

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
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
    <PageHeader
      comment="$ ls ./blog/"
      title="blog"
      description="Notes on building, learning & shipping."
    />

    <AsyncState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && posts.length === 0"
      empty-message="No posts published yet."
      :on-retry="load"
    >
      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <BlogCard v-for="post in posts" :key="post.slug" :post="post" />
      </div>
    </AsyncState>
  </div>
</template>
