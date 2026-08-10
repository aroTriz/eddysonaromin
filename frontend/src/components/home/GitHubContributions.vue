<script setup lang="ts">
/**
 * GitHubContributions — REAL GitHub contribution graph for the account
 * linked in the profile (github.com/EddysonA15), served by the Laravel
 * API (`GET /api/v1/github/{username}/contributions`, cached server-side).
 *
 * Renders the same halftone dot language as the rest of the site:
 * 7×53 grid, tiny faint dots for empty weeks, ink dots that grow with
 * the contribution level (1→4). Loading / error / empty states use the
 * shared AsyncState component so every data view on the site matches.
 */
import { computed, onMounted, ref } from 'vue'

import AsyncState from '@/components/ui/AsyncState.vue'
import { profile } from '@/data/profile'
import { fetchGitHubContributions } from '@/services/api'

/** GitHub login derived from the profile URL (https://github.com/EddysonA15). */
const username = profile.github.replace(/^https?:\/\/github\.com\//, '').replace(/\/.*$/, '')

const SPACING = 13
const OFFSET = 6.5

/** Level → (radius, opacity) so activity reads like GitHub's intensity. */
function levelStyle(level: number): { r: number; op: number } {
  if (level <= 0) return { r: 1.1, op: 0.12 }
  if (level === 1) return { r: 1.1, op: 0.28 }
  if (level === 2) return { r: 2, op: 0.5 }
  if (level === 3) return { r: 2.7, op: 0.74 }
  return { r: 3.8, op: 0.95 }
}

const loading = ref(true)
const error = ref<string | null>(null)
const grid = ref<number[][]>([])

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    grid.value = await fetchGitHubContributions(username)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load contributions.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** Flat list of dots for the SVG — x, y, radius, opacity. */
const dots = computed(() => {
  const list: { x: number; y: number; r: number; op: number; key: string }[] = []
  grid.value.forEach((row, y) => {
    row.forEach((level, x) => {
      const s = levelStyle(level)
      list.push({
        x: OFFSET + x * SPACING,
        y: OFFSET + y * SPACING,
        r: s.r,
        op: s.op,
        key: `${x}-${y}`,
      })
    })
  })
  return list
})

/** Total commits across the year — shown under the graph. */
const totalContributions = computed(() =>
  grid.value.reduce(
    (sum, row) => sum + row.reduce((rowSum, level) => rowSum + level, 0),
    0,
  ),
)
</script>

<template>
  <AsyncState :loading="loading" :error="error" :on-retry="load">
    <div v-if="grid.length > 0" class="flex flex-col gap-3">
      <svg
        viewBox="0 0 689 91"
        class="h-auto w-full text-ink transition-opacity duration-300"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        :aria-label="`GitHub contribution graph for ${username}`"
      >
        <circle
          v-for="dot in dots"
          :key="dot.key"
          :cx="dot.x"
          :cy="dot.y"
          :r="dot.r"
          fill="currentColor"
          :opacity="dot.op"
        />
      </svg>
      <p class="font-mono text-[11px] text-gray-600 dark:text-gray-400">
        {{ totalContributions }} contributions in the last year
      </p>
    </div>
  </AsyncState>
</template>
