<script setup lang="ts">
/**
 * /aromin/projects â€” projects CMS. List, create, edit, delete, archive &
 * restore projects. The list has a category filter (all/personal/academic)
 * and a sort/arrangement column. The device-showcase editor uploads images
 * and videos (NOT URLs) via a "+ add" button that asks PC or Mobile, then
 * tags each item with its device icon so it's easy to identify.
 */
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  FileVideo,
  FolderKanban,
  Image as ImageIcon,
  ImagePlus,
  Laptop,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Smartphone,
  Star,
  Trash2,
  X,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import {
  archiveAdminProject,
  createAdminProject,
  deleteAdminProject,
  deleteAdminProjects,
  fetchAdminProjects,
  restoreAdminProject,
  updateAdminProject,
  uploadProjectImage,
  uploadProjectMedia,
  type ProjectInput,
} from '@/services/adminApi'
import type { Project, ShowcaseMedia } from '@/types'
import { projectTypeLabel } from '@/utils/format'

const items = ref<Project[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const deleting = ref(false)
const showArchived = ref(false)

// List filter + arrangement
const categoryFilter = ref<'all' | 'professional' | 'personal' | 'academic'>('all')
const categoryOptions = ['all', 'professional', 'personal', 'academic'] as const
const sortKey = ref<'sort_order' | 'year' | 'title' | 'updated'>('sort_order')
const sortDir = ref<'asc' | 'desc'>('asc')
const sortOptions = [
  { value: 'sort_order', label: 'sort order' },
  { value: 'year', label: 'year' },
  { value: 'title', label: 'title' },
  { value: 'updated', label: 'updated' },
] as const

/** Filtered + arranged project list (client-side â€” all rows are already fetched). */
const filteredItems = computed(() => {
  const list = items.value.filter(
    (p) => categoryFilter.value === 'all' || p.category === categoryFilter.value,
  )
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    switch (sortKey.value) {
      case 'year':
        return (a.year ?? '').localeCompare(b.year ?? '') * dir
      case 'title':
        return a.title.localeCompare(b.title) * dir
      case 'updated':
        return (a.updated_at ?? '').localeCompare(b.updated_at ?? '') * dir
      default:
        return ((a.sort_order ?? 0) - (b.sort_order ?? 0)) * dir
    }
  })
})

// Showcase media upload state
const showcasePickerOpen = ref(false)
const pendingDevice = ref<'laptop' | 'phone' | null>(null)
const uploadingMedia = ref(false)
const mediaInput = ref<HTMLInputElement | null>(null)

