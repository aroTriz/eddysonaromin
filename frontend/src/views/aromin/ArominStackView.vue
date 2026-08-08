<script setup lang="ts">
/**
 * /aromin/stack — tech stack CMS. Add/edit/delete categories, each holding
 * a list of technology items. Changes appear instantly on /stack.
 */
import { Plus, Save, Trash2, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import {
  createAdminStackGroup,
  deleteAdminStackGroup,
  fetchAdminStackGroups,
  updateAdminStackGroup,
  type StackGroupInput,
} from '@/services/adminApi'
import type { StackGroup } from '@/types'

const groups = ref<StackGroup[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)

// Editor state
const editing = ref<StackGroup | null>(null)
const editorOpen = ref(false)
const form = ref<StackGroupInput>({ label: '', items: [] })
const itemInput = ref('')

const sorted = computed(() =>
  [...groups.value].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    groups.value = await fetchAdminStackGroups()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load stack'
  } finally {
    loading.value = false
  }
}

function startNew(): void {
  editing.value = null
  editorOpen.value = true
  form.value = { label: '', items: [] }
  itemInput.value = ''
}

function startEdit(group: StackGroup): void {
  editing.value = group
  editorOpen.value = true
  form.value = { label: group.label, items: [...group.items] }
  itemInput.value = ''
}

function cancelEdit(): void {
  editing.value = null
  editorOpen.value = false
  form.value = { label: '', items: [] }
  itemInput.value = ''
}

function addItem(): void {
  const t = itemInput.value.trim()
  if (t && !form.value.items.includes(t)) form.value.items.push(t)
  itemInput.value = ''
}

function removeItem(index: number): void {
  form.value.items.splice(index, 1)
}

async function save(): Promise<void> {
  if (!form.value.label.trim()) {
    error.value = 'Category label is required.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    if (editing.value) {
      await updateAdminStackGroup(editing.value.id, {
        label: form.value.label.trim(),
        items: form.value.items,
      })
    } else {
      await createAdminStackGroup({
        label: form.value.label.trim(),
        items: form.value.items,
      })
    }
    await load()
    cancelEdit()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save category'
  } finally {
    saving.value = false
  }
}

async function remove(group: StackGroup): Promise<void> {
  if (!window.confirm(`Delete the "${group.label}" category?`)) return
  try {
    await deleteAdminStackGroup(group.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete category'
  }
}

onMounted(load)
</script>

<template>
  <AdminLayout active="aromin-stack">
    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
          tech stack<span class="text-gray-400">.</span>
        </h1>
        <p class="mt-1.5 font-mono text-[12px] text-gray-500">
          // manage stack categories &amp; their technologies
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[12px] font-semibold text-bg transition-opacity hover:opacity-80"
        @click="startNew"
      >
        <Plus class="h-3.5 w-3.5" :stroke-width="2" />
        new category
      </button>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- ── Editor (create / edit category) ────────────────────── -->
    <div v-if="editorOpen" class="mb-8 rounded-xl border border-gray-200 bg-white p-6">
      <div class="mb-5 flex items-center justify-between">
        <p class="font-mono text-[11px] text-gray-500">
          // {{ editing ? `edit_category — #${editing.id}` : 'new_category' }}
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
          <label class="font-mono text-[11px] text-gray-500" for="stack-label">category label</label>
          <input
            id="stack-label"
            v-model="form.label"
            type="text"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[13px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="e.g. Frontend"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="stack-item">technologies ({{ form.items.length }})</label>
          <div class="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 transition-colors focus-within:border-gray-400">
            <span
              v-for="(item, i) in form.items"
              :key="i"
              class="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-500"
            >
              {{ item }}
              <button type="button" class="text-gray-400 hover:text-red-500" :aria-label="`Remove ${item}`" @click="removeItem(i)">
                <X class="h-3 w-3" />
              </button>
            </span>
            <input
              id="stack-item"
              v-model="itemInput"
              type="text"
              class="min-w-[120px] flex-1 bg-transparent py-0.5 font-mono text-[12px] text-ink outline-none"
              placeholder="Type and press Enter"
              @keydown.enter.prevent="addItem"
            />
          </div>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
            :disabled="saving"
            @click="save"
          >
            <Save class="h-4 w-4" :stroke-width="1.7" />
            {{ saving ? 'saving...' : editing ? 'update category' : 'add category' }}
          </button>
          <button
            v-if="editing"
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2.5 font-mono text-[13px] text-gray-500 transition-colors hover:text-ink"
            @click="cancelEdit"
          >
            cancel
          </button>
        </div>
      </div>
    </div>

    <!-- ── Category list ──────────────────────────────────────── -->
    <p class="mb-4 font-mono text-[11px] text-gray-500">// categories ({{ groups.length }})</p>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-14 animate-pulse rounded-lg border border-gray-200 bg-gray-50"></div>
    </div>

    <div v-else-if="sorted.length === 0" class="rounded-xl border border-dashed border-gray-200 p-10 text-center">
      <p class="font-mono text-[12px] text-gray-500">No categories yet. Add your first one above!</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="group in sorted"
        :key="group.id"
        class="rounded-lg border border-gray-200 bg-white px-4 py-3.5 transition-colors hover:border-gray-300"
      >
        <div class="flex items-center justify-between gap-4">
          <p class="font-mono text-[13px] font-semibold text-ink">{{ group.label }}</p>
          <div class="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              class="rounded-md px-2.5 py-1.5 font-mono text-[11px] text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              @click="startEdit(group)"
            >
              edit
            </button>
            <button
              type="button"
              class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              :aria-label="`Delete ${group.label}`"
              @click="remove(group)"
            >
              <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
            </button>
          </div>
        </div>
        <div class="mt-2.5 flex flex-wrap gap-1.5">
          <span
            v-for="item in group.items"
            :key="item"
            class="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-500"
          >
            {{ item }}
          </span>
          <span v-if="group.items.length === 0" class="font-mono text-[11px] text-gray-400">(empty)</span>
        </div>
      </div>
    </div>

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400">
      <Plus class="h-3.5 w-3.5" :stroke-width="1.7" />
      edits appear instantly on /stack
    </div>
  </AdminLayout>
</template>
