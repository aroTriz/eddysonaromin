<script setup lang="ts">
/**
 * AdminPageHeader — the single CMS page header (desktop-first).
 * Pixel title + mono `// comment` + primary "New" action.
 * Extracted verbatim from the CMS views so every /aromin page matches.
 */
import { Plus } from 'lucide-vue-next'

defineProps<{
  /** Pixel title without the trailing dot, e.g. "certifications". */
  title: string
  /** Mono comment under the title, e.g. "// manage credentials". */
  comment: string
  /** Label of the primary action, e.g. "New certification". */
  newLabel: string
}>()

const emit = defineEmits<{
  (e: 'new'): void
}>()
</script>

<template>
  <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
        {{ title }}<span class="text-gray-400">.</span>
      </h1>
      <p class="mt-1.5 font-mono text-[12px] text-gray-500">// {{ comment }}</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[12px] font-semibold text-bg transition-opacity hover:opacity-80"
      @click="emit('new')"
    >
      <Plus class="h-3.5 w-3.5" :stroke-width="1.7" />
      {{ newLabel }}
    </button>
  </div>
</template>
