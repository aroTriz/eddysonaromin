<script setup lang="ts">
/**
 * /aromin/certifications — credentials CMS. Transferred from static profile.ts
 * to DB so edits via CMS reflect live (hosted + local). List, create, edit,
 * delete, archive & restore. Mirrors references CMS pattern.
 */
import { Archive, ArchiveRestore, FileText, LoaderCircle, Pencil, Save, Trash2, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import AdminListState from '@/components/admin/AdminListState.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import AdminSelectionBar from '@/components/admin/AdminSelectionBar.vue'
import AdminToolbar from '@/components/admin/AdminToolbar.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { useConfirm, useSelection } from '@/composables/useAdminList'
import { slugify } from '@/utils/format'
import {
  archiveAdminCertification,
  createAdminCertification,
  deleteAdminCertification,
  deleteAdminCertifications,
  fetchAdminCertifications,
  restoreAdminCertification,
  updateAdminCertification,
  type CertificationInput,
} from '@/services/adminApi'
import type { Certification } from '@/types'

const items = ref<Certification[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const deleting = ref(false)
const showArchived = ref(false)

const editing = ref<Certification | null>(null)
const editorOpen = ref(false)
const form = ref<CertificationInput & { slug: string; summary: string }>({ slug: '', title: '', issuer: '', year: '', category: 'certification', summary: '', sort_order: 0 })

const sorted = computed(() => [...items.value].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))

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
} = useSelection(() => sorted.value)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try { items.value = await fetchAdminCertifications(showArchived.value) } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load certifications' } finally { loading.value = false }
}