// Editor state
const editing = ref<Project | null>(null)
const editorOpen = ref(false)
const form = ref<ProjectInput>({
  title: '',
  category: 'personal',
  type: 'web-app',
  summary: '',
  tagline: null,
  description: null,
  role: null,
  year: null,
  featured: false,
  technologies: [],
  url: null,
  source_url: null,
  image_url: null,
  favicon_url: null,
  showcase: { laptops: [], phones: [] },
  sort_order: 0,
})
const techInput = ref('')

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
  () => items.value.length > 0 && items.value.every((p) => selected.value.has(p.id)),
)
const someSelected = computed(
  () => items.value.some((p) => selected.value.has(p.id)) && !allSelected.value,
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    items.value = await fetchAdminProjects(showArchived.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load projects'
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
function addTech(): void {
  const t = techInput.value.trim()
  if (t && !form.value.technologies?.includes(t)) form.value.technologies?.push(t)
  techInput.value = ''
}

function removeTech(tech: string): void {
  form.value.technologies = form.value.technologies?.filter((t) => t !== tech) ?? []
}

/* â”€â”€ Showcase media (uploaded images/videos, tagged PC or Mobile) â”€â”€ */

/** The device list the editor mutates (laptop â†’ laptops, phone â†’ phones). */
function deviceList(device: 'laptop' | 'phone'): ShowcaseMedia[] {
  if (!form.value.showcase) form.value.showcase = { laptops: [], phones: [] }
  return device === 'laptop' ? form.value.showcase.laptops : form.value.showcase.phones
}

/** Display src for a showcase item (legacy string or media object). */
function mediaSrc(item: ShowcaseMedia): string {
  return typeof item === 'string' ? item : item.src
}

/** Media kind â€” legacy strings are images; objects carry their own kind. */
function mediaKind(item: ShowcaseMedia): 'image' | 'video' {
  return typeof item === 'string' ? 'image' : item.kind
}

/** Flat list of showcase entries for the editor grid (laptops first). */
const showcaseItems = computed(() => {
  const show = form.value.showcase
  if (!show) return []
  return [
    ...show.laptops.map((item, index) => ({ device: 'laptop' as const, item, index })),
    ...show.phones.map((item, index) => ({ device: 'phone' as const, item, index })),
  ]
})

/** Close the picker and open the file chooser for the chosen device. */
function openDevicePicker(device: 'laptop' | 'phone'): void {
  showcasePickerOpen.value = false
  pendingDevice.value = device
  mediaInput.value?.click()
}

/** Upload the picked file and append it to the chosen device list. */
async function onMediaFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const device = pendingDevice.value
  pendingDevice.value = null
  if (!file || !device) return
  uploadingMedia.value = true
  error.value = ''
  try {
    const { url, kind } = await uploadProjectMedia(file, device)
    deviceList(device).push({ src: url, kind })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    uploadingMedia.value = false
  }
}

function removeMedia(device: 'laptop' | 'phone', index: number): void {
  deviceList(device).splice(index, 1)
}

// â”€â”€ Card image / favicon uploads (instead of typing URLs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const coverUploading = ref(false)
const faviconUploading = ref(false)
const coverInput = ref<HTMLInputElement | null>(null)
const faviconInput = ref<HTMLInputElement | null>(null)

/** Upload the picked cover image and store its served URL in image_url. */
async function onCoverFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  coverUploading.value = true
  error.value = ''
  try {
    const { url } = await uploadProjectImage(file, 'cover')
    form.value.image_url = url
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Cover upload failed'
  } finally {
    coverUploading.value = false
  }
}

/** Upload the picked favicon and store its served URL in favicon_url. */
async function onFaviconFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  faviconUploading.value = true
  error.value = ''
  try {
    const { url } = await uploadProjectImage(file, 'favicon')
    form.value.favicon_url = url
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Favicon upload failed'
  } finally {
    faviconUploading.value = false
  }
}

/** Reorder one media item within its device list. */
function moveMedia(device: 'laptop' | 'phone', index: number, dir: -1 | 1): void {
  const list = deviceList(device)
  const target = index + dir
  if (target < 0 || target >= list.length) return
  const tmp = list[index]
  list[index] = list[target]
  list[target] = tmp
}

function startNew(): void {
  editing.value = null
  editorOpen.value = true
  form.value = {
    title: '',
    category: 'personal',
    type: 'web-app',
    summary: '',
    tagline: null,
    description: null,
    role: null,
    year: null,
    featured: false,
    technologies: [],
    url: null,
    source_url: null,
    image_url: null,
    favicon_url: null,
    showcase: { laptops: [], phones: [] },
    sort_order: 0,
  }
  techInput.value = ''
  error.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function startEdit(project: Project): void {
  editing.value = project
  editorOpen.value = true
  form.value = {
    title: project.title,
    category: project.category,
    type: project.type,
    summary: project.summary,
    tagline: project.tagline,
    description: project.description,
    role: project.role,
    year: project.year,
    featured: project.featured,
    technologies: [...(project.technologies ?? [])],
    url: project.url,
    source_url: project.source_url,
    image_url: project.image_url,
    favicon_url: project.favicon_url,
    showcase: project.showcase
      ? { laptops: [...project.showcase.laptops], phones: [...project.showcase.phones] }
      : { laptops: [], phones: [] },
    sort_order: project.sort_order,
  }
  techInput.value = ''
  error.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit(): void {
  editing.value = null
  editorOpen.value = false
}

/** Validate the form, then ask for confirmation before saving. */
function requestSave(): void {
  if (!form.value.title.trim()) {
    error.value = 'Title is required.'
    return
  }
  if (!form.value.summary.trim()) {
    error.value = 'Summary is required.'
    return
  }
  askConfirm({
    title: 'Save changes',
    message: editing.value
      ? `Update "${form.value.title.trim()}"?`
      : `Create "${form.value.title.trim()}"?`,
    confirmLabel: 'save',
    danger: false,
    action: save,
  })
}

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const payload: ProjectInput = {
      title: form.value.title.trim(),
      category: form.value.category,
      type: form.value.type,
      summary: form.value.summary.trim(),
      tagline: form.value.tagline?.trim() || null,
      description: form.value.description?.trim() || null,
      role: form.value.role?.trim() || null,
      year: form.value.year?.trim() || null,
      featured: form.value.featured ?? false,
      technologies: form.value.technologies ?? [],
      url: form.value.url?.trim() || null,
      source_url: form.value.source_url?.trim() || null,
      image_url: form.value.image_url?.trim() || null,
      favicon_url: form.value.favicon_url?.trim() || null,
      showcase: form.value.showcase
        ? { laptops: form.value.showcase.laptops, phones: form.value.showcase.phones }
        : null,
      sort_order: form.value.sort_order ?? 0,
    }
    if (editing.value) {
      await updateAdminProject(editing.value.id, payload)
    } else {
      await createAdminProject(payload)
    }
    confirm.value = null
    await load()
    cancelEdit()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save project'
    confirm.value = null
  } finally {
    saving.value = false
  }
}

