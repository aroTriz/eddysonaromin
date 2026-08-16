<script setup lang="ts">
/**
 * /aromin/chat â€” community chat moderation dashboard.
 * Table of chat messages (name, message, IP, location, time) with:
 *  - archive / restore / delete (single + bulk "Delete selected")
 *  - per-row + bulk "delete after 72 hours" tick (untick = reset,
 *    tick again = fresh 72h countdown)
 *  - select-all + selection bulk bar
 */
import { Archive, ArchiveRestore, Check, Clock, Eye, Trash2, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AdminLayout from './AdminLayout.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import Pagination from '@/components/ui/Pagination.vue'
import {
  archiveAdminChatMessage,
  deleteAdminChatMessage,
  deleteAdminChatMessages,
  fetchAdminChatMessages,
  restoreAdminChatMessage,
  setAdminChatMessagesDeleteAfter,
  type ChatAdminMessage,
} from '@/services/adminApi'

const messages = ref<ChatAdminMessage[]>([])
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const showArchived = ref(false)

// Selection state
const selectionMode = ref(false)
const selected = ref<Set<number>>(new Set())

// Confirm dialog state
const confirm = ref<{
  title: string
  message: string
  confirmLabel: string
  danger: boolean
  action: () => void | Promise<void>
} | null>(null)

// Full-message viewer state
const viewing = ref<ChatAdminMessage | null>(null)

const route = useRoute()
const router = useRouter()

/** Chat table pagination — 10 messages per page, URL-driven (?page=). */
const PAGE_SIZE = 10
const currentPage = computed(() => {
  const raw = Number(route.query.page)
  if (!Number.isFinite(raw) || raw < 1) return 1
  return Math.min(raw, totalPages.value)
})
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)))
const pagedMessages = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return sorted.value.slice(start, start + PAGE_SIZE)
})

const sorted = computed(() => [...messages.value])

const allSelected = computed(
  () => pagedMessages.value.length > 0 && pagedMessages.value.every((m) => selected.value.has(m.id)),
)
const someSelected = computed(
  () => pagedMessages.value.some((m) => selected.value.has(m.id)) && !allSelected.value,
)

