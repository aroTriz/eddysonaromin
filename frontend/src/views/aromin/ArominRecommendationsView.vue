<script setup lang="ts">
/**
 * /aromin/recommendations — testimonials CMS. List, create, edit, delete,
 * archive & restore. Confirms destructive/save actions with a themed
 * blur modal (ConfirmModal). Bulk selection with select-all / delete-selected.
 */
import { Archive, ArchiveRestore, FileText, LoaderCircle, Pencil, Plus, Save, Trash2, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import {
  archiveAdminRecommendation,
  createAdminRecommendation,
  deleteAdminRecommendation,
  deleteAdminRecommendations,
  fetchAdminRecommendations,
  restoreAdminRecommendation,
  updateAdminRecommendation,
  type RecommendationInput,
} from '@/services/adminApi'
import type { Recommendation } from '@/types'

const items = ref<Recommendation[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const deleting = ref(false)
const showArchived = ref(false)

// Editor state
const editing = ref<Recommendation | null>(null)
const editorOpen = ref(false)
const form = ref<RecommendationInput>({ initials: '', quote: '', author: '', role: '', email: null })

// Bulk selection state
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

const sorted = computed(() =>
  [...items.value].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
)

const allSelected = computed(
  () => sorted.value.length > 0 && sorted.value.every((r) => selected.value.has(r.id)),
)
const someSelected = computed(
  () => sorted.value.some((r) => selected.value.has(r.id)) && !allSelected.value,
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    items.value = await fetchAdminRecommendations(showArchived.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load recommendations'
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

// -- Editor -------------------------------------------------------
function startNew(): void {
  editing.value = null
  editorOpen.value = true
  form.value = { initials: '', quote: '', author: '', role: '', email: null }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function startEdit(rec: Recommendation): void {
  editing.value = rec
  editorOpen.value = true
  form.value = {
    initials: rec.initials,
    quote: rec.quote,
    author: rec.author,
    role: rec.role,
    email: rec.email ?? null,
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit(): void {
  editing.value = null
  editorOpen.value = false
  form.value = { initials: '', quote: '', author: '', role: '', email: null }
}

/** Validate the form, then ask for confirmation before saving. */
function requestSave(): void {
  if (!form.value.initials.trim() || !form.value.quote.trim() || !form.value.author.trim() || !form.value.role.trim()) {
    error.value = 'Initials, quote, author and role are required.'
    return
  }
  askConfirm({
    title: 'Save changes',
    message: editing.value
      ? `Update the recommendation from "${editing.value.author}"?`
      : 'Add this recommendation to the wall?',
    confirmLabel: 'save',
    danger: false,
    action: save,
  })
}

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const payload: RecommendationInput = {
      initials: form.value.initials.trim().toUpperCase(),
      quote: form.value.quote.trim(),
      author: form.value.author.trim(),
      role: form.value.role.trim(),
      email: form.value.email?.trim() ? form.value.email.trim() : null,
    }
    if (editing.value) {
      await updateAdminRecommendation(editing.value.id, payload)
    } else {
      await createAdminRecommendation(payload)
    }
    confirm.value = null
    await load()
    cancelEdit()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save recommendation'
    confirm.value = null
  } finally {
    saving.value = false
  }
}

// -- Archive / restore --------------------------------------------
async function archiveItem(rec: Recommendation): Promise<void> {
  try {
    await archiveAdminRecommendation(rec.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to archive recommendation'
  }
}

async function restoreItem(rec: Recommendation): Promise<void> {
  try {
    await restoreAdminRecommendation(rec.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to restore recommendation'
  }
}

function toggleArchived(): void {
  showArchived.value = !showArchived.value
  selectionMode.value = false
  selected.value = new Set()
  void load()
}

// -- Delete (single + bulk) ---------------------------------------
function askDelete(rec: Recommendation): void {
  askConfirm({
    title: 'Delete recommendation',
    message: `Delete "${rec.author}"'s recommendation permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: () => remove(rec),
  })
}

async function remove(rec: Recommendation): Promise<void> {
  deleting.value = true
  try {
    await deleteAdminRecommendation(rec.id)
    const next = new Set(selected.value)
    next.delete(rec.id)
    selected.value = next
    confirm.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete recommendation'
    confirm.value = null
  } finally {
    deleting.value = false
  }
}

function askDeleteSelected(): void {
  const count = selected.value.size
  askConfirm({
    title: 'Delete selected',
    message: `Delete ${count} selected recommendation${count > 1 ? 's' : ''} permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: removeSelected,
  })
}

async function removeSelected(): Promise<void> {
  deleting.value = true
  try {
    await deleteAdminRecommendations([...selected.value])
    confirm.value = null
    exitSelection()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete recommendations'
    confirm.value = null
  } finally {
    deleting.value = false
  }
}

// -- Selection helpers --------------------------------------------
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
    sorted.value.forEach((r) => next.delete(r.id))
    selected.value = next
  } else {
    const next = new Set(selected.value)
    sorted.value.forEach((r) => next.add(r.id))
    selected.value = next
  }
}

onMounted(load)
</script>

<template>
  <AdminLayout active="aromin-recommendations">
    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
          recommendations<span class="text-gray-400">.</span>
        </h1>
        <p class="mt-1.5 font-mono text-[12px] text-gray-500">
          // manage testimonials from your network
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[12px] font-semibold text-bg transition-opacity hover:opacity-80"
        @click="startNew"
      >
        <Plus class="h-3.5 w-3.5" :stroke-width="2" />
        New recommendation
      </button>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- -- Editor (create / edit) ------------------------------- -->
    <div v-if="editorOpen" class="mb-8 rounded-xl border border-gray-200 bg-white p-6">
      <div class="mb-5 flex items-center justify-between">
        <p class="font-mono text-[11px] text-gray-500">
          // {{ editing ? `edit_recommendation — #${editing.id}` : 'new_recommendation' }}
        </p>
        <button
          type="button"
          class="rounded p-1 text-gray-400 hover:text-ink"
          aria-label="Close editor"
          @click="cancelEdit"
        >
          <X class="h-4 w-4" :stroke-width="1.7" />
        </button>
      </div>

      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="rec-initials">initials</label>
            <input
              id="rec-initials"
              v-model="form.initials"
              type="text"
              maxlength="8"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="e.g. LF"
            />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label class="font-mono text-[11px] text-gray-500" for="rec-author">author</label>
            <input
              id="rec-author"
              v-model="form.author"
              type="text"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="Full name or team"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="rec-role">role</label>
          <input
            id="rec-role"
            v-model="form.role"
            type="text"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="e.g. Instructor, SLU · Founder, MyVirtual Learning"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="rec-quote">quote</label>
          <textarea
            id="rec-quote"
            v-model="form.quote"
            rows="4"
            class="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] leading-relaxed text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="&quot;What they said about working with me...&quot;"
          ></textarea>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="rec-email">email (optional)</label>
          <input
            id="rec-email"
            v-model="form.email"
            type="email"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="contact@example.com"
          />
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
            :disabled="saving"
            @click="requestSave"
          >
            <LoaderCircle
              v-if="saving"
              class="h-4 w-4 animate-spin"
              :stroke-width="1.7"
            />
            <Save v-else class="h-4 w-4" :stroke-width="1.7" />
            {{ saving ? 'Saving...' : editing ? 'Update recommendation' : 'Add recommendation' }}
          </button>
          <button
            v-if="editing"
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2.5 font-mono text-[13px] text-gray-500 transition-colors hover:text-ink"
            @click="cancelEdit"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- -- List header: select-all + count + archive toggle ------ -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <template v-if="selectionMode">
        <label
          class="flex cursor-pointer select-none items-center gap-2"
          :title="allSelected ? 'Deselect all' : 'Select all recommendations'"
        >
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
        // {{ showArchived ? 'archived' : 'recommendations' }} ({{ items.length }})
      </p>
      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
          @click="toggleArchived"
        >
          {{ showArchived ? 'Show active' : 'Show archived' }}
        </button>
        <button
          v-if="!selectionMode"
          type="button"
          class="rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink"
          aria-label="Select recommendations to delete"
          title="Delete recommendations"
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

    <!-- -- Bulk action bar (visible while items are selected) -- -->
    <div
      v-if="selectionMode && selected.size > 0"
      class="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5"
    >
      <p class="font-mono text-[12px] font-semibold text-gray-600">{{ selected.size }} selected</p>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 font-mono text-[11.5px] font-semibold text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
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

    <!-- -- List ------------------------------------------------- -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-20 skeleton rounded-lg border border-gray-200 bg-gray-50"></div>
    </div>

    <div v-else-if="sorted.length === 0" class="rounded-xl border border-dashed border-gray-200 p-10 text-center">
      <p class="font-mono text-[12px] text-gray-500">
        {{ showArchived ? 'Nothing archived yet.' : 'No recommendations yet. Add your first one above!' }}
      </p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="rec in sorted"
        :key="rec.id"
        class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300"
        :class="{ 'border-gray-300': selected.has(rec.id), 'opacity-60': showArchived }"
      >
        <input
          v-if="selectionMode"
          type="checkbox"
          class="h-4 w-4 shrink-0 cursor-pointer accent-ink"
          :checked="selected.has(rec.id)"
          :aria-label="`Select ${rec.author}'s recommendation`"
          @change="toggleSelect(rec.id)"
        />
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[11px] font-medium text-gray-600">
          {{ rec.initials }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-mono text-[13px] font-semibold text-ink">{{ rec.author }}</p>
          <span
            class="mt-1 inline-flex max-w-full items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[10.5px] text-gray-500"
            :title="rec.role"
          >
            <span class="truncate">{{ rec.role }}</span>
          </span>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            v-if="showArchived"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
            :aria-label="`Restore ${rec.author}'s recommendation`"
            @click="restoreItem(rec)"
          >
            <ArchiveRestore class="h-3.5 w-3.5" :stroke-width="1.7" />
            Restore
          </button>
          <template v-else>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Edit ${rec.author}'s recommendation`"
              @click="startEdit(rec)"
            >
              <Pencil class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Archive ${rec.author}'s recommendation`"
              title="Archive"
              @click="archiveItem(rec)"
            >
              <Archive class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Delete ${rec.author}'s recommendation`"
              @click="askDelete(rec)"
            >
              <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
          </template>
        </div>
      </div>
    </div>

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400">
      <FileText class="h-3.5 w-3.5" :stroke-width="1.7" />
      edits appear instantly on /recommendations
    </div>

    <!-- -- Themed confirm dialog (delete / save) ----------------- -->
    <ConfirmModal
      :open="confirm !== null"
      :title="confirm?.title ?? ''"
      :message="confirm?.message ?? ''"
      :confirm-label="confirm?.confirmLabel ?? 'confirm'"
      :danger="confirm?.danger ?? false"
      :busy="saving || deleting"
      @confirm="confirm?.action()"
      @cancel="confirm = null"
    />
  </AdminLayout>
</template>
