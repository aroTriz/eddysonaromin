<script setup lang="ts">
/**
 * ChatAttachment — renders a message attachment inside a chat bubble.
 * Images show inline (click to open full size); files show a small card
 * with a download link (the data-URL works as a normal download source).
 */
import { FileText } from 'lucide-vue-next'

import type { ChatAttachment } from '@/services/privateChatApi'
import { fileTypeLabel, formatBytes } from '@/utils/attachments'

defineProps<{
  attachment: ChatAttachment
  /** Dark bubble variant (own messages) — lightens the image frame. */
  dark?: boolean
}>()
</script>

<template>
  <!-- Image — inline, opens full-size in a new tab -->
  <a
    v-if="attachment.kind === 'image'"
    :href="attachment.data"
    target="_blank"
    rel="noopener noreferrer"
    class="block overflow-hidden rounded-lg"
    :class="dark ? 'ring-1 ring-bg/20' : 'border border-gray-200 dark:border-gray-300'"
    :title="attachment.name"
  >
    <img
      :src="attachment.data"
      :alt="attachment.name"
      class="max-h-64 w-full object-cover"
      loading="lazy"
    />
  </a>

  <!-- File — small card with a download link -->
  <a
    v-else
    :href="attachment.data"
    :download="attachment.name"
    target="_blank"
    rel="noopener noreferrer"
    class="flex min-w-[180px] items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-200/50"
    :class="dark
      ? 'border-bg/20 text-bg hover:bg-bg/10'
      : 'border-gray-200 dark:border-gray-300'"
  >
    <span
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
      :class="dark ? 'bg-bg/15' : 'bg-gray-100 dark:bg-gray-200'"
    >
      <FileText class="h-4 w-4" :stroke-width="1.7" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-[12.5px] font-medium" :class="dark ? 'text-bg' : 'text-ink'">
        {{ attachment.name }}
      </span>
      <span class="block font-mono text-[9.5px] opacity-70" :class="dark ? 'text-bg' : 'text-gray-400'">
        {{ fileTypeLabel(attachment.mime) }} · {{ formatBytes(attachment.size) }}
      </span>
    </span>
  </a>
</template>
