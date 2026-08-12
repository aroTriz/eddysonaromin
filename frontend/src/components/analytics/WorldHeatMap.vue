<script setup lang="ts">
/**
 * WorldHeatMap — equirectangular-mercator dot map of visitor locations.
 * The landmass SVG is the compact amcharts worldLow asset (kept under
 * src/assets and imported as raw text); dots are plotted with the same
 * mercator projection constants so they land exactly on the map.
 */
import { computed } from 'vue'

import worldMap from '@/assets/world-map.svg?raw'
import type { GeoPoint } from '@/services/adminApi'

const props = defineProps<{
  points: GeoPoint[]
}>()

/** amcharts worldLow mercator bounds (declared in the source SVG). */
const LON_LEFT = -169.6
const LON_RIGHT = 190.25
const LAT_TOP = 83.68
const LAT_BOTTOM = -55.55

const VIEW_BOX = '-20 -25 1040 690'

function merc(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
}

/** lon/lat → map coordinates (same projection as the landmass SVG). */
function project(lon: number, lat: number): { x: number; y: number } {
  const x = ((((lon - LON_LEFT) / (LON_RIGHT - LON_LEFT)) * 1000) % 1000 + 1000) % 1000
  const t = merc(LAT_TOP)
  const b = merc(LAT_BOTTOM)
  const y = ((t - merc(lat)) / (t - b)) * 645.4
  return { x, y }
}

const landHtml = computed(() => {
  const m = /<g class="land">([\s\S]*)<\/g>/.exec(worldMap)
  return m ? m[1] : ''
})

const maxVisits = computed(() => Math.max(1, ...props.points.map((p) => p.visits)))

/** Native <title> tooltip text for one dot. */
function dotTitle(d: { lat: number; lon: number; visits: number }): string {
  const plural = d.visits === 1 ? 'visit' : 'visits'
  return `${d.lat.toFixed(1)}, ${d.lon.toFixed(1)} — ${d.visits} ${plural}`
}

const dots = computed(() =>
  props.points.map((p) => {
    const { x, y } = project(p.lon, p.lat)
    const t = p.visits / maxVisits.value
    return {
      ...p,
      x,
      y,
      r: Math.min(2.2 + Math.log2(1 + p.visits) * 1.5, 11),
      opacity: 0.35 + 0.65 * t,
    }
  }),
)
</script>

<template>
  <div>
    <svg
      :viewBox="VIEW_BOX"
      class="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="World map showing where visitors are located"
    >
      <g class="land" v-html="landHtml" />
      <g v-if="dots.length">
        <circle
          v-for="(d, i) in dots"
          :key="i"
          :cx="d.x"
          :cy="d.y"
          :r="d.r"
          class="heat-dot"
          :style="{ opacity: d.opacity }"
        >
          <title>{{ dotTitle(d) }}</title>
        </circle>
      </g>
    </svg>

    <p v-if="dots.length === 0" class="pb-6 text-center font-mono text-[11.5px] text-gray-400">
      // no visitor locations yet — the map fills in as people visit
    </p>
  </div>
</template>

<style scoped>
.land :deep(path) {
  fill: rgb(var(--g100));
  stroke: rgb(var(--g300));
  stroke-width: 0.5;
}
.heat-dot {
  fill: rgb(var(--ink));
}
</style>
