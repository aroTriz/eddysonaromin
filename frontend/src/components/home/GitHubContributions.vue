<script setup lang="ts">
/**
 * GitHubContributions — EXACT replica of bryllim.com's halftone
 * GitHub contribution graph. Same 7×53 grid, same circle radii,
 * same opacity mapping — only the theme color (ink) is dynamic.
 *
 * Grid spacing is 13px; the viewBox is 689×91 like the reference.
 */
const GRID: number[][] = [
  [2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 3.8, 0, 1.1, 0, 2.7, 0, 2.7, 0, 2.7, 0, 3.8, 0, 1.1, 0, 3.8, 0, 1.1, 0, 1.1, 0, 2.7, 0, 3.8, 0, 2.7, 0, 1.1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1.1, 0, 2.7, 0, 2.7, 0, 3.8, 0, 2.7, 0, 2.7, 0, 2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 2.7, 0, 2.7, 0, 1.1, 0, 2.7, 0, 4.8, 0, 4.8, 0, 2.7, 0, 2.7, 0, 2.7, 0, 2.7, 0, 4.8, 0, 2.7, 0, 2.7],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [3.8, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 3.8, 0, 1.1, 0, 3.8, 0, 2.7, 0, 3.8, 0, 5.7, 0, 2.7, 0, 3.8, 0, 1.1, 0, 2.7, 0, 1.1, 0, 4.8, 0, 2.7, 0, 4.8],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [3.8, 0, 1.1, 0, 3.8, 0, 2.7, 0, 4.8, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 2.7, 0, 2.7, 0, 1.1, 0, 2.7, 0, 4.8, 0, 3.8, 0, 3.8, 0, 5.7, 0, 2.7, 0, 3.8, 0, 2.7, 0, 2.7, 0, 1.1, 0, 2.7, 0, 2.7],
]

const SPACING = 13
const OFFSET = 6.5

/** Exact opacity mapping from the reference:
 *  - empty cell (0) → tiny faint dot (0.05)
 *  - real r=1.1 dot → faint (0.12)
 *  - activity dots → bold (0.92) */
function radiusOpacity(cell: number): number {
  if (cell === 0) return 0.05
  if (cell <= 1.1) return 0.12
  return 0.92
}

/** Flat list of (x, y, radius, opacity) for every cell — all 371 dots,
 *  matching the reference: empty cells render as tiny faint dots (r=1.1),
 *  activity cells render with their pattern radius. */
const dots: { x: number; y: number; r: number; op: number }[] = []
GRID.forEach((row, y) => {
  row.forEach((cell, x) => {
    dots.push({
      x: OFFSET + x * SPACING,
      y: OFFSET + y * SPACING,
      r: cell > 0 ? cell : 1.1,
      op: radiusOpacity(cell),
    })
  })
})
</script>

<template>
  <svg
    viewBox="0 0 689 91"
    class="h-auto w-full text-ink"
    preserveAspectRatio="xMidYMid meet"
    aria-label="GitHub contribution graph, halftone style"
    role="img"
  >
    <circle
      v-for="dot in dots"
      :key="`${dot.x}-${dot.y}`"
      :cx="dot.x"
      :cy="dot.y"
      :r="dot.r"
      fill="currentColor"
      :opacity="dot.op"
    />
  </svg>
</template>
