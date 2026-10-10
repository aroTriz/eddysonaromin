import { computed, ref } from 'vue'

/** Confirm-dialog request shared by every CMS view (rendered by ConfirmModal). */
export interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
  danger: boolean
  action: () => void | Promise<void>
}

/** Shared confirm-dialog state — replaces the per-view `confirm` ref + `askConfirm`. */
export function useConfirm() {
  const confirm = ref<ConfirmRequest | null>(null)

  function askConfirm(opts: ConfirmRequest): void {
    confirm.value = opts
  }

  function closeConfirm(): void {
    confirm.value = null
  }

  return { confirm, askConfirm, closeConfirm }
}

/** Shared bulk-selection state — replaces the per-view selection refs + helpers. */
export function useSelection<T extends { id: number }>(getItems: () => T[]) {
  const selectionMode = ref(false)
  const selected = ref<Set<number>>(new Set())

  const allSelected = computed(() => {
    const list = getItems()
    return list.length > 0 && list.every((item) => selected.value.has(item.id))
  })

  const someSelected = computed(() => {
    const list = getItems()
    return list.some((item) => selected.value.has(item.id)) && !allSelected.value
  })

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
    if (allSelected.value) getItems().forEach((item) => next.delete(item.id))
    else getItems().forEach((item) => next.add(item.id))
    selected.value = next
  }

  /** Remove one id (e.g. after a single delete) without touching the rest. */
  function dropFromSelection(id: number): void {
    if (!selected.value.has(id)) return
    const next = new Set(selected.value)
    next.delete(id)
    selected.value = next
  }

  return {
    selectionMode,
    selected,
    allSelected,
    someSelected,
    enterSelection,
    exitSelection,
    toggleSelect,
    toggleSelectAll,
    dropFromSelection,
  }
}
