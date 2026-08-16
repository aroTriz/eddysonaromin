<script setup lang="ts">
/**
 * BarList — horizontal labelled bars (top pages, countries, cities, OSes).
 * Each row: label + value + proportional bar, all theme-aware.
 */
import { computed } from 'vue'

const props = defineProps<{
  items: { label: string; count: number }[]
  /** Show the value as a percentage of the top item instead of the raw count. */
  percent?: boolean
  empty?: string
}>()

const max = computed(() => Math.max(1, ...props.items.map((i) => i.count)))

const rows = computed(() =>
  props.items.map((item) => ({
    ...item,
    pct: Math.round((item.count / max.value) * 100),
  })),
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-for="row in rows" :key="row.label" class="group">
      <div class="mb-1 flex items-baseline justify-between gap-3 font-mono text-[11px]">
        <span class="truncate text-gray-600 group-hover:text-ink dark:text-gray-400 dark:group-hover:text-gray-950">
          {{ row.label }}
        </span>
        <span class="shrink-0 text-gray-400">
          {{ percent ? `${row.pct}%` : row.count.toLocaleString() }}
        </span>
      </div>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-300">
        <div
          class="h-full rounded-full bg-ink transition-[width] duration-500 group-hover:opacity-60"
          :style="{ width: `${row.pct}%` }"
        ></div>
      </div>
    </div>

    <p v-if="rows.length === 0" class="py-6 text-center font-mono text-[11.5px] text-gray-400">
      {{ empty ?? '// nothing to show yet' }}
    </p>
  </div>
</template>
