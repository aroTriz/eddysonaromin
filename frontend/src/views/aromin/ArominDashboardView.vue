<script setup lang="ts">
/**
 * /aromin/dashboard — analytics overview.
 *
 * Everything here is computed server-side from the `visits` table (live —
 * real detected data, refreshed every 30s):
 *  - Unique Visitors are counted by IP — the same IP refreshing or opening
 *    the site any number of times is ONE visitor (Page Views counts each
 *    view separately).
 *  - Trend, hourly activity, country map heat, cities and recent visits.
 *    Countries + cities rank top 5; both the cities list and
 *    the map can be filtered to one country (searchable dropdowns).
 *  - "clear data" wipes everything; recording restarts from that moment.
 */
import {
  CalendarClock,
  Eye,
  MousePointerClick,
  RefreshCw,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AreaChart from '@/components/analytics/AreaChart.vue'
import BarList from '@/components/analytics/BarList.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import HourStrip from '@/components/analytics/HourStrip.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import WorldHeatMap from '@/components/analytics/WorldHeatMap.vue'
import {
  clearAdminStats,
  fetchAdminStats,
  fetchVisitHistory,
  type AdminStats,
  type Analytics,
  type RecentVisit,
  type VisitHistoryEntry,
} from '@/services/adminApi'
import { profile } from '@/data/profile'
import AdminLayout from './AdminLayout.vue'

const AUTO_REFRESH_MS = 30_000

const stats = ref<AdminStats | null>(null)
const loading = ref(true)
const error = ref('')

// Clear-data confirm state.
const clearOpen = ref(false)
const clearing = ref(false)

// Country filters — '' = all / world map.
const mapCountry = ref('')
const cityCountry = ref('')

/** Analytics slice (defensive default — old cached payloads lack it). */
const a = computed<Analytics>(() => stats.value?.analytics ?? {
  totals: { visitors: 0, views: 0, visitors_today: 0, views_today: 0 },
  series: [],
  hourly: Array(24).fill(0),
  top_pages: [],
  countries: [],
  cities: [],
  geo: [],
  os: [],
  recent: [],
})

async function load(force = false): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([fetchAdminStats(force), fetchActiveViewers()])
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
  startAutoRefresh()
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stopAutoRefresh()
  document.removeEventListener('visibilitychange', onVisibility)
})

let timer: number | undefined

/** Auto-refresh — paused while the tab is hidden (no wasted polls in the background). */
function startAutoRefresh(): void {
  if (timer !== undefined) return
  timer = window.setInterval(() => void load(true), AUTO_REFRESH_MS)
}

function stopAutoRefresh(): void {
  if (timer !== undefined) {
    window.clearInterval(timer)
    timer = undefined
  }
}

function onVisibility(): void {
  if (document.visibilityState === 'hidden') stopAutoRefresh()
  else startAutoRefresh()
}

/* ── KPI cards ─────────────────────────────────────────────── */

/** Active viewers — fetched separately (public endpoint, no auth needed). */
const activeViewersCount = ref(0)

