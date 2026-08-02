<script setup lang="ts">
/**
 * GitHubContributions — bryllim-style halftone contribution graph.
 * A generated dot grid that mimics the GitHub contribution heatmap,
 * rendered in the current theme color (ink).
 */
const WEEKS = 26
const DAYS = 7

// Deterministic pseudo-random so the graph is stable across renders.
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const rand = seededRandom(20260802)

// Build cells: 0 = empty, 1-4 = intensity
const cells: number[] = []
for (let i = 0; i < WEEKS * DAYS; i++) {
  const r = rand()
  if (r < 0.45) cells.push(0)
  else if (r < 0.7) cells.push(1)
  else if (r < 0.85) cells.push(2)
  else if (r < 0.95) cells.push(3)
  else cells.push(4)
}

const gap = 4
const size = 9

const opacities = [0.1, 0.3, 0.55, 0.75, 0.95]
</script>

<template>
  <svg
    viewBox="0 0 689 91"
    class="h-auto w-full text-ink"
    preserveAspectRatio="xMidYMid meet"
    aria-label="GitHub contribution graph"
    role="img"
  >
    <g>
      <circle
        v-for="(level, i) in cells"
        :key="i"
        :cx="6.5 + (i % WEEKS) * (size + gap) + size / 2"
        :cy="6.5 + Math.floor(i / WEEKS) * (size + gap) + size / 2"
        :r="size / 2 - 0.5"
        fill="currentColor"
        :opacity="level ? opacities[level - 1] : 0.05"
      />
    </g>
  </svg>
</template>
