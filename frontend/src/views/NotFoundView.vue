<script setup lang="ts">
/**
 * NotFound — 404 fallback with a terminal-flavored touch.
 */
import { ArrowLeft } from 'lucide-vue-next'
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col items-start px-6 py-24 md:py-32">
    <p class="terminal-comment text-[13px]">$ cat ./404.md</p>
    <h1 class="mt-3 font-pixel text-2xl leading-none">404</h1>
    <p class="mt-2 font-mono text-[13px] text-gray-500">
      // The page you're looking for doesn't exist.
    </p>

    <RouterLink
      to="/"
      class="mt-8 inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 font-mono text-[13px] text-gray-600 hover:border-gray-300 hover:text-ink"
    >
      <ArrowLeft class="h-4 w-4" :stroke-width="1.8" />
      back home
    </RouterLink>
  </div>
</template>
