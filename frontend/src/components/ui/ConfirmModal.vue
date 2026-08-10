<script setup lang="ts">
/**
 * ConfirmModal — the single confirm dialog for the /aromin admin area.
 * Theme-aligned (mono font, terminal header, bordered card) with a
 * frosted blur backdrop, mirroring bryllim's overlay style.
 *
 * Usage:
 *   <ConfirmModal
 *     :open="confirmOpen"
 *     title="delete post"
 *     message="Delete ... permanently?"
 *     confirm-label="delete"
 *     danger
 *     :busy="deleting"
 *     @confirm="doIt"
 *     @cancel="confirmOpen = false"
 *   />
 */
import { AlertTriangle, X } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    /** Red destructive variant (delete) vs. primary ink variant (save). */
    danger?: boolean
    /** Disables the confirm button while an async action runs. */
    busy?: boolean
  }>(),
  {
    confirmLabel: 'Confirm',
    danger: false,
    busy: false,
  },
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[120] flex items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <!-- Frosted blur backdrop (bryllim-style) -->
        <div
          class="absolute inset-0 bg-gray-500/20 backdrop-blur-md"
          aria-hidden="true"
          @click="emit('cancel')"
        ></div>

        <!-- Card -->
        <div class="relative w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
          <div class="flex items-start justify-between gap-4">
        <p class="flex items-center gap-2 font-mono text-[11px] text-gray-500">
          <AlertTriangle v-if="danger" class="h-3.5 w-3.5 text-gray-400" :stroke-width="1.7" />
          // {{ title }}
        </p>
            <button
              type="button"
              class="-mr-1 -mt-1 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-ink"
              aria-label="Close dialog"
              @click="emit('cancel')"
            >
              <X class="h-4 w-4" :stroke-width="1.7" />
            </button>
          </div>

          <p class="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed text-gray-600">{{ message }}</p>

          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-md border border-gray-200 px-4 py-2 font-mono text-[12.5px] text-gray-500 transition-colors hover:text-ink"
              :disabled="busy"
              @click="emit('cancel')"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-md bg-ink px-4 py-2 font-mono text-[12.5px] font-semibold text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
              :disabled="busy"
              @click="emit('confirm')"
            >
              {{ busy ? 'Working...' : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