/** Reset to page 1 (e.g. after archive toggle or a reload). */
function resetPage(): void {
  if (currentPage.value > 1) {
    router.replace({ query: { ...route.query, page: undefined } })
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    messages.value = await fetchAdminChatMessages(showArchived.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load chat messages'
  } finally {
    loading.value = false
  }
}

function askConfirm(opts: {
  title: string
  message: string
  confirmLabel: string
  danger: boolean
  action: () => void | Promise<void>
}): void {
  confirm.value = opts
}

// â”€â”€ Archive / restore â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function archiveItem(m: ChatAdminMessage): Promise<void> {
  busy.value = true
  try {
    await archiveAdminChatMessage(m.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to archive message'
  } finally {
    busy.value = false
  }
}

async function restoreItem(m: ChatAdminMessage): Promise<void> {
  busy.value = true
  try {
    await restoreAdminChatMessage(m.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to restore message'
  } finally {
    busy.value = false
  }
}

// â”€â”€ Delete (single + bulk) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function askDelete(m: ChatAdminMessage): void {
  askConfirm({
    title: 'Delete message',
    message: `Delete the message from "${m.name}" permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: () => remove(m),
  })
}

async function remove(m: ChatAdminMessage): Promise<void> {
  busy.value = true
  try {
    await deleteAdminChatMessage(m.id)
    const next = new Set(selected.value)
    next.delete(m.id)
    selected.value = next
    confirm.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete message'
    confirm.value = null
  } finally {
    busy.value = false
  }
}

function askDeleteSelected(): void {
  const count = selected.value.size
  askConfirm({
    title: 'Delete selected',
    message: `Permanently delete ${count} selected message${count > 1 ? 's' : ''}?`,
    confirmLabel: 'delete',
    danger: true,
    action: removeSelected,
  })
}

async function removeSelected(): Promise<void> {
  busy.value = true
  try {
    await deleteAdminChatMessages([...selected.value])
    confirm.value = null
    exitSelection()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete messages'
    confirm.value = null
  } finally {
    busy.value = false
  }
}

// â”€â”€ Delete all + global "delete after 72h" switch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** True when every visible message is scheduled for deletion in 72h. */
const allScheduled = computed(
  () => sorted.value.length > 0 && sorted.value.every((m) => m.delete_at),
)

/** Remaining time until the earliest scheduled deletion. */
function deleteAllIn(): string {
  const ats = sorted.value.map((m) => m.delete_at).filter(Boolean) as string[]
  if (ats.length === 0) return ''
  const ms = Math.min(...ats.map((s) => new Date(s).getTime())) - Date.now()
  if (ms <= 0) return 'deletingâ€¦'
  const h = Math.floor(ms / 3_600_000)
  const min = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${min}m`
  return `${min}m`
}

/** Toggle the 72h deletion for ALL visible messages (switch). */
function toggleAll72h(): void {
  const ids = sorted.value.map((m) => m.id)
  if (ids.length === 0) return
  const next = !allScheduled.value

  // Optimistic local update — only the rows' delete_at change, no table reload.
  const target = next ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() : null
  messages.value = messages.value.map((m) =>
    ids.includes(m.id) ? { ...m, delete_at: target } : m,
  )

  setAdminChatMessagesDeleteAfter(ids, next).catch((e) => {
    error.value = e instanceof Error ? e.message : 'Failed to update schedules'
    void load() // revert on failure
  })
}

function askDeleteAll(): void {
  const count = sorted.value.length
  askConfirm({
    title: 'Delete all',
    message: `Permanently delete all ${count} active message${count > 1 ? 's' : ''}?`,
    confirmLabel: 'delete all',
    danger: true,
    action: removeAll,
  })
}

async function removeAll(): Promise<void> {
  busy.value = true
  try {
    await deleteAdminChatMessages(sorted.value.map((m) => m.id))
    confirm.value = null
    exitSelection()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete messages'
    confirm.value = null
  } finally {
    busy.value = false
  }
}

// â”€â”€ Selection helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function enterSelection(): void {
  selectionMode.value = true
}

function exitSelection(): void {
  selectionMode.value = false
  selected.value = new Set()
}

function toggleSelect(id: number): void {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function toggleSelectAll(): void {
  if (allSelected.value) {
    const next = new Set(selected.value)
    pagedMessages.value.forEach((m) => next.delete(m.id))
    selected.value = next
  } else {
    const next = new Set(selected.value)
    pagedMessages.value.forEach((m) => next.add(m.id))
    selected.value = next
  }
}

function toggleArchived(): void {
  showArchived.value = !showArchived.value
  selectionMode.value = false
  selected.value = new Set()
  resetPage()
  void load()
}

function formatTime(iso: string): string {
  if (!iso) return 'â€”'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

onMounted(load)
</script>

<template>
  <AdminLayout active="aromin-chat" wide>
    <!-- â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
          chat moderation<span class="text-gray-400">.</span>
        </h1>
        <p class="mt-1.5 font-mono text-[12px] text-gray-500">
          // review &amp; moderate the community chat
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3.5 py-2 font-mono text-[12px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
        @click="toggleArchived"
      >
        {{ showArchived ? 'Show active' : 'Show archived' }}
      </button>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- â”€â”€ Table header + selection controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <template v-if="selectionMode">
        <label class="flex cursor-pointer select-none items-center gap-2">
          <input
            type="checkbox"
            class="h-4 w-4 cursor-pointer accent-ink"
            :checked="allSelected"
            :indeterminate.prop="someSelected"
            @change="toggleSelectAll"
          />
          <span class="font-mono text-[11px] text-gray-500">Select all</span>
        </label>
      </template>
      <p class="font-mono text-[11px] text-gray-500">
        // {{ showArchived ? 'archived' : 'messages' }} ({{ messages.length }})
      </p>
      <div class="ml-auto flex items-center gap-2">
        <button
          v-if="!selectionMode"
          type="button"
          class="rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink"
          aria-label="Select messages to delete"
          title="Select messages"
          @click="enterSelection"
        >
          <Trash2 class="h-4 w-4" :stroke-width="1.7" />
        </button>
        <button
          v-else
          type="button"
          class="rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink"
          aria-label="Cancel selection"
          @click="exitSelection"
        >
          <X class="h-4 w-4" :stroke-width="1.7" />
        </button>
      </div>
    </div>

    <!-- â”€â”€ Bulk action bar (selection mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <div
      v-if="selectionMode && selected.size > 0"
      class="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5"
    >
      <p class="font-mono text-[12px] font-semibold text-gray-600">{{ selected.size }} selected</p>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 font-mono text-[11.5px] font-semibold text-red-500 transition-colors hover:bg-red-50"
        @click="askDeleteSelected"
      >
        <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
        Delete selected
      </button>
      <button
        type="button"
        class="ml-auto rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink"
        aria-label="Cancel selection"
        @click="exitSelection"
      >
        <X class="h-4 w-4" :stroke-width="1.7" />
      </button>
    </div>

    <!-- â”€â”€ Moderation bar: Delete all + global 72h switch â”€â”€â”€â”€â”€â”€ -->
    <div
      v-if="sorted.length > 0"
      class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-gray-200 px-4 py-3"
    >
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 font-mono text-[11.5px] font-semibold text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
        @click="askDeleteAll"
      >
        <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
        Delete all
      </button>

      <div class="flex items-center gap-2.5">
        <span class="font-mono text-[11.5px] text-gray-500">Delete after 72h</span>
        <button
          type="button"
          role="switch"
          :aria-checked="allScheduled"
          :aria-label="'Delete all after 72 hours'"
          class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200"
          :class="[
            allScheduled
              ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
              : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
          ]"
          @click="toggleAll72h"
        >
          <span
            class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200 dark:bg-white"
            :class="allScheduled ? 'translate-x-[1.125rem]' : 'translate-x-0.5'"
          >
            <Check
              v-if="allScheduled"
              class="h-2.5 w-2.5 text-white dark:text-black"
              :stroke-width="3"
              aria-hidden="true"
            />
          </span>
        </button>
        <span v-if="allScheduled" class="font-mono text-[10.5px] text-gray-400">
          All delete in {{ deleteAllIn() }}
        </span>
      </div>
    </div>

    <!-- â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-14 skeleton rounded-lg border border-gray-200 bg-gray-50"></div>
    </div>

    <div
      v-else-if="sorted.length === 0"
      class="rounded-xl border border-dashed border-gray-200 p-10 text-center"
    >
      <p class="font-mono text-[12px] text-gray-500">
        {{ showArchived ? 'Nothing archived yet.' : 'No chat messages yet.' }}
      </p>
    </div>

    <div v-else class="overflow-x-auto rounded-lg border border-gray-200">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 font-mono text-[10.5px] uppercase tracking-wider text-gray-400">
            <th v-if="selectionMode" class="w-10 px-3 py-2.5 font-medium">
              <input
                type="checkbox"
                class="h-3.5 w-3.5 cursor-pointer accent-ink"
                :checked="allSelected"
                :indeterminate.prop="someSelected"
                :aria-label="'Select all messages'"
                @change="toggleSelectAll"
              />
            </th>
            <th class="px-3 py-2.5 font-medium">name</th>
            <th class="px-3 py-2.5 font-medium">chat</th>
            <th class="px-3 py-2.5 font-medium">ip</th>
            <th class="px-3 py-2.5 font-medium">location</th>
            <th class="px-3 py-2.5 font-medium">time</th>
            <th class="px-3 py-2.5 text-right font-medium">actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in pagedMessages"
            :key="m.id"
            class="border-b border-gray-100 transition-colors hover:bg-gray-50/60"
            :class="{ 'bg-gray-50/50': selected.has(m.id), 'opacity-60': showArchived }"
          >
            <td v-if="selectionMode" class="px-3 py-2.5">
              <input
                type="checkbox"
                class="h-3.5 w-3.5 cursor-pointer accent-ink"
                :checked="selected.has(m.id)"
                :aria-label="`Select message from ${m.name}`"
                @change="toggleSelect(m.id)"
              />
            </td>
            <td class="max-w-[160px] truncate px-3 py-2.5 font-mono text-[12px] font-semibold text-ink">
              {{ m.name }}
            </td>
            <td class="max-w-[420px] px-3 py-2.5">
              <p class="truncate text-[12.5px] text-gray-700" :title="m.message">{{ m.message }}</p>
            </td>
            <td class="px-3 py-2.5 font-mono text-[11px] text-gray-500">{{ m.ip || 'â€”' }}</td>
            <td class="px-3 py-2.5 font-mono text-[11px] text-gray-500">{{ m.location || 'â€”' }}</td>
            <td class="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-gray-500">
              {{ formatTime(m.created_at) }}
            </td>
            <td class="px-3 py-2.5">
              <div class="flex items-center justify-end gap-1">
                <button
                  type="button"
                  class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
                  :aria-label="`View full message from ${m.name}`"
                  title="View message"
                  @click="viewing = m"
                >
                  <Eye class="h-3.5 w-3.5" :stroke-width="1.7" />
                </button>
                <button
                  v-if="showArchived"
                  type="button"
                  class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
                  :aria-label="`Restore message from ${m.name}`"
                  title="Restore"
                  @click="restoreItem(m)"
                >
                  <ArchiveRestore class="h-3.5 w-3.5" :stroke-width="1.7" />
                </button>
                <template v-else>
                  <button
                    type="button"
                    class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
                    :aria-label="`Archive message from ${m.name}`"
                    title="Archive"
                    @click="archiveItem(m)"
                  >
                    <Archive class="h-3.5 w-3.5" :stroke-width="1.7" />
                  </button>
                </template>
                <button
                  type="button"
                  class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500"
                  :aria-label="`Delete message from ${m.name}`"
                  title="Delete"
                  @click="askDelete(m)"
                >
                  <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination — 10 messages per page (chat table only) -->
    <Pagination :total="sorted.length" :page-size="PAGE_SIZE" />

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400">
      <Clock class="h-3.5 w-3.5" :stroke-width="1.7" />
      toggling "delete after 72h" schedules all messages for removal — switch off to reset, on again for a fresh countdown
    </div>

    <!-- â”€â”€ Themed confirm dialog (delete) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <ConfirmModal
      :open="confirm !== null"
      :title="confirm?.title ?? ''"
      :message="confirm?.message ?? ''"
      :confirm-label="confirm?.confirmLabel ?? 'confirm'"
      :danger="confirm?.danger ?? false"
      :busy="busy"
      @confirm="confirm?.action()"
      @cancel="confirm = null"
    />

    <!-- Full-message viewer (eye icon) -->
    <Teleport to="body">
      <div
        v-if="viewing"
        class="fixed inset-0 z-[120] flex items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Full chat message"
      >
        <div class="absolute inset-0 bg-transparent backdrop-blur-xl" @click="viewing = null"></div>
        <div
          class="relative z-10 w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-300 dark:bg-gray-100"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="font-mono text-[13px] font-semibold text-ink">{{ viewing.name }}</p>
              <p class="mt-0.5 font-mono text-[10.5px] text-gray-400">
                {{ formatTime(viewing.created_at) }}
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-ink"
              aria-label="Close viewer"
              @click="viewing = null"
            >
              <X class="h-4 w-4" :stroke-width="1.7" />
            </button>
          </div>

          <p class="mt-4 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-[14px] leading-relaxed text-gray-700">
            {{ viewing.message }}
          </p>

          <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-200 pt-4 font-mono text-[11px] text-gray-500">
            <div>ip — <span class="text-ink">{{ viewing.ip || '—' }}</span></div>
            <div>location — <span class="text-ink">{{ viewing.location || '—' }}</span></div>
            <div>device — <span class="text-ink">{{ viewing.device || '—' }}</span></div>
            <div>delete_at — <span class="text-ink">{{ viewing.delete_at || '—' }}</span></div>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>
