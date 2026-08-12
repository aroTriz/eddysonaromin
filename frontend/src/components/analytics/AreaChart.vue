<script setup lang="ts">
/**
 * AreaChart — 14-day visitors vs page-views trend.
 * Hand-rolled SVG (no chart lib) so it inherits the site's monochrome
 * design system and flips correctly with light/dark themes.
 */
import { computed, ref } from 'vue'

import type { SeriesPoint } from '@/services/adminApi'

const props = defineProps<{
  points: SeriesPoint[]
}>()

const W = 720
const H = 240
const PAD = { top: 18, right: 10, bottom: 26, left: 34 }

const hovered = ref<number | null>(null)

const max = computed(() =>
  Math.max(1, ...props.points.flatMap((p) => [p.visitors, p.views])),
)

const plotW = computed(() => W - PAD.left - PAD.right)
const plotH = computed(() => H - PAD.top - PAD.bottom)

const xFor = (i: number): number => {
  const n = props.points.length
  return n <= 1 ? PAD.left + plotW.value / 2 : PAD.left + (i / (n - 1)) * plotW.value
}

const yFor = (v: number): number => PAD.top + (1 - v / max.value) * plotH.value

const visitorsPath = computed(() => {
  const pts = props.points
  if (pts.length === 0) return ''
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.visitors).toFixed(1)}`)
    .join('')
})

const viewsPath = computed(() => {
  const pts = props.points
  if (pts.length === 0) return ''
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.views).toFixed(1)}`)
    .join('')
})

const areaPath = computed(() => {
  const pts = props.points
  if (pts.length === 0) return ''
  const line = visitorsPath.value
  const last = pts.length - 1
  return `${line}L${xFor(last).toFixed(1)},${PAD.top + plotH.value}L${xFor(0).toFixed(1)},${PAD.top + plotH.value}Z`
})

/** 3 horizontal gridlines with labels (max, mid, 0). */
const gridlines = computed(() => {
  const lines = [0, 0.5, 1].map((f) => ({
    y: PAD.top + (1 - f) * plotH.value,
    label: Math.round(max.value * f).toString(),
  }))
  // dedupe overlapping labels (tiny max)
  const seen = new Set<string>()
  return lines.filter((l) => {
    const k = l.label
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
})

const xLabels = computed(() => {
  const pts = props.points
  if (pts.length === 0) return []
  const idx = [0, Math.floor((pts.length - 1) / 2), pts.length - 1]
  return idx.map((i) => ({ i, label: pts[i].date.slice(5) }))
})

const hasData = computed(() => max.value > 1)

const tipDate = computed(() => (hovered.value == null ? '' : props.points[hovered.value]?.date ?? ''))
const tipVisitors = computed(() => (hovered.value == null ? 0 : props.points[hovered.value]?.visitors ?? 0))
const tipViews = computed(() => (hovered.value == null ? 0 : props.points[hovered.value]?.views ?? 0))
</script>

<template>
  <div class="relative">
    <!-- ── Hover tooltip ── -->
    <div
      v-if="hovered != null && points[hovered]"
      class="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 font-mono text-[10.5px] leading-relaxed text-ink shadow-md dark:border-gray-300"
      :style="{ left: `${(xFor(hovered) / W) * 100}%`, top: '0' }"
    >
      <span class="text-gray-500">{{ tipDate }}</span><br />
      <span class="inline-block h-1.5 w-1.5 rounded-full bg-ink align-middle" /> visitors {{ tipVisitors }}<br />
      <span class="inline-block h-1.5 w-1.5 rounded-full border border-gray-400 align-middle" /> views {{ tipViews }}
    </div>

    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="h-auto w-full"
      role="img"
      aria-label="Visitors and page views over the last 14 days"
      @mouseleave="hovered = null"
    >
      <template v-if="hasData">
        <!-- gridlines -->
        <g v-for="(g, i) in gridlines" :key="i">
          <line
            :x1="PAD.left"
            :x2="W - PAD.right"
            :y1="g.y"
            :y2="g.y"
            class="grid-line"
            stroke-width="1"
          />
          <text :x="PAD.left - 6" :y="g.y + 3" class="axis-label" text-anchor="end">
            {{ g.label }}
          </text>
        </g>

        <!-- area under visitors -->
        <path :d="areaPath" class="area-fill" />

        <!-- views line -->
        <path :d="viewsPath" class="views-line" fill="none" stroke-width="1.5" />
        <!-- visitors line -->
        <path :d="visitorsPath" class="visitors-line" fill="none" stroke-width="2" />

        <!-- hover bands -->
        <rect
          v-for="i in points.length"
          :key="i"
          :x="xFor(i) - (points.length > 1 ? xFor(1) - xFor(0) : 30) / 2"
          :y="0"
          :width="points.length > 1 ? xFor(1) - xFor(0) : 60"
          :height="H"
          fill="transparent"
          @mouseenter="hovered = i"
        />
      </template>

      <!-- x labels -->
      <text
        v-for="xl in xLabels"
        :key="xl.i"
        :x="xFor(xl.i)"
        :y="H - 6"
        class="axis-label"
        text-anchor="middle"
      >
        {{ xl.label }}
      </text>
    </svg>

    <p
      v-if="!hasData"
      class="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-mono text-[11.5px] text-gray-400"
    >
      // no data yet — visits will chart here
    </p>

    <!-- legend -->
    <div class="mt-2 flex items-center gap-5 font-mono text-[10.5px] text-gray-500">
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block h-[2px] w-4 bg-ink" /> visitors
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block h-0 w-4 border-t border-dashed border-gray-400" /> views
      </span>
    </div>
  </div>
</template>

<style scoped>
.grid-line {
  stroke: rgb(var(--g200));
}
.axis-label {
  fill: rgb(var(--g400));
  font-family: var(--font-mono);
  font-size: 9.5px;
}
.area-fill {
  fill: rgb(var(--ink));
  opacity: 0.07;
}
.visitors-line {
  stroke: rgb(var(--ink));
}
.views-line {
  stroke: rgb(var(--g400));
  stroke-dasharray: 4 3;
}
</style>
