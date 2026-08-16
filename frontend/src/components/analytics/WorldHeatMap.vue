<script setup lang="ts">
/**
 * WorldHeatMap — mercator dot map of visitor locations.
 * World view uses the compact amcharts worldLow asset. When a country is
 * selected the map zooms to its bounds — and for the Philippines it swaps
 * to the detailed philippinesLow asset (real islands, 80 provinces) so the
 * archipelago renders clearly instead of a blurry zoom. Dots are plotted
 * with the same mercator projection constants as the landmass SVG.
 */
import { computed } from 'vue'

import worldMap from '@/assets/world-map.svg?raw'
import philippinesMap from '@/assets/philippines-map.svg?raw'
import type { CityStat, GeoPoint } from '@/services/adminApi'

const props = defineProps<{
  points: GeoPoint[]
  /** ISO code of the selected country — zooms the map to its bounds. */
  country?: string
  /** City heat rows (with lat/lon) — shown as labeled markers when a
   *  specific country is selected, so strong cities stand out. */
  cities?: CityStat[]
}>()

/** amcharts worldLow mercator bounds (declared in the source SVG). */
const LON_LEFT = -169.6
const LON_RIGHT = 190.25
const LAT_TOP = 83.68
const LAT_BOTTOM = -55.55

const VIEW_BOX = '-20 -25 1040 690'

/**
 * amcharts philippinesLow SVG paths are drawn in a coordinate space that is
 * OFFSET from the geographic bounds — calibrated empirically against
 * province centroids:
 *   x = 71.278 * lon - 8277.7
 *   y = -4053.1 * merc(lat) + 1534.7
 * Full landmass bbox in the PH SVG space (computed from all paths).
 */
const PH_BBOX = { minX: 44.79, maxX: 747.2, minY: 18.24, maxY: 1220.02 }
const PH_PAD = 35
const PH_VIEW_BOX = `${PH_BBOX.minX - PH_PAD} ${PH_BBOX.minY - PH_PAD} ${PH_BBOX.maxX - PH_BBOX.minX + PH_PAD * 2} ${PH_BBOX.maxY - PH_BBOX.minY + PH_PAD * 2}`
/** Display height for the PH map (px) — keeps the tall archipelago from
 *  blowing up the card. Everything else is scaled to match. */
const PH_RENDER_H = 480
/** viewBox→screen scale for the PH map at its constrained height. */
const PH_SCALE = PH_RENDER_H / (PH_BBOX.maxY - PH_BBOX.minY + PH_PAD * 2)

/** True when the detailed Philippines map is being shown. */
const isPh = computed(() => props.country?.toUpperCase() === 'PH')

/**
 * Approximate [westLon, southLat, eastLon, northLat] bounds per ISO code.
 * Used to zoom the map when a country is selected — covers the countries
 * visitors actually come from (fallback: dot bounds for anything else).
 */
