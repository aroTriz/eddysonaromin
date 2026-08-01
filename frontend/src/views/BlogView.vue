<script setup lang="ts">
/**
 * Blog — index of published posts served by the Laravel API.
 */
import { ref, onMounted } from 'vue'

import BlogCard from '@/components/blog/BlogCard.vue'
import AsyncState from '@/components/ui/AsyncState.vue'
import Reveal from '@/components/ui/Reveal.vue'
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
  <div class="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
    <Reveal>
      <p class="terminal-comment text-[13px]">$ ls ./blog/</p>
      <h1 class="mt-2 text-[2.1rem] font-semibold leading-tight tracking-tightest md:text-[3rem]">
        [ Blog ]
      </h1>
      <p class="mt-1 font-mono text-[13px] text-gray-500">// Notes on building, learning &amp; shipping</p>
    </Reveal>

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
