<script setup lang="ts">
/**
 * AdminListState — the single CMS loading / empty renderer (desktop-first).
 * Skeleton blocks while loading, dashed empty card otherwise.
 * Success content comes from the default slot.
 */
defineProps<{
  /** True while the list is loading. */
  loading: boolean
  /** True when the loaded list is empty. */
  empty: boolean
  /** Empty message, e.g. "No certifications yet. Add your first one above!" */
  emptyMessage: string
  /** Empty message while viewing the archived list. */
  archivedEmptyMessage?: string
  /** True while viewing the archived list. */
  showArchived?: boolean
  /** Skeleton block height (blog rows are shorter: pass "h-14"). */
  skeletonHeight?: string
}>()
</script>

<template>
  <div v-if="loading" class="space-y-2">
    <div
      v-for="i in 4"
      :key="i"
      :class="['skeleton rounded-lg border border-gray-200 bg-gray-50', skeletonHeight ?? 'h-20']"
    ></div>
  </div>

  <div
    v-else-if="empty"
    class="rounded-xl border border-dashed border-gray-200 p-10 text-center"
  >
    <p class="font-mono text-[12px] text-gray-500">
      {{ showArchived ? (archivedEmptyMessage ?? 'Nothing archived yet.') : emptyMessage }}
    </p>
  </div>

  <slot v-else />
</template>
