<script setup lang="ts">
/**
 * /aromin/dashboard — analytics overview.
 *
 * Everything here is computed server-side from the `visits` table (live —
 * real detected data, refreshed every 30s):
 *  - Unique Visitors are counted by IP — the same IP refreshing or opening
 *    the site any number of times is ONE visitor (Page Views counts each
 *    view separately).
 *  - Trend, hourly activity, top pages, country map heat, devices,
 *    browsers, OSes, referrers and recent visits.
 *  - "clear data" wipes everything; recording restarts from that moment.
 */
import {
  CalendarClock,
  Eye,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Trash2,
  UserCheck,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AreaChart from '@/components/analytics/AreaChart.vue'
import BarList from '@/components/analytics/BarList.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import HourStrip from '@/components/analytics/HourStrip.vue'
import WorldHeatMap from '@/components/analytics/WorldHeatMap.vue'
import { clearAdminStats, fetchAdminStats, type AdminStats, type Analytics } from '@/services/adminApi'
import { profile } from '@/data/profile'
import AdminLayout from './AdminLayout.vue'

const AUTO_REFRESH_MS = 30_000

const stats = ref<AdminStats | null>(null)
const loading = ref(true)
const error = ref('')

// Clear-data confirm state.
const clearOpen = ref(false)
const clearing = ref(false)

/** Analytics slice (defensive default — old cached payloads lack it). */
const a = computed<Analytics>(() => stats.value?.analytics ?? {
  totals: { visitors: 0, views: 0, visitors_today: 0, views_today: 0 },
  series: [],
  hourly: Array(24).fill(0),
  top_pages: [],
  countries: [],
  cities: [],
  geo: [],
  devices: [],
  browsers: [],
  os: [],
  referrers: [],
  recent: [],
})

async function load(force = false): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    stats.value = await fetchAdminStats(force)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load stats'
  } finally {
    loading.value = false
  }
}

async function handleClear(): Promise<void> {
  if (clearing.value) return
  clearing.value = true
  error.value = ''
  try {
    await clearAdminStats()
    clearOpen.value = false
    await load(true)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to clear data'
    clearOpen.value = false
  } finally {
    clearing.value = false
  }
}

onMounted(() => {
  void load()
  timer = window.setInterval(() => void load(true), AUTO_REFRESH_MS)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})

let timer: number | undefined

/* ── KPI cards ─────────────────────────────────────────────── */

const analyticsCards = computed(() => [
  { label: 'unique visitors', value: a.value.totals.visitors, icon: Eye, hint: 'distinct IPs — last 12 months' },
  { label: 'page views', value: a.value.totals.views, icon: MousePointerClick, hint: 'total pages opened — last 12 months' },
  { label: 'visitors today', value: a.value.totals.visitors_today, icon: UserCheck, hint: 'distinct IPs — today' },
  { label: 'views today', value: a.value.totals.views_today, icon: CalendarClock, hint: 'pages opened today' },
])

/* ── Helpers ───────────────────────────────────────────────── */

/** 🇵🇭 from "PH" (or a globe when unknown). */
function flag(code: string): string {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
}

const countryRows = computed(() =>
  a.value.countries.map((c) => ({
    label: `${flag(c.country)} ${c.country_name || c.country}`,
    count: c.visits,
  })),
)

const cityRows = computed(() =>
  a.value.cities.map((c) => ({
    label: c.country_name ? `${c.city}, ${c.country_name}` : c.city,
    count: c.visits,
  })),
)

const osRows = computed(() => a.value.os.map((o) => ({ label: o.label, count: o.count })))

function timeAgo(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return iso
  const diff = Math.max(0, Date.now() - d.getTime())
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}
</script>