async function fetchActiveViewers(): Promise<void> {
  try {
    const res = await fetch('/api/v1/visitors/active', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json() as { count: number }
    activeViewersCount.value = data.count || 0
  } catch { /* best effort */ }
}

const analyticsCards = computed(() => [
  { label: 'unique visitors', value: a.value.totals.visitors, icon: Eye, hint: 'distinct IPs — last 12 months' },
  { label: 'page views', value: a.value.totals.views, icon: MousePointerClick, hint: 'total pages opened — last 12 months' },
  { label: 'visitors today', value: a.value.totals.visitors_today, icon: UserCheck, hint: 'distinct IPs — today' },
  { label: 'views today', value: a.value.totals.views_today, icon: CalendarClock, hint: 'pages opened today' },
  { label: 'currently viewing', value: activeViewersCount.value, icon: Users, hint: 'active right now — last 5 min' },
])

/* ── Helpers ───────────────────────────────────────────────── */

/** 🇵🇭 from "PH" (or a globe when unknown). */
function flag(code: string): string {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
}

/** All countries as dropdown options (flag + name). */
const countryOptions = computed(() =>
  a.value.countries.map((c) => ({
    value: c.country,
    label: `${flag(c.country)} ${c.country_name || c.country}`,
  })),
)

/** Top 5 countries, ranked by visits. */
const countryRows = computed(() =>
  a.value.countries.slice(0, 5).map((c) => ({
    label: `${flag(c.country)} ${c.country_name || c.country}`,
    count: c.visits,
  })),
)

/** Top 5 cities — filtered to one country when the dropdown is set. */
const cityRows = computed(() =>
  a.value.cities
    .filter((c) => !cityCountry.value || c.country === cityCountry.value)
    .slice(0, 5)
    .map((c) => ({
      label: c.country_name ? `${c.city}, ${c.country_name}` : c.city,
      count: c.visits,
    })),
)

/** Map dots — whole world, or just the selected country. */
const mapPoints = computed(() =>
  mapCountry.value
    ? a.value.geo.filter((p) => p.country === mapCountry.value)
    : a.value.geo,
)

// ── Per-IP detail modal (eye icon) ─────────────────────────────────
const historyOpen = ref(false)
const historyLoading = ref(false)
const historyError = ref('')
const historyTarget = ref<RecentVisit | null>(null)
const historyRows = ref<VisitHistoryEntry[]>([])

/** Open the modal for one IP and fetch its full visit history. */
async function openVisitHistory(v: RecentVisit): Promise<void> {
  historyTarget.value = v
  historyRows.value = []
  historyError.value = ''
  historyOpen.value = true
  if (!v.raw_ip) return
  historyLoading.value = true
  try {
    historyRows.value = await fetchVisitHistory(v.raw_ip)
  } catch (e) {
    historyError.value = e instanceof Error ? e.message : "couldn't load visit history"
  } finally {
    historyLoading.value = false
  }
}

function closeVisitHistory(): void {
  historyOpen.value = false
  historyTarget.value = null
  historyRows.value = []
  historyError.value = ''
}

/** Full date + time (e.g. "Aug 16, 2026 · 11:23 PM"). */
function fullDateTime(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Oldest recorded visit for the modal's "first seen". */
const firstSeen = computed(() => {
  const last = historyRows.value[historyRows.value.length - 1]
  return last ? fullDateTime(last.created_at) : ''
})

/** Pages this IP visited, aggregated with per-page counts (most used first). */
const pageBreakdown = computed(() => {
  const counts = new Map<string, number>()
  for (const r of historyRows.value) {
    const p = r.path?.trim() || '/'
    counts.set(p, (counts.get(p) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
})

/** Check if a visitor is "active" — last seen within the last 5 minutes. */
const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000
function isActive(iso: string): boolean {
  if (!iso) return false
  const d = new Date(iso.replace(' ', 'T'))
  return Date.now() - d.getTime() < ACTIVE_THRESHOLD_MS
}
const isVisitorActive = computed(() => isActive(historyTarget.value?.created_at ?? ''))

/** Show a specific device label, or infer it from OS for legacy rows. */
function deviceLabel(v: { device?: string | null; os?: string | null }): string {
  const d = v.device?.trim()
  if (d && d !== 'Desktop' && d !== 'Unknown') return d
  const os = v.os?.trim()
  if (os && os !== 'Unknown' && os !== '') return `${os} desktop`
  return d || '—'
}

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
          class="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 font-mono text-[12px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
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
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p class="font-mono text-[11px] text-gray-500">// where visitors come from — map heat</p>
            <SearchableSelect
              v-model="mapCountry"
              :options="countryOptions"
              all-label="world map"
              placeholder="Search countries…"
              label="Map filter — world or one country"
            />
          </div>
          <WorldHeatMap :points="mapPoints" :country="mapCountry" :cities="a.cities" />
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <p class="mb-4 font-mono text-[11px] text-gray-500">// top countries</p>
          <BarList :items="countryRows" :percent="true" empty="// no locations recorded yet" />
          <div class="border-t border-gray-200 pt-4 dark:border-gray-300">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p class="font-mono text-[11px] text-gray-500">// top cities / towns</p>
              <SearchableSelect
                v-model="cityCountry"
                :options="countryOptions"
                all-label="all"
                placeholder="Search countries…"
                label="Cities filter — all or one country"
              />
            </div>
            <BarList :items="cityRows" :percent="true" empty="// no cities recorded yet" />
          </div>
        </div>
      </section>

      <!-- ── Recent visits ────────────────────────────────── -->
      <section class="mt-4 grid grid-cols-1 gap-4" aria-label="Recent activity">
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p class="border-b border-gray-200 px-6 py-4 font-mono text-[11px] text-gray-500 dark:border-gray-300">
            // recent visits <span class="text-gray-400">(latest 10 IPs — IPs masked)</span>
          </p>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[560px] text-left font-mono text-[11.5px]">
              <thead>
                <tr class="border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400 dark:border-gray-300">
                  <th class="px-6 py-2.5 font-normal">ip</th>
                  <th class="px-3 py-2.5 font-normal">visits</th>
                  <th class="px-3 py-2.5 font-normal">location</th>
                  <th class="px-3 py-2.5 font-normal">device</th>
                  <th class="px-3 py-2.5 font-normal">browser / os</th>
                  <th class="px-3 py-2.5 font-normal">last seen</th>
                  <th class="px-6 py-2.5 text-right font-normal">detail</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(v, i) in a.recent"
                  :key="i"
                  class="border-b border-gray-100 last:border-0 dark:border-gray-200"
                >
                  <td class="whitespace-nowrap px-6 py-3 text-gray-500">{{ v.ip || '—' }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-ink">{{ v.visits ?? 0 }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-gray-600 dark:text-gray-400">
                    {{ flag(v.country) }}
                    <span v-if="v.country" class="text-gray-500">{{ v.country }}</span>
                    <span v-if="v.city"> · {{ v.city }}</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-3 text-gray-500">{{ deviceLabel(v) }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-gray-500">
                    {{ [v.browser, v.os].filter(Boolean).join(' · ') || '—' }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-3 text-gray-500">{{ timeAgo(v.created_at) }}</td>
                  <td class="whitespace-nowrap px-6 py-3 text-right">
                    <button
                      type="button"
                      class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
                      :aria-label="`View visit history for ${v.ip}`"
                      title="View visit history"
                      @click="openVisitHistory(v)"
                    >
                      <Eye class="h-3.5 w-3.5" :stroke-width="1.7" />
                    </button>
                  </td>
                </tr>
                <tr v-if="a.recent.length === 0">
                  <td colspan="7" class="px-6 py-8 text-center text-gray-400">
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

    <!-- ── Per-IP detail modal (eye icon) ───────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="historyOpen"
          class="fixed inset-0 z-[120] flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          :aria-label="`Details for ${historyTarget?.ip ?? 'this IP'}`"
        >
          <!-- Frosted blur backdrop (matching ConfirmModal) -->
          <div
            class="absolute inset-0 bg-gray-500/20 backdrop-blur-md"
            aria-hidden="true"
            @click="closeVisitHistory"
          ></div>

          <!-- Card -->
          <div
            class="relative z-10 flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-300 dark:bg-gray-100"
          >
            <!-- Header with accent bar -->
            <div class="flex items-start gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-300">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 font-mono text-[11px] text-gray-500 dark:border-gray-300 dark:bg-gray-200">
                <Eye class="h-4 w-4" :stroke-width="1.7" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="font-mono text-[14px] font-semibold tracking-tight text-ink">
                    {{ historyTarget?.ip || 'IP' }}
                  </p>
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-medium"
                    :class="isVisitorActive
                      ? 'border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'border border-gray-200 bg-gray-100 text-gray-400'"
                  >
                    <span class="h-1 w-1 rounded-full" :class="isVisitorActive ? 'bg-green-500' : 'bg-gray-300'" />
                    {{ isVisitorActive ? 'active now' : fullDateTime(historyTarget?.created_at ?? '') }}
                  </span>
                </div>
                <p class="mt-0.5 font-mono text-[10.5px] text-gray-400">
                  visitor profile — everything recorded about this IP
                </p>
              </div>
              <button
                type="button"
                class="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
                aria-label="Close visitor details"
                @click="closeVisitHistory"
              >
                <X class="h-4 w-4" :stroke-width="1.7" />
              </button>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <!-- Loading -->
              <div v-if="historyLoading" class="space-y-3">
                <div class="grid grid-cols-3 gap-3">
                  <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-lg border border-gray-200 bg-gray-50"></div>
                </div>
                <div class="h-32 animate-pulse rounded-lg border border-gray-200 bg-gray-50"></div>
              </div>

              <!-- Error -->
              <p v-else-if="historyError" class="font-mono text-[11.5px] text-red-500">
                // {{ historyError }}
              </p>

              <template v-else>
                <!-- Summary — key metrics as individual stat cards -->
                <div class="grid grid-cols-3 gap-3">
                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-300 dark:bg-gray-200">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-gray-400">total visits</p>
                    <p class="mt-1.5 font-pixel text-[1.4rem] leading-none text-ink">{{ historyTarget?.visits ?? historyRows.length }}</p>
                  </div>
                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-300 dark:bg-gray-200">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-gray-400">first seen</p>
                    <p class="mt-1.5 font-mono text-[11px] leading-snug text-ink">{{ firstSeen || '—' }}</p>
                  </div>
                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-300 dark:bg-gray-200">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-gray-400">last seen</p>
                    <p class="mt-1.5 font-mono text-[11px] leading-snug text-ink">{{ fullDateTime(historyTarget?.created_at ?? '') || '—' }}</p>
                  </div>
                </div>

                <!-- Device & location row -->
                <div class="mt-3 grid grid-cols-3 gap-3">
                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-300 dark:bg-gray-200">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-gray-400">location</p>
                    <p class="mt-1.5 font-mono text-[11px] leading-snug text-ink">
                      {{ flag(historyTarget?.country ?? '') }}
                      <template v-if="historyTarget?.country || historyTarget?.city">
                        {{ [historyTarget?.city, historyTarget?.country].filter(Boolean).join(', ') }}
                      </template>
                      <template v-else>—</template>
                    </p>
                  </div>
                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-300 dark:bg-gray-200">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-gray-400">device</p>
                    <p class="mt-1.5 font-mono text-[11px] leading-snug text-ink">{{ deviceLabel(historyTarget ?? {}) }}</p>
                  </div>
                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-300 dark:bg-gray-200">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-gray-400">browser / os</p>
                    <p class="mt-1.5 font-mono text-[11px] leading-snug text-ink">
                      {{ [historyTarget?.browser, historyTarget?.os].filter(Boolean).join(' · ') || '—' }}
                    </p>
                  </div>
                </div>

                <!-- Connection & specs row -->
                <div class="mt-3 grid grid-cols-3 gap-3">
                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-300 dark:bg-gray-200">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-gray-400">screen</p>
                    <p class="mt-1.5 font-mono text-[11px] leading-snug text-ink">{{ historyTarget?.screen || '—' }}</p>
                  </div>
                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-300 dark:bg-gray-200">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-gray-400">cpu cores / ram</p>
                    <p class="mt-1.5 font-mono text-[11px] leading-snug text-ink">
                      {{ [historyTarget?.cores ? historyTarget.cores + ' cores' : '', historyTarget?.ram].filter(Boolean).join(' · ') || '—' }}
                    </p>
                  </div>
                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-300 dark:bg-gray-200">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-gray-400">connection</p>
                    <p class="mt-1.5 font-mono text-[11px] leading-snug text-ink">
                      {{ historyTarget?.conn ? historyTarget.conn.toUpperCase() : '—' }}
                    </p>
                  </div>
                </div>

                <!-- Referrer row -->
                <div v-if="historyTarget?.referrer" class="mt-3">
                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-300 dark:bg-gray-200">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-gray-400">referrer</p>
                    <p class="mt-1.5 font-mono text-[11px] leading-snug text-ink">{{ historyTarget.referrer }}</p>
                  </div>
                </div>

                <!-- Pages this IP visited, aggregated with proportional bars -->
                <div v-if="pageBreakdown.length" class="mt-5">
                  <p class="mb-3 font-mono text-[11px] text-gray-500">// pages visited</p>
                  <div class="flex flex-col gap-2.5">
                    <div v-for="(row, i) in pageBreakdown" :key="row.path" class="group">
                      <div class="mb-1 flex items-baseline justify-between gap-3 font-mono text-[11px]">
                        <span class="flex items-center gap-2 min-w-0">
                          <span class="w-4 shrink-0 text-[10px] text-gray-300">{{ i + 1 }}.</span>
                          <span class="truncate text-ink">{{ row.path }}</span>
                        </span>
                        <span class="shrink-0 text-gray-400">{{ row.count }}×</span>
                      </div>
                      <div class="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-300">
                        <div
                          class="h-full rounded-full bg-ink transition-[width] duration-500 group-hover:opacity-60"
                          :style="{ width: `${Math.round((row.count / Math.max(1, pageBreakdown[0]?.count ?? 1)) * 100)}%` }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <p v-else class="py-8 text-center font-mono text-[11.5px] text-gray-400">
                  no visits recorded for this IP
                </p>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </AdminLayout>
</template>
