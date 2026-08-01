<script setup lang="ts">
/**
 * Section heading — terminal-style comment label + title + optional blurb.
 */
defineProps<{
  /** Mono comment shown above the title, e.g. "// projects" */
  comment: string
  /** The section title, e.g. "[ Projects ]" */
  title: string
  /** Optional short description under the title. */
  blurb?: string
}>()
</script>

<template>
  <div>
    <p class="terminal-comment text-[13px]">{{ comment }}</p>
    <h2 class="mt-1.5 text-[1.75rem] font-semibold leading-tight tracking-tightest md:text-[2.1rem]">
      {{ title }}
    </h2>
    <p v-if="blurb" class="mt-2 max-w-xl text-[15px] text-gray-500">{{ blurb }}</p>
  </div>
</template>
