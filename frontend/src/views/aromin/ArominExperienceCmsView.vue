<script setup lang="ts">
/**
 * /aromin/experience — Experience & Education CMS.
 * List, create, edit, delete, archive & restore experience entries.
 * Image uploads (logo, album photos, certificates) use real file uploads,
 * NOT URL links. Certificates and gallery support multiple images.
 */
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Award,
  Briefcase,
  GraduationCap,
  ImagePlus,
  Images,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import {
  archiveAdminExperience,
  createAdminExperience,
  deleteAdminExperience,
  deleteAdminExperiences,
  fetchAdminExperiences,
  restoreAdminExperience,
  updateAdminExperience,
  uploadExperienceImage,
  type ExperienceInput,
} from '@/services/adminApi'
import type { ExperienceEntry } from '@/types'

const items = ref<ExperienceEntry[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const deleting = ref(false)
const showArchived = ref(false)

// Filter
const typeFilter = ref<'all' | 'experience' | 'education'>('all')
const typeOptions = ['all', 'experience', 'education'] as const

const filteredItems = computed(() =>
  typeFilter.value === 'all'
    ? items.value
    : items.value.filter((e) => e.type === typeFilter.value),
)

// Editor state
const editing = ref<ExperienceEntry | null>(null)
const editorOpen = ref(false)
const form = ref<ExperienceInput>({
  type: 'experience',
  period: '',
  year: '',
  tag: 'Professional',
  title: '',
  company: '',
  logo_url: null,
  website_url: null,
  tooltip_desc: null,
  albums: [],
  certificates: [],
  description: '',
  highlights: [],
  sort_order: 0,
})
const highlightInput = ref('')

// Image upload state
const uploadingLogo = ref(false)
const uploadingAlbum = ref(false)
const uploadingCert = ref(false)
const logoInput = ref<HTMLInputElement | null>(null)
const albumInput = ref<HTMLInputElement | null>(null)
const certInput = ref<HTMLInputElement | null>(null)

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

const allSelected = computed(
  () => items.value.length > 0 && items.value.every((e) => selected.value.has(e.id)),
)
const someSelected = computed(
  () => items.value.some((e) => selected.value.has(e.id)) && !allSelected.value,
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    items.value = await fetchAdminExperiences(showArchived.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load experiences'
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

// ── Highlights editor ─────────────────────────────────────────────

function addHighlight(): void {
  const h = highlightInput.value.trim()
  if (h && !form.value.highlights?.includes(h)) form.value.highlights?.push(h)
  highlightInput.value = ''
}

function removeHighlight(index: number): void {
  form.value.highlights?.splice(index, 1)
}

// ── Image uploads (real file uploads, NOT URL links) ──────────────

/** Upload logo image. */
async function onLogoFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploadingLogo.value = true
  error.value = ''
  try {
    const { url } = await uploadExperienceImage(file)
    form.value.logo_url = url
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Logo upload failed'
  } finally {
    uploadingLogo.value = false
  }
}

/** Upload album (gallery) image — appends to albums array. */
async function onAlbumFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploadingAlbum.value = true
  error.value = ''
  try {
    const { url } = await uploadExperienceImage(file)
    if (!form.value.albums) form.value.albums = []
    form.value.albums.push(url)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Album upload failed'
  } finally {
    uploadingAlbum.value = false
  }
}

/** Upload certificate image — appends to certificates array. */
async function onCertFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploadingCert.value = true
  error.value = ''
  try {
    const { url } = await uploadExperienceImage(file)
    if (!form.value.certificates) form.value.certificates = []
    form.value.certificates.push(url)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Certificate upload failed'
  } finally {
    uploadingCert.value = false
  }
}

/** Remove album image at index. */
function removeAlbumImage(index: number): void {
  form.value.albums?.splice(index, 1)
}

/** Remove certificate image at index. */
function removeCertImage(index: number): void {
  form.value.certificates?.splice(index, 1)
}

/** Reorder album images. */
function moveAlbum(index: number, dir: -1 | 1): void {
  const list = form.value.albums ?? []
  const target = index + dir
  if (target < 0 || target >= list.length) return
  const tmp = list[index]
  list[index] = list[target]
  list[target] = tmp
}

