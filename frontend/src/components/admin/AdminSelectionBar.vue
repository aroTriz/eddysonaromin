<script setup lang="ts">
/**
 * AdminSelectionBar — the single CMS bulk-action bar (desktop-first).
 * Selected count + "Delete selected" + close. Shown while rows are selected.
 */
import { Trash2, X } from 'lucide-vue-next'

defineProps<{
  /** Number of selected rows. */
  count: number
}>()

const emit = defineEmits<{
  (e: 'delete-selected'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div
    class="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5"
  >
    <p class="font-mono text-[12px] font-semibold text-gray-600">{{ count }} selected</p>
    <button
      type="button"
      class="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 font-mono text-[11.5px] font-semibold text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
      @click="emit('delete-selected')"
    >
      <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
      Delete selected
    </button>
    <button
      type="button"
      class="ml-auto rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink"
      aria-label="Cancel selection"
      @click="emit('close')"
    >
      <X class="h-4 w-4" :stroke-width="1.7" />
    </button>
  </div>
</template>