<template>
  <AdminLayout active="aromin-dashboard" wide>
    <!-- ── Header ─────────────────────────────────────────── -->
    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 class="font-pixel text-[1.9rem] leading-none sm:text-[2.4rem]">
          {{ profile.name }}
        </h1>
        <p class="mt-1.5 font-mono text-[12px] text-gray-500">
          // admin dashboard — analytics, charts &amp; site activity
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 font-mono text-[12px] text-red-500 transition-colors hover:border-red-300 hover:bg-red-50"
          @click="clearOpen = true"
        >
          <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
          clear data
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 font-mono text-[12px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
          :disabled="loading"
          @click="load(true)"
        >
          <RefreshCw class="h-3.5 w-3.5" :stroke-width="1.7" :class="{ 'animate-spin': loading }" />
          refresh
        </button>
      </div>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- ── Loading skeleton ───────────────────────────────── -->
    <div v-if="loading && !stats" class="flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div v-for="i in 4" :key="i" class="h-28 skeleton rounded-xl border border-gray-200 bg-gray-50"></div>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div v-for="i in 4" :key="`c${i}`" class="h-28 skeleton rounded-xl border border-gray-200 bg-gray-50"></div>
      </div>
      <div class="h-64 skeleton rounded-xl border border-gray-200 bg-gray-50"></div>
      <div class="h-72 skeleton rounded-xl border border-gray-200 bg-gray-50"></div>
    </div>

    <template v-else>
      <!-- ── KPI: analytics ───────────────────────────────── -->
      <section aria-label="Visitor metrics">
        <p class="mb-3 font-mono text-[11px] text-gray-500">// visitor metrics</p>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div
            v-for="card in analyticsCards"
            :key="card.label"
            class="group rounded-xl border border-gray-200 bg-white p-6 transition-colors hover:border-gray-300"
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="font-mono text-[11px] text-gray-500">// {{ card.label }}</p>
                <p class="mt-2 font-pixel text-[clamp(1.8rem,4vw,2.4rem)] leading-none text-ink">
                  {{ card.value.toLocaleString() }}
                </p>
              </div>
              <div class="rounded-md border border-gray-200 bg-gray-50 p-2.5 text-gray-500 transition-colors group-hover:text-ink">
                <component :is="card.icon" class="h-4.5 w-4.5" :stroke-width="1.7" />
              </div>
            </div>
            <p class="mt-3 font-mono text-[10.5px] text-gray-400">{{ card.hint }}</p>
          </div>
        </div>
        <p class="mt-2 font-mono text-[10px] text-gray-400">
          * unique visitors are counted by IP — refreshing / reopening from the same device counts once · data kept for the last 12 months
        </p>
      </section>

      <!-- ── Trend + hourly ───────────────────────────────── -->
      <section class="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Trends">
        <div class="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <p class="mb-4 font-mono text-[11px] text-gray-500">// visitors &amp; views — last 14 days</p>
          <AreaChart :points="a.series" />
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <p class="mb-4 font-mono text-[11px] text-gray-500">// activity by hour (last 12 months)</p>
          <HourStrip :hourly="a.hourly" />
        </div>
      </section>

      <!-- ── Map heat + countries ─────────────────────────── -->
      <section class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Visitor locations">
        <div class="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <p class="mb-4 font-mono text-[11px] text-gray-500">// where visitors come from — map heat</p>
          <WorldHeatMap :points="a.geo" />
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <p class="mb-4 font-mono text-[11px] text-gray-500">// top countries</p>
          <BarList :items="countryRows" :percent="true" empty="// no locations recorded yet" />
          <div class="border-t border-gray-200 pt-4 dark:border-gray-300">
            <p class="mb-3 font-mono text-[11px] text-gray-500">// top cities / towns</p>
            <BarList :items="cityRows" :percent="true" empty="// no cities recorded yet" />
          </div>
        </div>
      </section>

      <!-- ── Pages + devices + browsers/os ────────────────── -->
      <section class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Breakdowns">
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <p class="mb-4 font-mono text-[11px] text-gray-500">// top pages</p>
          <BarList
            :items="a.top_pages.map((p) => ({ label: p.path, count: p.views }))"
            empty="// no page views yet"
          />
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <p class="mb-4 font-mono text-[11px] text-gray-500">// devices</p>
          <BarList
            :items="a.devices.map((d) => ({ label: d.label, count: d.count }))"
            empty="// no devices recorded yet"
          />
        </div>
        <div class="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6">
          <div>
            <p class="mb-4 font-mono text-[11px] text-gray-500">// browsers</p>
            <BarList
              :items="a.browsers.map((b) => ({ label: b.label, count: b.count }))"
              empty="// no browsers recorded yet"
            />
          </div>
          <div class="border-t border-gray-200 pt-5 dark:border-gray-300">
            <p class="mb-4 flex items-center gap-1.5 font-mono text-[11px] text-gray-500">
              <Monitor class="h-3.5 w-3.5" :stroke-width="1.7" />
              // operating systems
            </p>
            <BarList :items="osRows" empty="// no OSes recorded yet" />
          </div>
        </div>
      </section>

      <!-- ── Referrers + recent visits ────────────────────── -->
      <section class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Referrers and recent activity">
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <p class="mb-4 font-mono text-[11px] text-gray-500">// top referrers</p>
          <BarList
            :items="a.referrers.map((r) => ({ label: r.domain, count: r.count }))"
            empty="// no external referrers yet"
          />
        </div>
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white lg:col-span-2">
          <p class="border-b border-gray-200 px-6 py-4 font-mono text-[11px] text-gray-500 dark:border-gray-300">
            // recent visits <span class="text-gray-400">(latest 5 — IPs masked)</span>
          </p>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[560px] text-left font-mono text-[11.5px]">
              <thead>
                <tr class="border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400 dark:border-gray-300">
                  <th class="px-6 py-2.5 font-normal">when</th>
                  <th class="px-3 py-2.5 font-normal">location</th>
                  <th class="px-3 py-2.5 font-normal">page</th>
                  <th class="px-3 py-2.5 font-normal">device</th>
                  <th class="px-3 py-2.5 font-normal">browser / os</th>
                  <th class="px-6 py-2.5 text-right font-normal">ip</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(v, i) in a.recent"
                  :key="i"
                  class="border-b border-gray-100 last:border-0 dark:border-gray-200"
                >
                  <td class="whitespace-nowrap px-6 py-3 text-gray-500">{{ timeAgo(v.created_at) }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-gray-600 dark:text-gray-400">
                    {{ flag(v.country) }}
                    <span v-if="v.country" class="text-gray-500">{{ v.country }}</span>
                    <span v-if="v.city"> · {{ v.city }}</span>
                  </td>
                  <td class="max-w-[140px] truncate px-3 py-3 text-ink">{{ v.path || '/' }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-gray-500">{{ v.device || '—' }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-gray-500">
                    {{ [v.browser, v.os].filter(Boolean).join(' · ') || '—' }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-3 text-right text-gray-400">{{ v.ip || '—' }}</td>
                </tr>
                <tr v-if="a.recent.length === 0">
                  <td colspan="6" class="px-6 py-8 text-center text-gray-400">
                    // no visits recorded yet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>

    <!-- ── Confirm clear-data (recording restarts from this moment) ── -->
    <ConfirmModal
      :open="clearOpen"
      title="clear all data"
      message="This permanently deletes ALL recorded visits and resets the visitor counter to 0. Recording restarts from this exact moment — are you sure?"
      confirm-label="clear data"
      danger
      :busy="clearing"
      @confirm="handleClear"
      @cancel="clearOpen = false"
    />
  </AdminLayout>
</template>
