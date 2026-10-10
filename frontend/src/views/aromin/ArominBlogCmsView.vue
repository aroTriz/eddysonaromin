<script setup lang="ts">
/**
 * /aromin/blog — blog CMS. List, create, edit, delete, archive & restore
 * posts. Markdown content with tag chips; matches the site's mono/terminal
 * styling. Confirms destructive/save actions with a themed blur modal.
 */
import { Archive, ArchiveRestore, FilePlus, ImagePlus, LoaderCircle, Pencil, Save, Trash2, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import AdminListState from '@/components/admin/AdminListState.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import AdminSelectionBar from '@/components/admin/AdminSelectionBar.vue'
import AdminToolbar from '@/components/admin/AdminToolbar.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { useConfirm, useSelection } from '@/composables/useAdminList'
import { formatShortDate } from '@/utils/format'
import {
  archiveAdminPost,
  createAdminPost,
  deleteAdminPost,
  deleteAdminPosts,
  fetchAdminPosts,
  restoreAdminPost,
  updateAdminPost,
  type BlogPostInput,
} from '@/services/adminApi'
import type { BlogPost } from '@/types'

const posts = ref<BlogPost[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const deleting = ref(false)
const showArchived = ref(false)

// Editor state
const editing = ref<BlogPost | null>(null)
const form = ref<BlogPostInput>({ title: '', excerpt: '', content: '', images: [], tags: [] })
const tagInput = ref('')
const showDrafts = ref(false)
const editorOpen = ref(false)

const visiblePosts = computed(() =>
  showDrafts.value ? posts.value : posts.value.filter((p) => p.published_at),
)

const { confirm, askConfirm, closeConfirm } = useConfirm()
const {
  selectionMode,
  selected,
  allSelected,
  someSelected,
  enterSelection,
  exitSelection,
  toggleSelect,
  toggleSelectAll,
  dropFromSelection,
} = useSelection(() => visiblePosts.value)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    posts.value = await fetchAdminPosts(showArchived.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load posts'
  } finally {
    loading.value = false
  }
}

// -- Editor -------------------------------------------------------
function addTag(): void {
  const t = tagInput.value.trim()
  if (t && !form.value.tags.includes(t)) form.value.tags.push(t)
  tagInput.value = ''
}

function removeTag(tag: string): void {
  form.value.tags = form.value.tags.filter((t) => t !== tag)
}

function startNew(): void {
  editing.value = null
  editorOpen.value = true
  form.value = { title: '', excerpt: '', content: '', images: [], tags: [] }
  tagInput.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function startEdit(post: BlogPost): void {
  editing.value = post
  editorOpen.value = true
  form.value = {
    title: post.title,
    excerpt: post.excerpt ?? '',
    content: post.content,
    images: post.images ?? [],
    tags: post.tags ?? [],
  }
  tagInput.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit(): void {
  editing.value = null
  editorOpen.value = false
  form.value = { title: '', excerpt: '', content: '', images: [], tags: [] }
  tagInput.value = ''
}

/** Read selected files as data-URLs and append to the images list. */
function onImagesSelected(e: Event): void {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  for (const file of Array.from(files)) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        form.value.images.push(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }
  ;(e.target as HTMLInputElement).value = ''
}

function removeImage(index: number): void {
  form.value.images.splice(index, 1)
}

/** Validate the form, then ask for confirmation before saving. */
function requestSave(): void {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    error.value = 'Title and content are required.'
    return
  }
  askConfirm({
    title: 'Save changes',
    message: editing.value
      ? `Update "${form.value.title.trim()}"?`
      : `Publish "${form.value.title.trim()}"?`,
    confirmLabel: 'save',
    danger: false,
    action: save,
  })
}

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      title: form.value.title.trim(),
      excerpt: form.value.excerpt.trim(),
      content: form.value.content,
      images: form.value.images,
      tags: form.value.tags,
    }
    if (editing.value) {
      await updateAdminPost(editing.value.id, payload)
    } else {
      await createAdminPost(payload)
    }
    closeConfirm()
    await load()
    cancelEdit()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save post'
    closeConfirm()
  } finally {
    saving.value = false
  }
}