// -- Archive / restore --------------------------------------------
async function archiveItem(project: Project): Promise<void> {
  try {
    await archiveAdminProject(project.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to archive project'
  }
}

async function restoreItem(project: Project): Promise<void> {
  try {
    await restoreAdminProject(project.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to restore project'
  }
}

function toggleArchived(): void {
  showArchived.value = !showArchived.value
  selectionMode.value = false
  selected.value = new Set()
  void load()
}

// -- Delete (single + bulk) ---------------------------------------
function askDelete(project: Project): void {
  askConfirm({
    title: 'Delete project',
    message: `Delete "${project.title}" permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: () => remove(project),
  })
}

async function remove(project: Project): Promise<void> {
  deleting.value = true
  try {
    await deleteAdminProject(project.id)
    const next = new Set(selected.value)
    next.delete(project.id)
    selected.value = next
    confirm.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete project'
    confirm.value = null
  } finally {
    deleting.value = false
  }
}

function askDeleteSelected(): void {
  const count = selected.value.size
  askConfirm({
    title: 'Delete selected',
    message: `Delete ${count} selected project${count > 1 ? 's' : ''} permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: removeSelected,
  })
}

async function removeSelected(): Promise<void> {
  deleting.value = true
  try {
    await deleteAdminProjects([...selected.value])
    confirm.value = null
    exitSelection()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete projects'
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
    items.value.forEach((p) => next.delete(p.id))
    selected.value = next
  } else {
    const next = new Set(selected.value)
    items.value.forEach((p) => next.add(p.id))
    selected.value = next
  }
}

onMounted(load)
</script>

<template>
  <AdminLayout active="aromin-projects" wide>
    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
          projects<span class="text-gray-400">.</span>
        </h1>
        <p class="mt-1.5 font-mono text-[12px] text-gray-500">
          // create, edit &amp; delete projects Â· configure laptop/phone showcase
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[12px] font-semibold text-bg transition-opacity hover:opacity-80"
        @click="startNew"
      >
        <Plus class="h-3.5 w-3.5" :stroke-width="2" />
        New project
      </button>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- -- Editor (create / edit) ------------------------------- -->
    <div v-if="editorOpen" class="mb-8 rounded-xl border border-gray-200 bg-white p-6">
      <div class="mb-5 flex items-center justify-between">
        <p class="font-mono text-[11px] text-gray-500">
          // {{ editing ? `edit_project â€” #${editing.id}` : 'new_project' }}
        </p>
        <button
          type="button"
          class="rounded p-1 text-gray-400 hover:text-ink"
          :aria-label="'Close editor'"
          @click="cancelEdit"
        >
          <X class="h-4 w-4" :stroke-width="1.7" />
        </button>
      </div>

      <div class="flex flex-col gap-4">
        <!-- Title + meta -->
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="proj-title">title</label>
          <input
            id="proj-title"
            v-model="form.title"
            type="text"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="Project title"
          />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="proj-category">category</label>
            <select
              id="proj-category"
              v-model="form.category"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            >
              <option value="professional">professional</option>
              <option value="personal">personal</option>
              <option value="academic">academic</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="proj-type">type</label>
            <select
              id="proj-type"
              v-model="form.type"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            >
              <option value="documentation">documentation</option>
              <option value="ai-tools">ai-tools</option>
              <option value="game">game</option>
              <option value="web-app">web-app</option>
              <option value="ml-data">ml-data</option>
              <option value="ar-mobile">ar-mobile</option>
              <option value="networking">networking</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="proj-year">year</label>
            <input
              id="proj-year"
              v-model="form.year"
              type="text"
              maxlength="4"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="2026"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="proj-role">role</label>
            <input
              id="proj-role"
              v-model="form.role"
              type="text"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="e.g. Full-stack Developer"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="proj-order">sort order</label>
            <input
              id="proj-order"
              v-model.number="form.sort_order"
              type="number"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="0"
            />
          </div>
        </div>

        <!-- Featured toggle — star mark only (no checkbox): filled star =
             featured, outline star = not. Click to toggle. -->
        <button
          type="button"
          class="flex w-fit cursor-pointer select-none items-center gap-2 rounded-md px-1 -mx-1 py-0.5 transition-colors"
          :class="form.featured ? '' : 'hover:bg-gray-50'"
          :aria-label="form.featured ? 'Unmark as featured' : 'Mark as featured'"
          :aria-pressed="form.featured"
          @click="form.featured = !form.featured"
        >
          <Star
            class="h-4 w-4 transition-colors"
            :stroke-width="1.7"
            :class="form.featured ? 'fill-current text-ink' : 'text-gray-400 hover:text-ink'"
          />
          <span
            class="font-mono text-[11.5px]"
            :class="form.featured ? 'font-semibold text-ink' : 'text-gray-500'"
          >
            featured project
          </span>
        </button>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="proj-summary">summary</label>
          <textarea
            id="proj-summary"
            v-model="form.summary"
            rows="3"
            class="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] leading-relaxed text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="Short description shown on the project card"
          ></textarea>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="proj-tagline">tagline</label>
          <input
            id="proj-tagline"
            v-model="form.tagline"
            type="text"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="Optional one-liner"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="proj-description">description</label>
          <textarea
            id="proj-description"
            v-model="form.description"
            rows="5"
            class="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] leading-relaxed text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="Detailed write-up (optional)"
          ></textarea>
        </div>

        <!-- Links -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="proj-url">live url</label>
            <input
              id="proj-url"
              v-model="form.url"
              type="text"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="https://â€¦"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="proj-source">source url</label>
            <input
              id="proj-source"
              v-model="form.source_url"
              type="text"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="https://github.com/â€¦"
            />
          </div>

          <!-- Cover image â€” uploaded, not typed -->
          <div class="flex flex-col gap-1.5">
            <span class="font-mono text-[11px] text-gray-500">cover image</span>
            <div class="flex items-center gap-3">
              <div class="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                <img
                  v-if="form.image_url"
                  :src="form.image_url"
                  class="h-full w-full object-cover"
                  alt="Project cover preview"
                />
                <ImageIcon v-else class="h-5 w-5 text-gray-300" :stroke-width="1.5" />
              </div>
              <div class="flex flex-col gap-1.5">
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink disabled:opacity-50"
                  :disabled="coverUploading"
                  :aria-label="coverUploading ? 'Uploading coverâ€¦' : 'Upload cover image'"
                  @click="coverInput?.click()"
                >
                  <LoaderCircle v-if="coverUploading" class="h-3.5 w-3.5 animate-spin" :stroke-width="1.7" />
                  <ImagePlus v-else class="h-3.5 w-3.5" :stroke-width="1.7" />
                  {{ coverUploading ? 'Uploading…' : form.image_url ? 'Replace' : 'Upload' }}
                </button>
                <button
                  v-if="form.image_url"
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-red-200 hover:text-red-500"
                  aria-label="Remove cover image"
                  @click="form.image_url = null"
                >
                  <X class="h-3.5 w-3.5" :stroke-width="1.7" />
                  Remove
                </button>
                <input
                  ref="coverInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  aria-hidden="true"
                  @change="onCoverFileChange"
                />
              </div>
            </div>
          </div>

          <!-- Favicon â€” uploaded, not typed -->
          <div class="flex flex-col gap-1.5">
            <span class="font-mono text-[11px] text-gray-500">favicon</span>
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                <img
                  v-if="form.favicon_url"
                  :src="form.favicon_url"
                  class="h-full w-full object-cover"
                  alt="Project favicon preview"
                />
                <ImageIcon v-else class="h-4 w-4 text-gray-300" :stroke-width="1.5" />
              </div>
              <div class="flex flex-col gap-1.5">
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink disabled:opacity-50"
                  :disabled="faviconUploading"
                  :aria-label="faviconUploading ? 'Uploading faviconâ€¦' : 'Upload favicon'"
                  @click="faviconInput?.click()"
                >
                  <LoaderCircle v-if="faviconUploading" class="h-3.5 w-3.5 animate-spin" :stroke-width="1.7" />
                  <ImagePlus v-else class="h-3.5 w-3.5" :stroke-width="1.7" />
                  {{ faviconUploading ? 'Uploading…' : form.favicon_url ? 'Replace' : 'Upload' }}
                </button>
                <button
                  v-if="form.favicon_url"
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-red-200 hover:text-red-500"
                  aria-label="Remove favicon"
                  @click="form.favicon_url = null"
                >
                  <X class="h-3.5 w-3.5" :stroke-width="1.7" />
                  Remove
                </button>
                <input
                  ref="faviconInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  aria-hidden="true"
                  @change="onFaviconFileChange"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Technologies -->
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="proj-tech">technologies</label>
          <div class="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 transition-colors focus-within:border-gray-400">
            <span
              v-for="tech in form.technologies"
              :key="tech"
              class="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-500"
            >
              {{ tech }}
              <button type="button" class="text-gray-400 hover:text-red-500" :aria-label="`Remove tech ${tech}`" @click="removeTech(tech)">
                <X class="h-3 w-3" />
              </button>
            </span>
            <input
              id="proj-tech"
              v-model="techInput"
              type="text"
              class="min-w-[120px] flex-1 bg-transparent py-0.5 font-mono text-[16px] text-ink outline-none"
              placeholder="Type and press Enter"
              @keydown.enter.prevent="addTech"
            />
          </div>
        </div>

        <!-- Showcase media: uploaded images/videos, tagged PC or Mobile -->
        <div class="flex flex-col gap-1.5">
          <p class="flex items-center justify-between gap-2 font-mono text-[11px] text-gray-500">
            <span class="inline-flex items-center gap-1.5">
              <Laptop class="h-3.5 w-3.5" :stroke-width="1.7" />
              Device showcase media
              <span class="text-gray-400">({{ showcaseItems.length }})</span>
            </span>

            <!-- + Add â†’ PC / Mobile picker -->
            <span class="relative inline-flex items-center">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11.5px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink disabled:opacity-50"
                :disabled="uploadingMedia"
                :aria-label="uploadingMedia ? 'Uploading mediaâ€¦' : 'Add showcase media'"
                @click="showcasePickerOpen = !showcasePickerOpen"
              >
                <LoaderCircle v-if="uploadingMedia" class="h-3.5 w-3.5 animate-spin" :stroke-width="1.7" />
                <Plus v-else class="h-3.5 w-3.5" :stroke-width="1.7" />
                Add
              </button>

              <!-- Device options -->
              <div
                v-if="showcasePickerOpen"
                class="absolute right-0 top-full z-30 mt-1.5 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
                role="menu"
                aria-label="Choose a device"
              >
                <button
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 font-mono text-[12px] text-gray-600 transition-colors hover:bg-gray-50 hover:text-ink"
                  @click="openDevicePicker('laptop')"
                >
                  <Laptop class="h-3.5 w-3.5" :stroke-width="1.7" />
                  PC / laptop
                </button>
                <button
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 font-mono text-[12px] text-gray-600 transition-colors hover:bg-gray-50 hover:text-ink"
                  @click="openDevicePicker('phone')"
                >
                  <Smartphone class="h-3.5 w-3.5" :stroke-width="1.7" />
                  Mobile / phone
                </button>
              </div>
              <!-- Click-catcher â€” closes the picker on any outside click -->
              <div v-if="showcasePickerOpen" class="fixed inset-0 z-20" @click="showcasePickerOpen = false" />
            </span>
          </p>

          <!-- Media grid -->
          <div v-if="showcaseItems.length" class="flex flex-wrap gap-2">
            <div
              v-for="entry in showcaseItems"
              :key="`${entry.device}-${entry.index}`"
              class="group relative overflow-hidden rounded-md border border-gray-200 bg-gray-50"
              :class="entry.device === 'phone' ? 'h-24 w-14' : 'h-16 w-24'"
            >
              <img
                v-if="mediaKind(entry.item) === 'image'"
                :src="mediaSrc(entry.item)"
                class="h-full w-full object-cover"
                :alt="`${entry.device === 'phone' ? 'Mobile' : 'PC'} media ${entry.index + 1}`"
                loading="lazy"
              />
              <video
                v-else
                :src="mediaSrc(entry.item)"
                class="h-full w-full object-cover"
                muted
                playsinline
                preload="metadata"
                :aria-label="`${entry.device === 'phone' ? 'Mobile' : 'PC'} media ${entry.index + 1}`"
              ></video>

              <!-- Device tag â€” always visible so PC vs Mobile is obvious -->
              <span
                class="absolute left-0.5 top-0.5 inline-flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-white"
                :title="entry.device === 'phone' ? 'Mobile / phone' : 'PC / laptop'"
              >
                <component :is="entry.device === 'phone' ? Smartphone : Laptop" class="h-2.5 w-2.5" :stroke-width="2" />
              </span>
              <!-- Video tag -->
              <span
                v-if="mediaKind(entry.item) === 'video'"
                class="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white"
                title="Video"
              >
                <FileVideo class="h-2.5 w-2.5" :stroke-width="2" />
              </span>

              <!-- Hover actions: reorder + remove -->
              <div class="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/60 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  class="p-0.5 text-white transition-colors hover:text-gray-300 disabled:opacity-30"
                  :aria-label="`Move ${entry.device} media ${entry.index + 1} earlier`"
                  :disabled="entry.index === 0"
                  @click="moveMedia(entry.device, entry.index, -1)"
                >
                  <ArrowUp class="h-3 w-3" :stroke-width="2" />
                </button>
                <button
                  type="button"
                  class="p-0.5 text-white transition-colors hover:text-gray-300 disabled:opacity-30"
                  :aria-label="`Move ${entry.device} media ${entry.index + 1} later`"
                  :disabled="entry.index >= deviceList(entry.device).length - 1"
                  @click="moveMedia(entry.device, entry.index, 1)"
                >
                  <ArrowDown class="h-3 w-3" :stroke-width="2" />
                </button>
                <button
                  type="button"
                  class="p-0.5 text-white transition-colors hover:text-red-400"
                  :aria-label="`Remove ${entry.device} media ${entry.index + 1}`"
                  @click="removeMedia(entry.device, entry.index)"
                >
                  <X class="h-3 w-3" :stroke-width="2" />
                </button>
              </div>
            </div>
          </div>
          <p v-else class="font-mono text-[10px] text-gray-400">
            No media yet — click "Add" and pick PC or Mobile, then upload a screenshot (jpg/png) or video
          </p>

          <input
            ref="mediaInput"
            type="file"
            accept="image/*,video/*"
            class="hidden"
            aria-hidden="true"
            @change="onMediaFileChange"
          />
          <p class="font-mono text-[10px] text-gray-400">
            Images up to 8MB · videos up to 60MB · leave empty to fall back to the cover image
          </p>
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
            {{ saving ? 'Saving...' : editing ? 'Update project' : 'Create project' }}
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

    <!-- -- Project list ----------------------------------------- -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <template v-if="selectionMode">
        <label
          class="flex cursor-pointer select-none items-center gap-2"
          :title="allSelected ? 'Deselect all' : 'Select all projects'"
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
        // {{ showArchived ? 'archived' : 'projects' }} ({{ filteredItems.length }})
      </p>

      <!-- Filter + arrangement column -->
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <!-- Category filter -->
        <div
          class="flex overflow-hidden rounded-md border border-gray-200"
          role="group"
          aria-label="Filter by category"
        >
          <button
            v-for="opt in categoryOptions"
            :key="opt"
            type="button"
            class="px-2.5 py-1.5 font-mono text-[11.5px] transition-colors"
            :class="categoryFilter === opt ? 'bg-ink text-bg' : 'text-gray-500 hover:text-ink'"
            @click="categoryFilter = opt"
          >
            {{ opt }}
          </button>
        </div>

        <!-- Sort key -->
        <select
          v-model="sortKey"
          aria-label="Sort projects by"
          class="rounded-md border border-gray-200 bg-white px-2 py-1.5 font-mono text-[11.5px] text-gray-600 outline-none transition-colors focus:border-gray-400"
        >
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <!-- Sort direction -->
        <button
          type="button"
          class="rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink"
          :aria-label="sortDir === 'asc' ? 'Sorted ascending â€” click for descending' : 'Sorted descending â€” click for ascending'"
          :title="sortDir === 'asc' ? 'ascending' : 'descending'"
          @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'"
        >
          <ArrowUp v-if="sortDir === 'asc'" class="h-4 w-4" :stroke-width="1.7" />
          <ArrowDown v-else class="h-4 w-4" :stroke-width="1.7" />
        </button>

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
          aria-label="Select projects to delete"
          title="Delete projects"
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

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-14 skeleton rounded-lg border border-gray-200 bg-gray-50"></div>
    </div>

    <div v-else-if="items.length === 0" class="rounded-xl border border-dashed border-gray-200 p-10 text-center">
      <p class="font-mono text-[12px] text-gray-500">
        {{ showArchived ? 'Nothing archived yet.' : 'No projects yet. Create your first one above!' }}
      </p>
    </div>

    <div v-else class="space-y-2">
      <p
        v-if="filteredItems.length === 0"
        class="rounded-xl border border-dashed border-gray-200 p-8 text-center font-mono text-[12px] text-gray-500"
      >
        // no projects match this filter â€” try another category or sort
      </p>
      <div
        v-for="project in filteredItems"
        :key="project.id"
        class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300"
        :class="{
          'border-gray-300': selected.has(project.id),
          'opacity-60': showArchived,
        }"
      >
        <input
          v-if="selectionMode"
          type="checkbox"
          class="h-4 w-4 shrink-0 cursor-pointer accent-ink"
          :checked="selected.has(project.id)"
          :aria-label="`Select ${project.title}`"
          @change="toggleSelect(project.id)"
        />
        <div class="min-w-0 flex-1">
          <p class="flex items-center gap-2 truncate font-mono text-[13px] font-semibold text-ink">
            <Star
              v-if="project.featured"
              class="h-3.5 w-3.5 shrink-0 text-gray-400"
              :stroke-width="1.7"
              title="Featured"
            />
            {{ project.title }}
            <span class="shrink-0 font-mono text-[10px] font-normal text-gray-400">
              {{ projectTypeLabel(project.type) }}
            </span>
          </p>
          <p class="mt-0.5 truncate font-mono text-[11px] text-gray-400">
            {{ project.category }} Â· {{ project.year || 'â€”' }} Â· {{ project.slug }}
            <template v-if="project.showcase?.laptops.length || project.showcase?.phones.length">
              Â· {{ project.showcase.laptops.length }} lap / {{ project.showcase.phones.length }} phone
            </template>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            v-if="showArchived"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-[11px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
            :aria-label="`Restore ${project.title}`"
            @click="restoreItem(project)"
          >
            <ArchiveRestore class="h-3.5 w-3.5" :stroke-width="1.7" />
            Restore
          </button>
          <template v-else>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Edit ${project.title}`"
              @click="startEdit(project)"
            >
              <Pencil class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Archive ${project.title}`"
              title="Archive"
              @click="archiveItem(project)"
            >
              <Archive class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Delete ${project.title}`"
              @click="askDelete(project)"
            >
              <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
          </template>
        </div>
      </div>
    </div>

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400">
      <FolderKanban class="h-3.5 w-3.5" :stroke-width="1.7" />
      edits appear instantly on /projects â€” archived projects are hidden from the site but can be restored here
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
