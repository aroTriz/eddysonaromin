<script setup lang="ts">
/**
 * /aromin/dashboard — visitor stats + content counts.
 * Left sidebar layout, dark/light/system theme (inherits from the app).
 */
import { Eye, FileText, FolderKanban, Mail, RefreshCw } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import { fetchAdminStats, type AdminStats } from '@/services/adminApi'
import { profile } from '@/data/profile'

const stats = ref<AdminStats | null>(null)
const loading = ref(true)
const error = ref('')

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    stats.value = await fetchAdminStats()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load stats'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const cards = [
  { key: 'visitors' as const, label: 'visitors', icon: Eye, hint: 'times the site was opened' },
  { key: 'posts' as const, label: 'blog posts', icon: FileText, hint: 'published + drafts' },
  { key: 'projects' as const, label: 'projects', icon: FolderKanban, hint: 'in the portfolio' },
  { key: 'messages' as const, label: 'contact messages', icon: Mail, hint: 'from the contact form' },
]
</script>

<template>
  <AdminLayout active="aromin-dashboard">
    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 class="font-pixel text-[1.9rem] leading-none sm:text-[2.4rem]">
          {{ profile.name }}
        </h1>
        <p class="mt-1.5 font-mono text-[12px] text-gray-500">
          // admin dashboard — overview of your site's activity
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 font-mono text-[12px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
        @click="load"
      >
        <RefreshCw class="h-3.5 w-3.5" :stroke-width="1.7" />
        refresh
      </button>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div v-for="i in 4" :key="i" class="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-50"></div>
    </div>

    <div v-else-if="stats" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div
        v-for="card in cards"
        :key="card.key"
        class="group rounded-xl border border-gray-200 bg-white p-6 transition-colors hover:border-gray-300"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="font-mono text-[11px] text-gray-500">// {{ card.label }}</p>
            <p class="mt-2 font-pixel text-[clamp(1.8rem,5vw,2.6rem)] leading-none text-ink">
              {{ stats[card.key].toLocaleString() }}
            </p>
          </div>
          <div class="rounded-md border border-gray-200 bg-gray-50 p-2.5 text-gray-500 transition-colors group-hover:text-ink">
            <component :is="card.icon" class="h-4.5 w-4.5" :stroke-width="1.7" />
          </div>
        </div>
        <p class="mt-3 font-mono text-[10.5px] text-gray-400">{{ card.hint }}</p>
      </div>
    </div>
  </AdminLayout>
</template>
