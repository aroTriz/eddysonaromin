<script setup lang="ts">
/**
 * /aromin/users — registered account management. List, create, edit, delete,
 * bulk delete with select-all. Passwords are stored as one-way SHA-256
 * hashes, so the table shows the hash (copyable) and edit can reset it —
 * the original plaintext is never recoverable.
 */
import { Check, Copy, LoaderCircle, Pencil, Plus, Save, Shield, Trash2, Users, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import {
  createAdminUser,
  deleteAdminUser,
  deleteAdminUsers,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUser,
  type AdminUserInput,
} from '@/services/adminApi'

const items = ref<AdminUser[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const deleting = ref(false)

// Editor state
const editing = ref<AdminUser | null>(null)
const editorOpen = ref(false)
const form = ref<AdminUserInput>({ name: '', email: '', password: '' })

// Bulk selection state
const selectionMode = ref(false)
const selected = ref<Set<number>>(new Set())

// Per-row "hash copied" feedback
const copiedId = ref<number | null>(null)
let copyTimer: number | undefined

// Confirm dialog state
const confirm = ref<{
  title: string
  message: string
  confirmLabel: string
  danger: boolean
  action: () => void | Promise<void>
} | null>(null)

const allSelected = computed(
  () => items.value.length > 0 && items.value.every((u) => selected.value.has(u.id)),
)
const someSelected = computed(
  () => items.value.some((u) => selected.value.has(u.id)) && !allSelected.value,
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    items.value = await fetchAdminUsers()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load accounts'
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
  form.value = { name: '', email: '', password: '' }
  error.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function startEdit(user: AdminUser): void {
  editing.value = user
  editorOpen.value = true
  form.value = { name: user.name, email: user.email, password: '' }
  error.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit(): void {
  editing.value = null
  editorOpen.value = false
  form.value = { name: '', email: '', password: '' }
}

function requestSave(): void {
  if (!form.value.name.trim()) {
    error.value = 'Name is required.'
    return
  }
  if (!/^\S+@\S+\.\S+$/.test(form.value.email.trim())) {
    error.value = 'Please enter a valid email address.'
    return
  }
  if (!editing.value && (!form.value.password || form.value.password.length < 8)) {
    error.value = 'New accounts need a password of at least 8 characters.'
    return
  }
  if (editing.value && form.value.password && form.value.password.length < 8) {
    error.value = 'Password needs at least 8 characters.'
    return
  }
  askConfirm({
    title: 'save changes',
    message: editing.value
      ? `Update the account "${editing.value.email}"?`
      : `Create the account "${form.value.email.trim()}"?`,
    confirmLabel: 'save',
    danger: false,
    action: save,
  })
}

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const payload: AdminUserInput = {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
    }
    if (form.value.password) payload.password = form.value.password
    if (editing.value) {
      await updateAdminUser(editing.value.id, payload)
    } else {
      await createAdminUser(payload)
    }
    confirm.value = null
    await load()
    cancelEdit()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save account'
    confirm.value = null
  } finally {
    saving.value = false
  }
}

// -- Password hash display ----------------------------------------
/** f58eba5a…c5326d9 */
function shortHash(hash: string): string {
  if (hash.length <= 18) return hash
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}

async function copyHash(user: AdminUser): Promise<void> {
  try {
    await navigator.clipboard.writeText(user.password)
  } catch {
    /* clipboard unavailable — the full hash is in the title tooltip */
  }
  copiedId.value = user.id
  clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copiedId.value = null
  }, 1600)
}

// -- Delete (single + bulk) ---------------------------------------
function askDelete(user: AdminUser): void {
  askConfirm({
    title: 'delete account',
    message: user.is_admin
      ? `"${user.email}" is linked to an admin and cannot be deleted.`
      : `Delete "${user.email}" permanently? Their chat history goes with it.`,
    confirmLabel: 'delete',
    danger: true,
    action: () => remove(user),
  })
}

async function remove(user: AdminUser): Promise<void> {
  deleting.value = true
  error.value = ''
  try {
    await deleteAdminUser(user.id)
    const next = new Set(selected.value)
    next.delete(user.id)
    selected.value = next
    confirm.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete account'
    confirm.value = null
  } finally {
    deleting.value = false
  }
}

function askDeleteSelected(): void {
  const count = selected.value.size
  askConfirm({
    title: 'delete selected',
    message: `Delete ${count} selected account${count > 1 ? 's' : ''} permanently? The admin-linked account is skipped automatically.`,
    confirmLabel: 'delete',
    danger: true,
    action: removeSelected,
  })
}

