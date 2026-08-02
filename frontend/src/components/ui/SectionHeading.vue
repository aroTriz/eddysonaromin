<script setup lang="ts">
/**
 * SectionHeading — bryllim-style section header:
 * mono comment label + font-pixel lowercase title + optional blurb.
 * Brackets in the title are stripped (kept for callers' convenience).
 */
import { computed } from 'vue'

const props = defineProps<{
  /** Mono comment shown above the title, e.g. "// projects" */
  comment: string
  /** The section title — "[ Projects ]" renders as "projects". */
  title: string
  /** Optional short description under the title. */
  blurb?: string
}>()

const cleanTitle = computed(() => props.title.replace(/\[|\]/g, '').trim())
</script>

<template>
  <div>
    <p class="terminal-comment text-[13px]">{{ comment }}</p>
    <h2 class="mt-1.5 font-pixel text-2xl leading-none">{{ cleanTitle }}</h2>
    <p v-if="blurb" class="mt-3 max-w-xl text-[15px] leading-relaxed text-gray-600">{{ blurb }}</p>
  </div>
</template>