function startNew(): void {
  editing.value = null
  editorOpen.value = true
  form.value = { slug: '', title: '', issuer: '', year: '', category: 'certification', summary: '', sort_order: items.value.length }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function startEdit(cert: Certification): void {
  editing.value = cert
  editorOpen.value = true
  form.value = { slug: cert.slug, title: cert.title, issuer: cert.issuer, year: cert.year, category: cert.category, summary: cert.summary ?? '', sort_order: cert.sort_order }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function cancelEdit(): void { editing.value = null; editorOpen.value = false; form.value = { slug: '', title: '', issuer: '', year: '', category: 'certification', summary: '', sort_order: 0 } }

function requestSave(): void {
  if (!form.value.title.trim() || !form.value.issuer.trim() || !form.value.year.trim()) { error.value = 'Title, issuer and year are required.'; return }
  askConfirm({ title: 'Save changes', message: editing.value ? `Update "${editing.value.title}"?` : 'Add this certification?', confirmLabel: 'save', danger: false, action: save })
}
async function save(): Promise<void> {
  saving.value = true; error.value = ''
  try {
    const payload: CertificationInput = {
      slug: form.value.slug.trim() ? slugify(form.value.slug) : undefined,
      title: form.value.title.trim(),
      issuer: form.value.issuer.trim(),
      year: form.value.year.trim(),
      category: form.value.category,
      summary: form.value.summary?.trim() ? form.value.summary.trim() : null,
      sort_order: Number.isFinite(form.value.sort_order) ? form.value.sort_order : 0,
    }
    if (editing.value) await updateAdminCertification(editing.value.id, payload)
    else await createAdminCertification(payload)
    closeConfirm(); await load(); cancelEdit()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to save certification'; closeConfirm() } finally { saving.value = false }
}
async function archiveItem(cert: Certification): Promise<void> { try { await archiveAdminCertification(cert.id); await load() } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to archive' } }
async function restoreItem(cert: Certification): Promise<void> { try { await restoreAdminCertification(cert.id); await load() } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to restore' } }
function toggleArchived(): void { showArchived.value = !showArchived.value; exitSelection(); void load() }
function askDelete(cert: Certification): void { askConfirm({ title: 'Delete certification', message: `Delete "${cert.title}" permanently?`, confirmLabel: 'delete', danger: true, action: () => remove(cert) }) }
async function remove(cert: Certification): Promise<void> { deleting.value = true; try { await deleteAdminCertification(cert.id); dropFromSelection(cert.id); closeConfirm(); await load() } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to delete'; closeConfirm() } finally { deleting.value = false } }
function askDeleteSelected(): void { const c = selected.value.size; askConfirm({ title: 'Delete selected', message: `Delete ${c} selected certification${c>1?'s':''} permanently?`, confirmLabel: 'delete', danger: true, action: removeSelected }) }
async function removeSelected(): Promise<void> { deleting.value = true; try { await deleteAdminCertifications([...selected.value]); closeConfirm(); exitSelection(); await load() } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to delete'; closeConfirm() } finally { deleting.value = false } }

onMounted(load)
</script>

<template>
  <AdminLayout active="aromin-certifications">
    <AdminPageHeader title="certifications" comment="manage credentials — transferred from static profile.ts to DB" new-label="New certification" @new="startNew" />

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">// {{ error }}</p>

    <div v-if="editorOpen" class="mb-8 rounded-xl border border-gray-200 bg-white p-6">
      <div class="mb-5 flex items-center justify-between">
        <p class="font-mono text-[11px] text-gray-500">// {{ editing ? `edit_certification — #${editing.id}` : 'new_certification' }}</p>
        <button type="button" class="rounded p-1 text-gray-400 hover:text-ink" @click="cancelEdit"><X class="h-4 w-4" :stroke-width="1.7" /></button>
      </div>
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label class="font-mono text-[11px] text-gray-500" for="cert-title">title *</label>
            <input id="cert-title" v-model="form.title" type="text" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none focus:border-gray-400" placeholder="e.g. Bachelor of Science in Information Technology" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="cert-issuer">issuer *</label>
            <input id="cert-issuer" v-model="form.issuer" type="text" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none focus:border-gray-400" placeholder="e.g. Saint Louis University (SAMCIS)" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="cert-year">year *</label>
            <input id="cert-year" v-model="form.year" type="text" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none focus:border-gray-400" placeholder="2025" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="cert-category">category *</label>
            <select id="cert-category" v-model="form.category" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none focus:border-gray-400">
              <option value="degree">degree</option>
              <option value="certification">certification</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="cert-slug">slug (auto)</label>
            <input id="cert-slug" v-model="form.slug" type="text" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none focus:border-gray-400" placeholder="auto from title" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="cert-order">sort order</label>
            <input id="cert-order" v-model.number="form.sort_order" type="number" min="0" class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none focus:border-gray-400" />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="cert-summary">summary</label>
          <textarea id="cert-summary" v-model="form.summary" rows="3" class="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] leading-relaxed text-ink outline-none focus:border-gray-400" placeholder="Short description..."></textarea>
        </div>
        <div class="flex gap-2">
          <button type="button" class="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 font-mono text-[13px] font-semibold text-bg hover:opacity-80 disabled:opacity-50" :disabled="saving" @click="requestSave"><LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" :stroke-width="1.7" /><Save v-else class="h-4 w-4" :stroke-width="1.7" />{{ saving ? 'Saving...' : editing ? 'Update certification' : 'Add certification' }}</button>
          <button v-if="editing" type="button" class="inline-flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2.5 font-mono text-[13px] text-gray-500 hover:text-ink" @click="cancelEdit">Cancel</button>
        </div>
      </div>
    </div>

    <AdminToolbar noun="certifications" :count="items.length" :show-archived="showArchived" :selection-mode="selectionMode" :all-selected="allSelected" :some-selected="someSelected" @toggle-archived="toggleArchived" @enter-selection="enterSelection" @exit-selection="exitSelection" @toggle-select-all="toggleSelectAll" />

    <AdminSelectionBar v-if="selectionMode && selected.size > 0" :count="selected.size" @delete-selected="askDeleteSelected" @close="exitSelection" />

    <AdminListState :loading="loading" :empty="sorted.length === 0" empty-message="No certifications yet. Add your first one above!" :show-archived="showArchived">
      <div class="space-y-2">
      <div v-for="cert in sorted" :key="cert.id" class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300" :class="{ 'border-gray-300': selected.has(cert.id), 'opacity-60': showArchived }">
        <input v-if="selectionMode" type="checkbox" class="h-4 w-4 shrink-0 accent-ink" :checked="selected.has(cert.id)" @change="toggleSelect(cert.id)" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-mono text-[13px] font-semibold text-ink">{{ cert.title }}</p>
          <p class="truncate font-mono text-[11px] text-gray-400">{{ cert.category }} · {{ cert.issuer }} · {{ cert.year }} · {{ cert.slug }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button v-if="showArchived" type="button" class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 min-h-[44px] py-2 font-mono text-[11px] text-gray-500 hover:border-gray-300 hover:text-ink" @click="restoreItem(cert)"><ArchiveRestore class="h-3.5 w-3.5" :stroke-width="1.7" />Restore</button>
          <template v-else>
            <button type="button" class="rounded-md p-2 text-gray-400 hover:bg-gray-50 hover:text-ink" @click="startEdit(cert)"><Pencil class="h-3.5 w-3.5" :stroke-width="1.7" /></button>
            <button type="button" class="rounded-md p-2 text-gray-400 hover:bg-gray-50 hover:text-ink" @click="archiveItem(cert)"><Archive class="h-3.5 w-3.5" :stroke-width="1.7" /></button>
            <button type="button" class="rounded-md p-2 text-gray-400 hover:bg-gray-50 hover:text-ink" @click="askDelete(cert)"><Trash2 class="h-3.5 w-3.5" :stroke-width="1.7" /></button>
          </template>
        </div>
      </div>
      </div>
    </AdminListState>

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400"><FileText class="h-3.5 w-3.5" :stroke-width="1.7" />edits appear instantly on /certifications</div>

    <ConfirmModal :open="confirm !== null" :title="confirm?.title ?? ''" :message="confirm?.message ?? ''" :confirm-label="confirm?.confirmLabel ?? 'confirm'" :danger="confirm?.danger ?? false" :busy="saving || deleting" @confirm="confirm?.action()" @cancel="closeConfirm" />
  </AdminLayout>
</template>