const COUNTRY_BOUNDS: Record<string, [number, number, number, number]> = {
  PH: [116.9, 4.6, 126.6, 21.1],
  US: [-125, 24.5, -66.9, 49.4],
  CA: [-141, 41.7, -52.6, 70],
  GB: [-8.6, 49.9, 1.8, 60.9],
  AU: [112.9, -43.6, 153.6, -10.7],
  NZ: [166.4, -47.3, 178.6, -34.4],
  IN: [68.1, 8.1, 97.4, 35.5],
  SG: [103.6, 1.2, 104.1, 1.5],
  MY: [99.6, 0.9, 119.3, 7.4],
  ID: [95.3, -10.9, 141, 5.9],
  JP: [129.3, 31.4, 145.8, 45.6],
  KR: [126.1, 34.4, 129.6, 38.6],
  CN: [73.5, 18.2, 134.8, 53.6],
  HK: [113.8, 22.1, 114.4, 22.6],
  TW: [120, 21.9, 122, 25.3],
  TH: [97.3, 5.6, 105.6, 20.5],
  VN: [102.1, 8.6, 109.5, 23.4],
  DE: [5.9, 47.3, 15, 55.1],
  FR: [-5.1, 41.4, 9.6, 51.1],
  ES: [-9.3, 36, 3.3, 43.8],
  IT: [6.6, 36.6, 18.5, 47.1],
  NL: [3.4, 50.8, 7.2, 53.5],
  BE: [2.5, 49.5, 6.4, 51.5],
  CH: [5.9, 45.8, 10.5, 47.8],
  SE: [11.1, 55.3, 24.2, 69.1],
  NO: [4.6, 58, 31.1, 71.2],
  FI: [20.6, 59.8, 31.6, 70.1],
  DK: [8, 54.5, 15.2, 57.8],
  IE: [-10.5, 51.4, -6, 55.4],
  PT: [-9.5, 36.9, -6.2, 42.2],
  GR: [19.4, 34.8, 28.3, 41.8],
  PL: [14.1, 49, 24.2, 54.8],
  UA: [22.1, 44.4, 40.2, 52.4],
  RU: [27, 41.2, 180, 77],
  TR: [26, 35.8, 44.8, 42.1],
  SA: [34.6, 16.4, 55.7, 32.2],
  AE: [51.5, 22.6, 56.4, 26.1],
  QA: [50.7, 24.5, 51.7, 26.2],
  KW: [46.6, 28.5, 48.4, 30.1],
  IL: [34.3, 29.5, 35.9, 33.3],
  EG: [24.7, 22, 36.9, 31.7],
  ZA: [16.5, -34.8, 32.9, -22.1],
  NG: [2.7, 4.3, 14.7, 13.9],
  KE: [33.9, -4.7, 41.9, 5],
  BR: [-73.8, -33.7, -34.8, 5.3],
  AR: [-73.6, -55.1, -53.6, -21.8],
  MX: [-117.1, 14.5, -86.7, 32.7],
  CL: [-76, -56, -66, -17.5],
  CO: [-79, -4.2, -66.9, 12.5],
  PE: [-81.3, -18.3, -68.7, -0],
}

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

/** lon/lat → coordinates on the detailed Philippines map (calibrated). */
function projectPh(lon: number, lat: number): { x: number; y: number } {
  return {
    x: 71.278 * lon - 8277.7,
    y: -4053.1 * merc(lat) + 1534.7,
  }
}

/** Zoomed viewBox for the selected country — world view when none. */
const viewBox = computed(() => {
  if (isPh.value) return PH_VIEW_BOX
  const code = props.country?.toUpperCase()
  if (!code) return VIEW_BOX

  // Country bounds table → project corners → padded bbox.
  let box: { x: number; y: number; w: number; h: number } | null = null
  const bounds = COUNTRY_BOUNDS[code]
  if (bounds) {
    const [wlon, slat, elon, nlat] = bounds
    const tl = project(wlon, nlat)
    const br = project(elon, slat)
    box = { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y }
  } else {
    // Fallback: bounding box of the dots that belong to the country.
    const pts = props.points.filter((p) => p.country === code)
    if (pts.length) {
      const xs = pts.map((p) => project(p.lon, p.lat).x)
      const ys = pts.map((p) => project(p.lon, p.lat).y)
      const xMin = Math.min(...xs)
      const xMax = Math.max(...xs)
      const yMin = Math.min(...ys)
      const yMax = Math.max(...ys)
      box = { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin }
    }
  }

  if (!box || box.w <= 0 || box.h <= 0) return VIEW_BOX

  const pad = Math.max(box.w, box.h) * 0.25 + 15
  const x = box.x - pad
  const y = box.y - pad
  const w = box.w + pad * 2
  const h = box.h + pad * 2
  return `${x} ${y} ${w} ${h}`
})

/** Province/land paths for the currently shown map. */
const landHtml = computed(() => {
  const src = isPh.value ? philippinesMap : worldMap
  // WorldLow wraps the paths in <g class="land">; philippinesLow has them
  // directly inside the outer <g> (each path already has class="land").
  const wrapped = /<g class="land">([\s\S]*)<\/g>/.exec(src)
  if (wrapped) return wrapped[1]
  const paths = src.match(/<path[^>]*class="land"[^>]*\/>/g) ?? []
  return paths.join('')
})

