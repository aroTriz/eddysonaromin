<script setup lang="ts">
/**
 * PageHeader — bryllim-style subpage header:
 * terminal comment + font-pixel lowercase title + Geist description.
 */
defineProps<{
  /** Mono comment above the title — omit to hide the line entirely. */
  comment?: string
  title: string
  description: string
}>()
</script>

<template>
  <header class="mb-12">
    <p v-if="comment" class="terminal-comment mb-3 text-[13px]">{{ comment }}</p>
    <h1 class="font-pixel text-2xl leading-none">{{ title }}</h1>
  </header>

  <p class="reveal mb-12 max-w-xl text-[15px] leading-relaxed text-gray-600">
    {{ description }}
  </p>
</template>