async function removeSelected(): Promise<void> {
  deleting.value = true
  error.value = ''
  try {
    const result = await deleteAdminUsers([...selected.value])
    if (result.protected > 0) {
      error.value = `${result.deleted} deleted — ${result.protected} admin-linked account skipped`
    }
    confirm.value = null
    exitSelection()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete accounts'
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
  const next = new Set(selected.value)
  if (allSelected.value) {
    items.value.forEach((u) => next.delete(u.id))
  } else {
    items.value.forEach((u) => next.add(u.id))
  }
  selected.value = next
}

function createdLabel(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(load)
</script>

<template>
  <AdminLayout active="aromin-users">
    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
          accounts<span class="text-gray-400">.</span>
        </h1>
        <p class="mt-1.5 font-mono text-[12px] text-gray-500">
          // registered site accounts — private chat signups
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[12px] font-semibold text-bg transition-opacity hover:opacity-80"
        @click="startNew"
      >
        <Plus class="h-3.5 w-3.5" :stroke-width="2" />
        New account
      </button>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- -- Editor (create / edit) ------------------------------- -->
    <div v-if="editorOpen" class="mb-8 rounded-xl border border-gray-200 bg-white p-6">
      <div class="mb-5 flex items-center justify-between">
        <p class="font-mono text-[11px] text-gray-500">
          // {{ editing ? `edit_account — #${editing.id}` : 'new_account' }}
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
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="user-name">name</label>
            <input
              id="user-name"
              v-model="form.name"
              type="text"
              maxlength="40"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="e.g. Juan Dela Cruz"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="user-email">email</label>
            <input
              id="user-email"
              v-model="form.email"
              type="email"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              placeholder="juan@example.com"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="user-password">
            {{ editing ? 'new password (leave blank to keep current)' : 'password' }}
          </label>
          <input
            id="user-password"
            v-model="form.password"
            type="text"
            autocomplete="new-password"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
            placeholder="min 8 characters"
          />
          <p class="font-mono text-[10px] text-gray-400">
            stored as a one-way SHA-256 hash — nobody (including you) can see the plaintext again
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
            {{ saving ? 'Saving...' : editing ? 'Update account' : 'Create account' }}
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

    <!-- -- List header: select-all + count + bulk toggle --------- -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <template v-if="selectionMode">
        <label
          class="flex cursor-pointer select-none items-center gap-2"
          :title="allSelected ? 'Deselect all' : 'Select all accounts'"
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
        // accounts ({{ items.length }})
      </p>
      <div class="ml-auto flex items-center gap-2">
        <button
          v-if="!selectionMode"
          type="button"
          class="rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink"
          aria-label="Select accounts to delete"
          title="Delete accounts"
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

    <!-- -- Bulk action bar -------------------------------------- -->
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
      <div v-for="i in 4" :key="i" class="h-14 skeleton rounded-lg border border-gray-200 bg-gray-50"></div>
    </div>

    <div
      v-else-if="items.length === 0"
      class="rounded-xl border border-dashed border-gray-200 p-10 text-center"
    >
      <p class="font-mono text-[12px] text-gray-500">
        No registered accounts yet. Create your first one above!
      </p>
    </div>

    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-left font-mono text-[12px]">
          <thead>
            <tr class="border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400 dark:border-gray-300">
              <th v-if="selectionMode" class="w-10 px-4 py-3 font-normal"></th>
              <th class="px-4 py-3 font-normal">name</th>
              <th class="px-3 py-3 font-normal">email</th>
              <th class="px-3 py-3 font-normal">password <span class="normal-case text-gray-300">(sha-256)</span></th>
              <th class="px-3 py-3 font-normal">created</th>
              <th class="px-3 py-3 text-right font-normal">chats</th>
              <th class="px-4 py-3 text-right font-normal">actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in items"
              :key="user.id"
              class="border-b border-gray-100 last:border-0 dark:border-gray-200"
              :class="{ 'bg-gray-50 dark:bg-gray-200': selected.has(user.id) }"
            >
              <td v-if="selectionMode" class="px-4 py-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 cursor-pointer accent-ink"
                  :checked="selected.has(user.id)"
                  :aria-label="`Select ${user.email}`"
                  @change="toggleSelect(user.id)"
                />
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-2 font-medium text-ink">
                  {{ user.name }}
                  <span
                    v-if="user.is_admin"
                    class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9.5px] text-gray-500"
                    title="Linked to an admin account — cannot be deleted"
                  >
                    <Shield class="h-2.5 w-2.5" :stroke-width="2" />
                    admin
                  </span>
                </span>
              </td>
              <td class="px-3 py-3 text-gray-600 dark:text-gray-400">{{ user.email }}</td>
              <td class="px-3 py-3">
                <span class="inline-flex items-center gap-1.5">
                  <span
                    class="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10.5px] text-gray-500"
                    :title="`${user.password} — stored as a one-way hash, not the real password`"
                  >
                    {{ shortHash(user.password) }}
                  </span>
                  <button
                    type="button"
                    class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
                    :aria-label="`Copy ${user.email} password hash`"
                    :title="copiedId === user.id ? 'Copied!' : 'Copy hash'"
                    @click="copyHash(user)"
                  >
                    <Check v-if="copiedId === user.id" class="h-3 w-3 text-green-600" :stroke-width="2" />
                    <Copy v-else class="h-3 w-3" :stroke-width="1.7" />
                  </button>
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-3 text-gray-500">{{ createdLabel(user.created_at) }}</td>
              <td class="px-3 py-3 text-right text-gray-500">{{ user.conversations }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
                    :aria-label="`Edit ${user.email}`"
                    @click="startEdit(user)"
                  >
                    <Pencil class="h-3.5 w-3.5" :stroke-width="1.7" />
                  </button>
                  <button
                    type="button"
                    class="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
                    :aria-label="`Delete ${user.email}`"
                    :title="user.is_admin ? 'Linked to an admin — cannot be deleted' : 'Delete'"
                    @click="askDelete(user)"
                  >
                    <Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mt-6 flex items-start gap-2 font-mono text-[10.5px] leading-relaxed text-gray-400">
      <Users class="mt-0.5 h-3.5 w-3.5 shrink-0" :stroke-width="1.7" />
      <span>
        passwords are stored as one-way SHA-256 hashes — the original can never be recovered, even by you. To change one,
        edit the account and set a new password. Accounts linked to an admin (badge) are protected from deletion.
      </span>
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
