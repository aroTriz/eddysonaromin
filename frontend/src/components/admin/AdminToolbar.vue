<script setup lang="ts">
/**
 * AdminToolbar — the single CMS list toolbar (desktop-first).
 * Count label + archived toggle + bulk-selection toggle.
 * Extracted verbatim from the CMS views so every /aromin list matches.
 */
import { Trash2, X } from 'lucide-vue-next'

defineProps<{
  /** Plural noun for the active list, e.g. "certifications". */
  noun: string
  /** Number of items currently loaded. */
  count: number
  /** True while viewing the archived list. */
  showArchived: boolean
  /** True while bulk-selection mode is on. */
  selectionMode: boolean
  /** True when every visible row is selected. */
  allSelected: boolean
  /** True when some (not all) visible rows are selected. */
  someSelected: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-archived'): void
  (e: 'enter-selection'): void
  (e: 'exit-selection'): void
  (e: 'toggle-select-all'): void
}>()
</script>

<template>
  <div class="mb-4 flex flex-wrap items-center gap-3">
    <template v-if="selectionMode">
      <label
        class="flex cursor-pointer select-none items-center gap-2"
        :title="allSelected ? 'Deselect all' : `Select all ${noun}`"
      >
        <input
          type="checkbox"
          class="h-4 w-4 cursor-pointer accent-ink"
          :checked="allSelected"
          :indeterminate.prop="someSelected"
          @change="emit('toggle-select-all')"
        />
        <span class="font-mono text-[11px] text-gray-500">Select all</span>
      </label>
    </template>
    <p class="font-mono text-[11px] text-gray-500">
      // {{ showArchived ? 'archived' : noun }} ({{ count }})
    </p>
    <!-- Per-view filters (e.g. the blog drafts toggle) — nothing by default. -->
    <slot name="filters" />
    <div class="ml-auto flex flex-wrap items-center gap-2">
      <!-- Per-view action controls (e.g. type/category filters, sort) — nothing by default. -->
      <slot name="actions" />
      <button
        type="button"
        class="min-h-[44px] rounded-md border border-gray-200 px-2.5 py-2 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
        @click="emit('toggle-archived')"
      >
        {{ showArchived ? 'Show active' : 'Show archived' }}
      </button>
      <button
        v-if="!selectionMode"
        type="button"
        class="rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink"
        :aria-label="`Select ${noun} to delete`"
        :title="`Delete ${noun}`"
        @click="emit('enter-selection')"
      >
        <Trash2 class="h-4 w-4" :stroke-width="1.7" />
      </button>
      <button
        v-else
        type="button"
        class="rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink"
        aria-label="Cancel selection"
        @click="emit('exit-selection')"
      >
        <X class="h-4 w-4" :stroke-width="1.7" />
      </button>
    </div>
  </div>
</template>