/** Reorder certificate images. */
function moveCert(index: number, dir: -1 | 1): void {
  const list = form.value.certificates ?? []
  const target = index + dir
  if (target < 0 || target >= list.length) return
  const tmp = list[index]
  list[index] = list[target]
  list[target] = tmp
}

// ── Editor actions ────────────────────────────────────────────────

function startNew(): void {
  editing.value = null
  editorOpen.value = true
  form.value = {
    type: 'experience',
    period: '',
    year: '',
    tag: 'Professional',
    title: '',
    company: '',
    logo_url: null,
    website_url: null,
    tooltip_desc: null,
    albums: [],
    certificates: [],
    description: '',
    highlights: [],
    sort_order: 0,
  }
  highlightInput.value = ''
  error.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function startEdit(entry: ExperienceEntry): void {
  editing.value = entry
  editorOpen.value = true
  form.value = {
    type: entry.type,
    period: entry.period,
    year: entry.year,
    tag: entry.tag,
    title: entry.title,
    company: entry.company,
    logo_url: entry.logo_url,
    website_url: entry.website_url,
    tooltip_desc: entry.tooltip_desc,
    albums: [...(entry.albums ?? [])],
    certificates: [...(entry.certificates ?? [])],
    description: entry.description,
    highlights: [...(entry.highlights ?? [])],
    sort_order: entry.sort_order,
  }
  highlightInput.value = ''
  error.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit(): void {
  editing.value = null
  editorOpen.value = false
}

function requestSave(): void {
  if (!form.value.period.trim()) { error.value = 'Period is required.'; return }
  if (!form.value.year.trim()) { error.value = 'Year is required.'; return }
  if (!form.value.tag.trim()) { error.value = 'Tag is required.'; return }
  if (!form.value.title.trim()) { error.value = 'Title is required.'; return }
  if (!form.value.company.trim()) { error.value = 'Company / school is required.'; return }

  askConfirm({
    title: 'Save changes',
    message: editing.value
      ? `Update "${form.value.company.trim()}" entry?`
      : `Create "${form.value.company.trim()}" entry?`,
    confirmLabel: 'save',
    danger: false,
    action: save,
  })
}

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const payload: ExperienceInput = {
      type: form.value.type,
      period: form.value.period.trim(),
      year: form.value.year.trim(),
      tag: form.value.tag.trim(),
      title: form.value.title.trim(),
      company: form.value.company.trim(),
      logo_url: form.value.logo_url ?? null,
      website_url: form.value.website_url?.trim() || null,
      tooltip_desc: form.value.tooltip_desc?.trim() || null,
      albums: form.value.albums ?? [],
      certificates: form.value.certificates ?? [],
      description: form.value.description?.trim() || '',
      highlights: form.value.highlights ?? [],
      sort_order: form.value.sort_order ?? 0,
    }
    if (editing.value) {
      await updateAdminExperience(editing.value.id, payload)
    } else {
      await createAdminExperience(payload)
    }
    confirm.value = null
    await load()
    cancelEdit()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save'
    confirm.value = null
  } finally {
    saving.value = false
  }
}

// ── Archive / restore ─────────────────────────────────────────────