// -- Archive / restore --------------------------------------------
async function archiveItem(post: BlogPost): Promise<void> {
  try {
    await archiveAdminPost(post.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to archive post'
  }
}

async function restoreItem(post: BlogPost): Promise<void> {
  try {
    await restoreAdminPost(post.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to restore post'
  }
}

function toggleArchived(): void {
  showArchived.value = !showArchived.value
  exitSelection()
  void load()
}

// -- Delete (single + bulk) ---------------------------------------
function askDelete(post: BlogPost): void {
  askConfirm({
    title: 'Delete post',
    message: `Delete "${post.title}" permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: () => remove(post),
  })
}

async function remove(post: BlogPost): Promise<void> {
  deleting.value = true
  try {
    await deleteAdminPost(post.id)
    dropFromSelection(post.id)
    closeConfirm()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete post'
    closeConfirm()
  } finally {
    deleting.value = false
  }
}

function askDeleteSelected(): void {
  const count = selected.value.size
  askConfirm({
    title: 'Delete selected',
    message: `Delete ${count} selected post${count > 1 ? 's' : ''} permanently?`,
    confirmLabel: 'delete',
    danger: true,
    action: removeSelected,
  })
}

async function removeSelected(): Promise<void> {
  deleting.value = true
  try {
    await deleteAdminPosts([...selected.value])
    closeConfirm()
    exitSelection()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete posts'
    closeConfirm()
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <AdminLayout active="aromin-blog">
    <AdminPageHeader title="blog" comment="create, edit &amp; delete posts" new-label="New post" @new="startNew" />

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- -- Editor (create / edit) ------------------------------- -->
    <div v-if="editorOpen" class="mb-8 rounded-xl border border-gray-200 bg-white p-6">
      <div class="mb-5 flex items-center justify-between">
        <p class="font-mono text-[11px] text-gray-500">
          // {{ editing ? `edit_post — #${editing.id}` : 'new_post' }}
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
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="cms-title">title</label>
          <input
            id="cms-title"
            v-model="form.title"
            type="text"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="Post title"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="cms-excerpt">excerpt</label>
          <input
            id="cms-excerpt"
            v-model="form.excerpt"
            type="text"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="Short description for the card"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="cms-content">content (markdown)</label>
          <textarea
            id="cms-content"
            v-model="form.content"
            rows="8"
            class="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] leading-relaxed text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="Write your post here..."
          ></textarea>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="cms-images">images ({{ form.images.length }})</label>
          <div class="flex flex-wrap gap-3">
            <div
              v-for="(img, i) in form.images"
              :key="i"
              class="group relative h-24 w-32 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
            >
              <img :src="img" class="h-full w-full object-cover" :alt="`Post image ${i + 1}`" />
              <button
                type="button"
                class="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                :aria-label="`Remove image ${i + 1}`"
                @click="removeImage(i)"
              >
                <X class="h-3 w-3" />
              </button>
            </div>
            <label
              class="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gray-300 text-gray-400 transition-colors hover:border-gray-400 hover:text-ink"
            >
              <ImagePlus class="h-5 w-5" :stroke-width="1.7" />
              <span class="font-mono text-[10.5px]">Add images</span>
              <input
                id="cms-images"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="onImagesSelected"
              />
            </label>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="cms-tags">tags</label>
          <div class="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 transition-colors focus-within:border-gray-400">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-500"
            >
              {{ tag }}
              <button type="button" class="text-gray-400 hover:text-red-500" :aria-label="`Remove tag ${tag}`" @click="removeTag(tag)">
                <X class="h-3 w-3" />
              </button>
            </span>
            <input
              id="cms-tags"
              v-model="tagInput"
              type="text"
              class="min-w-[120px] flex-1 bg-transparent py-0.5 font-mono text-[16px] text-ink outline-none"
              placeholder="Type and press Enter"
              @keydown.enter.prevent="addTag"
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
            {{ saving ? 'Saving...' : editing ? 'Update post' : 'Publish post' }}
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

    <AdminToolbar noun="posts" :count="posts.length" :show-archived="showArchived" :selection-mode="selectionMode" :all-selected="allSelected" :some-selected="someSelected" @toggle-archived="toggleArchived" @enter-selection="enterSelection" @exit-selection="exitSelection" @toggle-select-all="toggleSelectAll">
      <template #filters>
        <button
          v-if="!showArchived"
          type="button"
          class="font-mono text-[11px] text-gray-400 underline-offset-2 hover:text-ink hover:underline"
          @click="showDrafts = !showDrafts"
        >
          {{ showDrafts ? 'Hide drafts' : 'Show drafts' }}
        </button>
      </template>
    </AdminToolbar>

    <AdminSelectionBar v-if="selectionMode && selected.size > 0" :count="selected.size" @delete-selected="askDeleteSelected" @close="exitSelection" />

    <AdminListState :loading="loading" :empty="visiblePosts.length === 0" empty-message="No posts yet. Write your first one above!" :show-archived="showArchived" skeleton-height="h-14">
      <div class="space-y-2">
      <div
        v-for="post in visiblePosts"
        :key="post.id"
        class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300"
        :class="{
          'opacity-45': !post.published_at,
          'border-gray-300': selected.has(post.id),
          'opacity-60': showArchived,
        }"
      >
        <input
          v-if="selectionMode"
          type="checkbox"
          class="h-4 w-4 shrink-0 cursor-pointer accent-ink"
          :checked="selected.has(post.id)"
          :aria-label="`Select ${post.title}`"
          @change="toggleSelect(post.id)"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate font-mono text-[13px] font-semibold text-ink">
            {{ post.title }}
            <span v-if="!post.published_at" class="ml-2 font-mono text-[10px] text-amber-500">[draft]</span>
          </p>
          <p class="mt-0.5 truncate font-mono text-[11px] text-gray-400">
            {{ formatShortDate(post.published_at) }} · {{ post.slug }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            v-if="showArchived"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 min-h-[44px] py-2 font-mono text-[11px] text-gray-500 transition-colors hover:border-gray-300 hover:text-ink"
            :aria-label="`Restore ${post.title}`"
            @click="restoreItem(post)"
          >
            <ArchiveRestore class="h-3.5 w-3.5" :stroke-width="1.7" />
            Restore
          </button>
          <template v-else>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Edit ${post.title}`"
              @click="startEdit(post)"
            >
              <Pencil class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Archive ${post.title}`"
              title="Archive"
              @click="archiveItem(post)"
            >
              <Archive class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              :aria-label="`Delete ${post.title}`"
              @click="askDelete(post)"
            >
              <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
          </template>
        </div>
      </div>
      </div>
    </AdminListState>

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400">
      <FilePlus class="h-3.5 w-3.5" :stroke-width="1.7" />
      edits appear instantly on /blog
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
      @cancel="closeConfirm"
    />
  </AdminLayout>
</template>
