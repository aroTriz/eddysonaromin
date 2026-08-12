<script setup lang="ts">
/**
 * HourStrip — visits per hour of day (all-time), 24 bars.
 * Shows which hours visitors are most active.
 */
import { computed } from 'vue'

const props = defineProps<{
  hourly: number[]
}>()

const max = computed(() => Math.max(1, ...props.hourly))

const bars = computed(() =>
  props.hourly.map((count, hour) => ({
    hour,
    count,
    label: `${String(hour).padStart(2, '0')}:00`,
    pct: Math.round((count / max.value) * 100),
  })),
)

const hasData = computed(() => props.hourly.some((n) => n > 0))
</script>

<template>
  <div>
    <div
      v-if="hasData"
      class="flex h-28 items-end gap-[3px]"
      role="img"
      :aria-label="'Visits per hour of day: ' + hourly.join(', ')"
    >
      <div
        v-for="b in bars"
        :key="b.hour"
        class="group relative flex h-full flex-1 items-end"
      >
        <div
          class="w-full rounded-t-[2px] bg-ink transition-opacity group-hover:opacity-50"
          :style="{ height: `${Math.max(b.pct, 2)}%`, opacity: 0.18 + 0.82 * (b.pct / 100) }"
        ></div>
        <span
          class="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-[10px] text-ink shadow-md group-hover:block dark:border-gray-300"
        >
          {{ b.label }} · {{ b.count }} view{{ b.count === 1 ? '' : 's' }}
        </span>
      </div>
    </div>
    <p v-else class="py-8 text-center font-mono text-[11.5px] text-gray-400">
      // no data yet
    </p>

    <div class="mt-2 flex justify-between font-mono text-[9.5px] text-gray-400">
      <span>00:00</span>
      <span>06:00</span>
      <span>12:00</span>
      <span>18:00</span>
      <span>24:00</span>
    </div>
  </div>
</template>
