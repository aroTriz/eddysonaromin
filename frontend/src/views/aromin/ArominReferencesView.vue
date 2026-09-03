<script setup lang="ts">
/**
 * /aromin/references — referrers / references CMS. Separate from
 * recommendations & certifications — own table, own routes.
 * List, create, edit, delete, archive & restore. Mirrors the
 * recommendations CMS pattern exactly (as checked on web).
 */
import { Archive, ArchiveRestore, FileText, LoaderCircle, Pencil, Plus, Save, Trash2, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import {
  archiveAdminReference,
  createAdminReference,
  deleteAdminReference,
  deleteAdminReferences,
  fetchAdminReferences,
  restoreAdminReference,
  updateAdminReference,
  uploadReferencePhoto,
  type ReferenceInput,
} from '@/services/adminApi'
import type { Reference } from '@/types'

const items = ref<Reference[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const deleting = ref(false)
const showArchived = ref(false)

// Editor state
const editing = ref<Reference | null>(null)
const editorOpen = ref(false)
const form = ref<ReferenceInput & { slug: string; summary: string; photo_url: string | null }>({ slug: '', initials: '', name: '', title: '', email: null, photo_url: null, summary: '', sort_order: 0 })
const photoUploading = ref(false)
const photoInputRef = ref<HTMLInputElement | null>(null)

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
    items.value = await fetchAdminReferences(showArchived.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load references'
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
function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function startNew(): void {
  editing.value = null
  editorOpen.value = true
  form.value = { slug: '', initials: '', name: '', title: '', email: null, photo_url: null, summary: '', sort_order: items.value.length }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function startEdit(refItem: Reference): void {
  editing.value = refItem
  editorOpen.value = true
  form.value = {
    slug: refItem.slug,
    initials: refItem.initials,
    name: refItem.name,
    title: refItem.title,
    email: refItem.email ?? null,
    photo_url: refItem.photo_url ?? null,
    summary: refItem.summary ?? '',
    sort_order: refItem.sort_order,
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit(): void {
  editing.value = null
  editorOpen.value = false
  form.value = { slug: '', initials: '', name: '', title: '', email: null, photo_url: null, summary: '', sort_order: 0 }
}

async function onPhotoPicked(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  photoUploading.value = true
  error.value = ''
  try {
    const { url } = await uploadReferencePhoto(file)
    form.value.photo_url = url
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to upload photo'
  } finally {
    photoUploading.value = false
    if (input) input.value = ''
  }
}

function removePhoto(): void {
  form.value.photo_url = null
}

/** Validate the form, then ask for confirmation before saving. */
function requestSave(): void {
  if (!form.value.initials.trim() || !form.value.name.trim() || !form.value.title.trim()) {
    error.value = 'Initials, name and title are required.'
    return
  }
  askConfirm({
    title: 'Save changes',
    message: editing.value
      ? `Update reference "${editing.value.name}"?`
      : 'Add this reference to the site?',
    confirmLabel: 'save',
    danger: false,
    action: save,
  })
}

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const payload: ReferenceInput = {
      slug: form.value.slug.trim() ? slugify(form.value.slug) : undefined,
      initials: form.value.initials.trim().toUpperCase(),
      name: form.value.name.trim(),
      title: form.value.title.trim(),
      email: form.value.email?.trim() ? form.value.email.trim() : null,
      photo_url: form.value.photo_url || null,
      summary: form.value.summary?.trim() ? form.value.summary.trim() : null,
      sort_order: Number.isFinite(form.value.sort_order) ? form.value.sort_order : 0,
    }
    if (editing.value) {
      await updateAdminReference(editing.value.id, payload)
    } else {
      await createAdminReference(payload)
    }
    confirm.value = null
    await load()
    cancelEdit()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save reference'
    confirm.value = null
  } finally {
    saving.value = false
  }
}

// -- Archive / restore --------------------------------------------
async function archiveItem(refItem: Reference): Promise<void> {
  try {
    await archiveAdminReference(refItem.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to archive reference'
  }
}

async function restoreItem(refItem: Reference): Promise<void> {
  try {
    await restoreAdminReference(refItem.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to restore reference'
  }
}

function toggleArchived(): void {
  showArchived.value = !showArchived.value
  selectionMode.value = false
  selected.value = new Set()
  void load()
}

// -- Delete (single + bulk) ---------------------------------------
function askDelete(refItem: Reference): void {
  askConfirm({
    title: 'Delete reference',
    message: `Delete "${refItem.name}" permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: () => remove(refItem),
  })
}

async function remove(refItem: Reference): Promise<void> {
  deleting.value = true
  try {
    await deleteAdminReference(refItem.id)
    const next = new Set(selected.value)
    next.delete(refItem.id)
    selected.value = next
    confirm.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete reference'
    confirm.value = null
  } finally {
    deleting.value = false
  }
}

function askDeleteSelected(): void {
  const count = selected.value.size
  askConfirm({
    title: 'Delete selected',
    message: `Delete ${count} selected reference${count > 1 ? 's' : ''} permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: removeSelected,
  })
}

async function removeSelected(): Promise<void> {
  deleting.value = true
  try {
    await deleteAdminReferences([...selected.value])
    confirm.value = null
    exitSelection()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete references'
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
  <AdminLayout active="aromin-references">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
          references<span class="text-gray-400">.</span>
        </h1>
        <p class="mt-1.5 font-mono text-[12px] text-gray-500">
          // manage referrers — separate from recommendations
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[12px] font-semibold text-bg transition-opacity hover:opacity-80"
        @click="startNew"
      >
        <Plus class="h-3.5 w-3.5" :stroke-width="2" />
        New reference
      </button>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- -- Editor (create / edit) ------------------------------- -->
    <div v-if="editorOpen" class="mb-8 rounded-xl border border-gray-200 bg-white p-6">
      <div class="mb-5 flex items-center justify-between">
        <p class="font-mono text-[11px] text-gray-500">
          // {{ editing ? `edit_reference — #${editing.id}` : 'new_reference' }}
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
            <label class="font-mono text-[11px] text-gray-500" for="ref-initials">initials *</label>
            <input
              id="ref-initials"
              v-model="form.initials"
              type="text"
              maxlength="8"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="e.g. LF"
            />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label class="font-mono text-[11px] text-gray-500" for="ref-name">name *</label>
            <input
              id="ref-name"
              v-model="form.name"
              type="text"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="Full name"
            />
          </div>
        </div>

        <!-- Photo -->
        <div class="flex items-start gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500">photo</label>
            <div class="flex items-center gap-3">
              <div v-if="form.photo_url" class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white p-1.5">
                <img :src="form.photo_url" alt="preview" class="h-full w-full object-contain" />
              </div>
              <div v-else class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 font-mono text-[13px] font-semibold text-gray-400">
                {{ form.initials || '?' }}
              </div>
              <div class="flex flex-col gap-1.5">
                <input ref="photoInputRef" type="file" accept="image/*" class="hidden" @change="onPhotoPicked" />
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 font-mono text-[11.5px] text-gray-600 transition-colors hover:border-gray-300 hover:text-ink disabled:opacity-50"
                  :disabled="photoUploading"
                  @click="photoInputRef?.click()"
                >
                  <LoaderCircle v-if="photoUploading" class="h-3.5 w-3.5 animate-spin" :stroke-width="1.7" />
                  <span>{{ photoUploading ? 'Uploading…' : form.photo_url ? 'Change photo' : 'Add photo' }}</span>
                </button>
                <button
                  v-if="form.photo_url"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] text-red-500 hover:text-red-600"
                  @click="removePhoto"
                >
                  <Trash2 class="h-3 w-3" :stroke-width="1.7" />
                  Remove photo
                </button>
              </div>
            </div>
            <p class="font-mono text-[10.5px] text-gray-400">PNG/JPG max ~3 MB. PRAXXYS uses /images/logos/praxxys-logo.png</p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label class="font-mono text-[11px] text-gray-500" for="ref-title">title / role *</label>
            <input
              id="ref-title"
              v-model="form.title"
              type="text"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="e.g. University Instructor — Saint Louis University"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="ref-slug">slug (auto)</label>
            <input
              id="ref-slug"
              v-model="form.slug"
              type="text"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="auto from name"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="ref-summary">summary</label>
          <textarea
            id="ref-summary"
            v-model="form.summary"
            rows="3"
            class="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] leading-relaxed text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="Short bio — can speak to..."
          ></textarea>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="ref-email">email (optional)</label>
            <input
              id="ref-email"
              v-model="form.email"
              type="email"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="contact@example.com"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="ref-order">sort order</label>
            <input
              id="ref-order"
              v-model.number="form.sort_order"
              type="number"
              min="0"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            />
          </div>
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
            {{ saving ? 'Saving...' : editing ? 'Update reference' : 'Add reference' }}
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
          :title="allSelected ? 'Deselect all' : 'Select all references'"
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
        // {{ showArchived ? 'archived' : 'references' }} ({{ items.length }})
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
          aria-label="Select references to delete"
          title="Delete references"
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
        {{ showArchived ? 'Nothing archived yet.' : 'No references yet. Add your first one above!' }}
      </p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="refItem in sorted"
        :key="refItem.id"
        class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300"
        :class="{ 'border-gray-300': selected.has(refItem.id), 'opacity-60': showArchived }"
      >
        <input
          v-if="selectionMode"
          type="checkbox"
          class="h-4 w-4 shrink-0 cursor-pointer accent-ink"
          :checked="selected.has(refItem.id)"
          :aria-label="`Select ${refItem.name}'s reference`"
          @change="toggleSelect(refItem.id)"
        />
        <div v-if="refItem.photo_url" class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white p-1">
          <img :src="refItem.photo_url" :alt="refItem.name" class="h-full w-full object-contain" loading="lazy" />
        </div>
        <div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[11px] font-medium text-gray-600">
          {{ refItem.initials }}
        </div>
        <div class="min-w-0 flex-1 overflow-hidden">
          <p class="truncate font-mono text-[13px] font-semibold text-ink" :title="refItem.name">{{ refItem.name }}</p>
          <span
            class="mt-1 inline-flex max-w-full items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[10.5px] text-gray-500"
            :title="refItem.title"
          >
            <span class="truncate">{{ refItem.title }}</span>
          </span>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            v-if="showArchived"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
            :aria-label="`Restore ${refItem.name}'s reference`"
            @click="restoreItem(refItem)"
          >
            <ArchiveRestore class="h-3.5 w-3.5" :stroke-width="1.7" />
            Restore
          </button>
          <template v-else>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Edit ${refItem.name}'s reference`"
              @click="startEdit(refItem)"
            >
              <Pencil class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Archive ${refItem.name}'s reference`"
              title="Archive"
              @click="archiveItem(refItem)"
            >
              <Archive class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Delete ${refItem.name}'s reference`"
              @click="askDelete(refItem)"
            >
              <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
          </template>
        </div>
      </div>
    </div>

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400">
      <FileText class="h-3.5 w-3.5" :stroke-width="1.7" />
      edits appear instantly on /certifications → references
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