async function archiveItem(entry: ExperienceEntry): Promise<void> {
  try { await archiveAdminExperience(entry.id); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed to archive' }
}

async function restoreItem(entry: ExperienceEntry): Promise<void> {
  try { await restoreAdminExperience(entry.id); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Failed to restore' }
}

function toggleArchived(): void {
  showArchived.value = !showArchived.value
  selectionMode.value = false
  selected.value = new Set()
  void load()
}

// ── Delete (single + bulk) ────────────────────────────────────────

function askDelete(entry: ExperienceEntry): void {
  askConfirm({
    title: 'Delete entry',
    message: `Delete "${entry.company}" permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: () => remove(entry),
  })
}

async function remove(entry: ExperienceEntry): Promise<void> {
  deleting.value = true
  try {
    await deleteAdminExperience(entry.id)
    const next = new Set(selected.value)
    next.delete(entry.id)
    selected.value = next
    confirm.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete'
    confirm.value = null
  } finally {
    deleting.value = false
  }
}

function askDeleteSelected(): void {
  const count = selected.value.size
  askConfirm({
    title: 'Delete selected',
    message: `Delete ${count} selected entr${count > 1 ? 'ies' : 'y'} permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: removeSelected,
  })
}

async function removeSelected(): Promise<void> {
  deleting.value = true
  try {
    await deleteAdminExperiences([...selected.value])
    confirm.value = null
    exitSelection()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete entries'
    confirm.value = null
  } finally {
    deleting.value = false
  }
}

// ── Selection helpers ─────────────────────────────────────────────

function enterSelection(): void { selectionMode.value = true }
function exitSelection(): void { selectionMode.value = false; selected.value = new Set() }

function toggleSelect(id: number): void {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function toggleSelectAll(): void {
  if (allSelected.value) {
    const next = new Set(selected.value)
    items.value.forEach((e) => next.delete(e.id))
    selected.value = next
  } else {
    const next = new Set(selected.value)
    items.value.forEach((e) => next.add(e.id))
    selected.value = next
  }
}

onMounted(load)
</script>

<template>
  <AdminLayout active="aromin-experience" wide>
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
          experience<span class="text-gray-400">.</span>
        </h1>
        <p class="mt-1.5 font-mono text-[12px] text-gray-500">
          // manage work experience &amp; education entries · upload logos, gallery &amp; certificates
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[12px] font-semibold text-bg transition-opacity hover:opacity-80"
        @click="startNew"
      >
        <Plus class="h-3.5 w-3.5" :stroke-width="2" />
        New entry
      </button>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- ── Editor (create / edit) ────────────────────────────── -->
    <div v-if="editorOpen" class="mb-8 rounded-xl border border-gray-200 bg-white p-6">
      <div class="mb-5 flex items-center justify-between">
        <p class="font-mono text-[11px] text-gray-500">
          // {{ editing ? `edit_entry — #${editing.id}` : 'new_entry' }}
        </p>
        <button type="button" class="rounded p-1 text-gray-400 hover:text-ink" aria-label="Close editor" @click="cancelEdit">
          <X class="h-4 w-4" :stroke-width="1.7" />
        </button>
      </div>

      <div class="flex flex-col gap-4">
        <!-- Type selector -->
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="exp-type">type</label>
          <div class="flex overflow-hidden rounded-md border border-gray-200">
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 font-mono text-[12px] transition-colors"
              :class="form.type === 'experience' ? 'bg-ink text-bg' : 'text-gray-500 hover:text-ink'"
              @click="form.type = 'experience'"
            >
              <Briefcase class="h-3.5 w-3.5" :stroke-width="1.7" />
              Experience
            </button>
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 font-mono text-[12px] transition-colors"
              :class="form.type === 'education' ? 'bg-ink text-bg' : 'text-gray-500 hover:text-ink'"
              @click="form.type = 'education'"
            >
              <GraduationCap class="h-3.5 w-3.5" :stroke-width="1.7" />
              Education
            </button>
          </div>
        </div>

        <!-- Company / School name -->
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="exp-company">
            {{ form.type === 'education' ? 'school name' : 'company name' }}
          </label>
          <input
            id="exp-company"
            v-model="form.company"
            type="text"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            :placeholder="form.type === 'education' ? 'e.g. Saint Louis University' : 'e.g. PRAXXYS Solutions Inc.'"
          />
        </div>

        <!-- Title -->
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="exp-title">
            {{ form.type === 'education' ? 'degree / program' : 'job title' }}
          </label>
          <input
            id="exp-title"
            v-model="form.title"
            type="text"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            :placeholder="form.type === 'education' ? 'e.g. BS Information Technology' : 'e.g. Junior Front-End Developer'"
          />
        </div>

        <!-- Period + Year + Tag -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="exp-period">period</label>
            <input
              id="exp-period"
              v-model="form.period"
              type="text"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="e.g. Nov 2025 — Jun 2026"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="exp-year">year</label>
            <input
              id="exp-year"
              v-model="form.year"
              type="text"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="e.g. 2025 — 2026"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="exp-tag">tag</label>
            <input
              id="exp-tag"
              v-model="form.tag"
              type="text"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              :placeholder="form.type === 'education' ? 'e.g. Graduated' : 'e.g. Professional'"
            />
          </div>
        </div>

        <!-- Website URL -->
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="exp-url">website url</label>
          <input
            id="exp-url"
            v-model="form.website_url"
            type="text"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="https://..."
          />
        </div>

        <!-- Tooltip description -->
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="exp-tooltip">tooltip description</label>
          <input
            id="exp-tooltip"
            v-model="form.tooltip_desc"
            type="text"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="Short description shown on hover"
          />
        </div>

        <!-- Sort order -->
        <div class="w-32 flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="exp-order">sort order</label>
          <input
            id="exp-order"
            v-model.number="form.sort_order"
            type="number"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="0"
          />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="exp-desc">
            {{ form.type === 'education' ? 'detail' : 'description' }}
          </label>
          <textarea
            id="exp-desc"
            v-model="form.description"
            rows="3"
            class="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] leading-relaxed text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="Full description of your role / program"
          ></textarea>
        </div>

        <!-- Highlights (experience only) -->
        <div v-if="form.type === 'experience'" class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="exp-highlights">highlights</label>
          <div class="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 transition-colors focus-within:border-gray-400">
            <span
              v-for="(h, i) in form.highlights"
              :key="i"
              class="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-500"
            >
              {{ h }}
              <button type="button" class="text-gray-400 hover:text-red-500" :aria-label="`Remove highlight`" @click="removeHighlight(i)">
                <X class="h-3 w-3" />
              </button>
            </span>
            <input
              id="exp-highlights"
              v-model="highlightInput"
              type="text"
              class="min-w-[120px] flex-1 bg-transparent py-0.5 font-mono text-[16px] text-ink outline-none"
              placeholder="Type a highlight and press Enter"
              @keydown.enter.prevent="addHighlight"
            />
          </div>
        </div>

        <!-- ── Logo upload ──────────────────────────────────── -->
        <div class="flex flex-col gap-1.5">
          <span class="font-mono text-[11px] text-gray-500">
            {{ form.type === 'education' ? 'school logo' : 'company logo' }}
          </span>
          <div class="flex items-center gap-3">
            <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
              <img v-if="form.logo_url" :src="form.logo_url" class="h-full w-full object-contain p-1" alt="Logo preview" />
              <Images v-else class="h-5 w-5 text-gray-300" :stroke-width="1.5" />
            </div>
            <div class="flex flex-col gap-1.5">
              <button
                type="button"
                class="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink disabled:opacity-50"
                :disabled="uploadingLogo"
                @click="logoInput?.click()"
              >
                <LoaderCircle v-if="uploadingLogo" class="h-3.5 w-3.5 animate-spin" :stroke-width="1.7" />
                <ImagePlus v-else class="h-3.5 w-3.5" :stroke-width="1.7" />
                {{ uploadingLogo ? 'Uploading...' : form.logo_url ? 'Replace' : 'Upload' }}
              </button>
              <button
                v-if="form.logo_url"
                type="button"
                class="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-red-200 hover:text-red-500"
                @click="form.logo_url = null"
              >
                <X class="h-3.5 w-3.5" :stroke-width="1.7" />
                Remove
              </button>
              <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="onLogoFileChange" />
            </div>
          </div>
          <p class="font-mono text-[10px] text-gray-400">PNG, JPG, or SVG · max ~3 MB</p>
        </div>

        <!-- ── Album (gallery) images — multiple upload ─────── -->
        <div class="flex flex-col gap-1.5">
          <p class="flex items-center justify-between gap-2 font-mono text-[11px] text-gray-500">
            <span class="inline-flex items-center gap-1.5">
              <Images class="h-3.5 w-3.5" :stroke-width="1.7" />
              gallery photos
              <span class="text-gray-400">({{ form.albums?.length ?? 0 }})</span>
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink disabled:opacity-50"
              :disabled="uploadingAlbum"
              @click="albumInput?.click()"
            >
              <LoaderCircle v-if="uploadingAlbum" class="h-3.5 w-3.5 animate-spin" :stroke-width="1.7" />
              <Plus v-else class="h-3.5 w-3.5" :stroke-width="1.7" />
              {{ uploadingAlbum ? 'Uploading...' : 'Add photo' }}
            </button>
          </p>
          <div v-if="form.albums?.length" class="flex flex-wrap gap-2">
            <div
              v-for="(img, i) in form.albums"
              :key="i"
              class="group relative h-20 w-28 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
            >
              <img :src="img" class="h-full w-full object-cover" loading="lazy" :alt="`Album photo ${i + 1}`" />
              <div class="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/60 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" class="p-0.5 text-white hover:text-gray-300 disabled:opacity-30" :disabled="i === 0" @click="moveAlbum(i, -1)">
                  <ArrowUp class="h-3 w-3" :stroke-width="2" />
                </button>
                <button type="button" class="p-0.5 text-white hover:text-gray-300 disabled:opacity-30" :disabled="i >= (form.albums?.length ?? 0) - 1" @click="moveAlbum(i, 1)">
                  <ArrowDown class="h-3 w-3" :stroke-width="2" />
                </button>
                <button type="button" class="p-0.5 text-white hover:text-red-400" @click="removeAlbumImage(i)">
                  <X class="h-3 w-3" :stroke-width="2" />
                </button>
              </div>
            </div>
          </div>
          <p v-else class="font-mono text-[10px] text-gray-400">No photos yet — click "Add photo" to upload</p>
          <input ref="albumInput" type="file" accept="image/*" class="hidden" @change="onAlbumFileChange" />
        </div>

        <!-- ── Certificates images — multiple upload ──────── -->
        <div class="flex flex-col gap-1.5">
          <p class="flex items-center justify-between gap-2 font-mono text-[11px] text-gray-500">
            <span class="inline-flex items-center gap-1.5">
              <Award class="h-3.5 w-3.5" :stroke-width="1.7" />
              certificates
              <span class="text-gray-400">({{ form.certificates?.length ?? 0 }})</span>
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink disabled:opacity-50"
              :disabled="uploadingCert"
              @click="certInput?.click()"
            >
              <LoaderCircle v-if="uploadingCert" class="h-3.5 w-3.5 animate-spin" :stroke-width="1.7" />
              <Plus v-else class="h-3.5 w-3.5" :stroke-width="1.7" />
              {{ uploadingCert ? 'Uploading...' : 'Add certificate' }}
            </button>
          </p>
          <div v-if="form.certificates?.length" class="flex flex-wrap gap-2">
            <div
              v-for="(img, i) in form.certificates"
              :key="i"
              class="group relative h-20 w-28 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
            >
              <img :src="img" class="h-full w-full object-cover" loading="lazy" :alt="`Certificate ${i + 1}`" />
              <div class="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/60 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" class="p-0.5 text-white hover:text-gray-300 disabled:opacity-30" :disabled="i === 0" @click="moveCert(i, -1)">
                  <ArrowUp class="h-3 w-3" :stroke-width="2" />
                </button>
                <button type="button" class="p-0.5 text-white hover:text-gray-300 disabled:opacity-30" :disabled="i >= (form.certificates?.length ?? 0) - 1" @click="moveCert(i, 1)">
                  <ArrowDown class="h-3 w-3" :stroke-width="2" />
                </button>
                <button type="button" class="p-0.5 text-white hover:text-red-400" @click="removeCertImage(i)">
                  <X class="h-3 w-3" :stroke-width="2" />
                </button>
              </div>
            </div>
          </div>
          <p v-else class="font-mono text-[10px] text-gray-400">No certificates yet — click "Add certificate" to upload</p>
          <input ref="certInput" type="file" accept="image/*" class="hidden" @change="onCertFileChange" />
        </div>

        <!-- Save / Cancel -->
        <div class="flex gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
            :disabled="saving"
            @click="requestSave"
          >
            <LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" :stroke-width="1.7" />
            <Save v-else class="h-4 w-4" :stroke-width="1.7" />
            {{ saving ? 'Saving...' : editing ? 'Update entry' : 'Create entry' }}
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

    <!-- ── List header + filters ────────────────────────────── -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <template v-if="selectionMode">
        <label class="flex cursor-pointer select-none items-center gap-2" :title="allSelected ? 'Deselect all' : 'Select all'">
          <input type="checkbox" class="h-4 w-4 cursor-pointer accent-ink" :checked="allSelected" :indeterminate.prop="someSelected" @change="toggleSelectAll" />
          <span class="font-mono text-[11px] text-gray-500">Select all</span>
        </label>
      </template>
      <p class="font-mono text-[11px] text-gray-500">
        // {{ showArchived ? 'archived' : 'entries' }} ({{ filteredItems.length }})
      </p>

      <div class="ml-auto flex flex-wrap items-center gap-2">
        <!-- Type filter -->
        <div class="flex overflow-hidden rounded-md border border-gray-200" role="group" aria-label="Filter by type">
          <button
            v-for="opt in typeOptions"
            :key="opt"
            type="button"
            class="px-2.5 py-1.5 font-mono text-[11.5px] transition-colors"
            :class="typeFilter === opt ? 'bg-ink text-bg' : 'text-gray-500 hover:text-ink'"
            @click="typeFilter = opt"
          >
            {{ opt }}
          </button>
        </div>

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
          aria-label="Select entries to delete"
          title="Delete entries"
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

    <!-- ── Bulk action bar ──────────────────────────────────── -->
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
      <button type="button" class="ml-auto rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink" aria-label="Cancel selection" @click="exitSelection">
        <X class="h-4 w-4" :stroke-width="1.7" />
      </button>
    </div>

    <!-- ── Loading / empty states ───────────────────────────── -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-14 skeleton rounded-lg border border-gray-200 bg-gray-50"></div>
    </div>

    <div v-else-if="items.length === 0" class="rounded-xl border border-dashed border-gray-200 p-10 text-center">
      <p class="font-mono text-[12px] text-gray-500">
        {{ showArchived ? 'Nothing archived yet.' : 'No entries yet. Create your first one above!' }}
      </p>
    </div>

    <!-- ── Entry list ───────────────────────────────────────── -->
    <div v-else class="space-y-2">
      <p
        v-if="filteredItems.length === 0"
        class="rounded-xl border border-dashed border-gray-200 p-8 text-center font-mono text-[12px] text-gray-500"
      >
        // no entries match this filter — try another type
      </p>
      <div
        v-for="entry in filteredItems"
        :key="entry.id"
        class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300"
        :class="{ 'border-gray-300': selected.has(entry.id), 'opacity-60': showArchived }"
      >
        <input
          v-if="selectionMode"
          type="checkbox"
          class="h-4 w-4 shrink-0 cursor-pointer accent-ink"
          :checked="selected.has(entry.id)"
          :aria-label="`Select ${entry.company}`"
          @change="toggleSelect(entry.id)"
        />

        <!-- Logo thumbnail -->
        <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
          <img v-if="entry.logo_url" :src="entry.logo_url" class="h-full w-full object-contain p-0.5" :alt="`${entry.company} logo`" loading="lazy" />
          <component :is="entry.type === 'education' ? GraduationCap : Briefcase" v-else class="h-4 w-4 text-gray-300" :stroke-width="1.5" />
        </div>

        <div class="min-w-0 flex-1">
          <p class="flex items-center gap-2 truncate font-mono text-[13px] font-semibold text-ink">
            {{ entry.company }}
            <span class="shrink-0 rounded border border-gray-200 px-1.5 py-0.5 font-mono text-[10px] font-normal text-gray-400">
              {{ entry.type }}
            </span>
          </p>
          <p class="mt-0.5 truncate font-mono text-[11px] text-gray-400">
            {{ entry.title }} · {{ entry.period }}
            <template v-if="entry.albums.length || entry.certificates.length">
              · {{ entry.albums.length }} photos / {{ entry.certificates.length }} certs
            </template>
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <button
            v-if="showArchived"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
            @click="restoreItem(entry)"
          >
            <ArchiveRestore class="h-3.5 w-3.5" :stroke-width="1.7" />
            Restore
          </button>
          <template v-else>
            <button type="button" class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink" :aria-label="`Edit ${entry.company}`" @click="startEdit(entry)">
              <Pencil class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
            <button type="button" class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink" :aria-label="`Archive ${entry.company}`" title="Archive" @click="archiveItem(entry)">
              <Archive class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
            <button type="button" class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink" :aria-label="`Delete ${entry.company}`" @click="askDelete(entry)">
              <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
          </template>
        </div>
      </div>
    </div>

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400">
      <Briefcase class="h-3.5 w-3.5" :stroke-width="1.7" />
      edits appear instantly on /experience · archived entries are hidden from the site but can be restored here
    </div>

    <!-- ── Confirm dialog ───────────────────────────────────── -->
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
