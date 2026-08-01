<script setup lang="ts">
/**
 * TechTag — small mono pill used for project technologies and tags.
 */
defineProps<{
  label: string
}>()
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-gray-100/50"
  >
    {{ label }}
  </span>
</template>
