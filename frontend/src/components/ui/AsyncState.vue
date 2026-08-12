<script setup lang="ts">
/**
 * AsyncState — uniform loading / error / empty rendering for all
 * data-dependent views. Every list view uses this so the four states
 * (loading, error, empty, success) look consistent site-wide.
 */
import { AlertTriangle, Inbox, RotateCcw } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    loading: boolean
    error: string | null
    /** Set to true to render the default empty message instead of the slot. */
    empty?: boolean
    /** Custom empty message (shown when `empty` is true). */
    emptyMessage?: string
    /** Retry callback shown next to the error. */
    onRetry?: () => void
  }>(),
  { empty: false, emptyMessage: 'Nothing here yet.', onRetry: undefined },
)
</script>

<template>
  <!-- Loading skeleton — uniform pulse blocks for every data view -->
  <div
    v-if="loading"
    class="flex flex-col gap-3 py-4"
    aria-busy="true"
    aria-label="Loading"
  >
    <div
      v-for="i in 4"
      :key="i"
      class="h-20 skeleton rounded-xl border border-gray-200/70 bg-gray-100"
      :style="{ animationDelay: `${i * 90}ms` }"
    ></div>
  </div>

  <!-- Error -->
  <div
    v-else-if="error"
    class="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 py-14 text-gray-500"
  >
    <AlertTriangle class="h-6 w-6" :stroke-width="1.6" />
    <p class="max-w-md text-center text-[13.5px]">{{ error }}</p>
    <button
      v-if="onRetry"
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 font-mono text-[12px] text-gray-600 hover:border-gray-300 hover:text-ink"
      @click="onRetry"
    >
      <RotateCcw class="h-3.5 w-3.5" :stroke-width="1.8" />
      retry
    </button>
  </div>

  <!-- Empty -->
  <div
    v-else-if="empty"
    class="flex flex-col items-center justify-center gap-3 py-16 text-gray-500"
  >
    <Inbox class="h-6 w-6" :stroke-width="1.6" />
    <span class="font-mono text-[13px]">{{ emptyMessage }}</span>
  </div>

  <!-- Success — consumer provides the content -->
  <slot v-else />
</template>
