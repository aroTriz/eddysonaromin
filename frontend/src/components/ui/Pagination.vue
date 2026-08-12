<script setup lang="ts">
/**
 * Pagination — bryllim-style URL-driven pager.
 * Renders `← prev · N / M · next →` as a mono nav row; state lives in
 * the `?page=` query so back/forward and deep links work.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<{
  /** Total number of items across all pages. */
  total: number
  /** Items per page. */
  pageSize: number
  /** Optional query param name (defaults to "page"). */
  param?: string
}>()

const route = useRoute()
const router = useRouter()

const param = computed(() => props.param ?? 'page')

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const page = computed(() => {
  const raw = Number(route.query[param.value])
  if (!Number.isFinite(raw) || raw < 1) return 1
  return Math.min(raw, totalPages.value)
})

function go(next: number): void {
  const clamped = Math.min(Math.max(next, 1), totalPages.value)
  router.push({
    query: { ...route.query, [param.value]: clamped > 1 ? String(clamped) : undefined },
  })
}

defineExpose({ page, totalPages })
</script>

<template>
  <nav
    v-if="totalPages > 1"
    class="mt-10 flex items-center justify-between font-mono text-[12px] text-gray-500"
    aria-label="Pagination"
  >
    <button
      v-if="page > 1"
      type="button"
      class="-my-2 py-2 hover:text-ink"
      @click="go(page - 1)"
    >
      ← prev
    </button>
    <span v-else class="-my-2 py-2 text-gray-300">← prev</span>

    <span class="-my-2 py-2 text-gray-400">{{ page }} / {{ totalPages }}</span>

    <button
      v-if="page < totalPages"
      type="button"
      class="-my-2 py-2 hover:text-ink"
      @click="go(page + 1)"
    >
      next →
    </button>
    <span v-else class="-my-2 py-2 text-gray-300">next →</span>
  </nav>
</template>