/** Dots projected onto whichever map is showing. */
const dots = computed(() => {
  const projectFn = isPh.value ? projectPh : project
  return props.points.map((p) => {
    const { x, y } = projectFn(p.lon, p.lat)
    const t = p.visits / maxVisits.value
    // Sizes are in viewBox units — scale them so they look the same on
    // screen once the PH map is constrained to PH_RENDER_H.
    const k = isPh.value ? 1 / PH_SCALE : 1
    return {
      ...p,
      x,
      y,
      r: isPh.value
        ? Math.min((3.5 + Math.log2(1 + p.visits) * 2.2) * k, 14 * k)
        : Math.min(2.2 + Math.log2(1 + p.visits) * 1.5, 11),
      opacity: 0.35 + 0.65 * t,
    }
  })
})

const maxVisits = computed(() => Math.max(1, ...props.points.map((p) => p.visits)))

/**
 * Top cities of the selected country with lat/lon — rendered as labeled
 * heat markers on the country map (e.g. Manila, Cebu on the PH map).
 */
const cityMarkers = computed(() => {
  const code = props.country?.toUpperCase()
  if (!code || !props.cities) return []
  const projectFn = isPh.value ? projectPh : project
  const maxCity = Math.max(1, ...props.cities.map((c) => c.visits))
  const k = isPh.value ? 1 / PH_SCALE : 1
  return props.cities
    .filter((c) => c.country === code && c.lat !== null && c.lon !== null && c.visits > 0)
    .slice(0, 8)
    .map((c) => {
      const { x, y } = projectFn(c.lon as number, c.lat as number)
      return {
        name: c.city,
        x,
        y,
        visits: c.visits,
        r: isPh.value
          ? Math.min((5 + (c.visits / maxCity) * 9) * k, 15 * k)
          : Math.min(3 + (c.visits / maxCity) * 6, 10),
        labelOffset: isPh.value ? 5 * k + 4 : 0,
        showLabel: isPh.value && c.visits >= maxCity * 0.3,
      }
    })
    .sort((a, b) => b.visits - a.visits)
})

/** Native <title> tooltip text for one dot. */
function dotTitle(d: { lat: number; lon: number; visits: number }): string {
  const plural = d.visits === 1 ? 'visit' : 'visits'
  return `${d.lat.toFixed(1)}, ${d.lon.toFixed(1)} — ${d.visits} ${plural}`
}
</script>

<template>
  <div>
    <svg
      :viewBox="viewBox"
      :class="isPh ? 'mx-auto h-auto max-h-[480px] w-auto max-w-full' : 'h-auto w-full'"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      :aria-label="isPh
        ? 'Philippines map showing where visitors are located'
        : country
          ? `Map zoomed to ${country}`
          : 'World map showing where visitors are located'"
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
      <!-- City heat markers — labeled on the country map -->
      <g v-if="cityMarkers.length" class="city-heat">
        <g v-for="c in cityMarkers" :key="c.name" class="city-marker">
          <circle :cx="c.x" :cy="c.y" :r="c.r" class="city-ring">
            <title>{{ c.name }} — {{ c.visits }} visits</title>
          </circle>
          <text
            v-if="c.showLabel"
            :x="c.x"
            :y="c.y - c.r - c.labelOffset"
            :class="['city-label', isPh ? 'city-label-ph' : '']"
            text-anchor="middle"
          >
            {{ c.name }}
          </text>
        </g>
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
.city-ring {
  fill: rgb(var(--ink));
  opacity: 0.5;
  stroke: rgb(var(--bg));
  stroke-width: 1.5;
  pointer-events: none;
}
.city-label {
  fill: rgb(var(--ink));
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
  paint-order: stroke;
  stroke: rgb(var(--bg));
  stroke-width: 3px;
  stroke-linejoin: round;
}
/* On the PH map the viewBox is large (≈1272 tall → 480px screen), so
   text + stroke must be scaled up to stay readable. */
.city-label-ph {
  font-size: 30px;
  stroke-width: 7px;
}
</style>
