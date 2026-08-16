<script setup lang="ts">
/**
 * SearchableSelect — theme-aligned searchable dropdown (used for the
 * dashboard country filters). Mono font, bordered trigger, frosted panel.
 * Typing filters the options; click-outside / Esc closes it.
 */
import { Check, ChevronDown, Search } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export interface SelectOption {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SelectOption[]
    /** Label for the "all / world" choice (e.g. "all", "world map"). */
    allLabel?: string
    placeholder?: string
    /** aria-label on the trigger. */
    label?: string
  }>(),
  {
    allLabel: 'all',
    placeholder: 'Search…',
    label: 'Filter',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)
const query = ref('')
const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

/** Options filtered by the search query (case-insensitive). */
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter((o) => o.label.toLowerCase().includes(q))
})

const currentLabel = computed(
  () => props.options.find((o) => o.value === props.modelValue)?.label ?? props.allLabel,
)

function toggle(): void {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    // Focus the search box once the panel renders.
    requestAnimationFrame(() => searchInput.value?.focus())
  }
}

function select(value: string): void {
  emit('update:modelValue', value)
  open.value = false
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    open.value = false
    return
  }
  if (e.key === 'Enter' && filtered.value.length > 0) {
    select(filtered.value[0].value)
  }
}

function onClickOutside(e: MouseEvent): void {
  if (root.value && !root.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="root" class="relative">
    <!-- Trigger -->
    <button
      type="button"
      class="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 font-mono text-[11.5px] text-gray-600 transition-colors hover:border-gray-300 hover:text-ink"
      :aria-label="label"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="max-w-[180px] truncate">{{ currentLabel }}</span>
      <ChevronDown
        class="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform"
        :class="{ 'rotate-180': open }"
        :stroke-width="1.7"
      />
    </button>

    <!-- Panel -->
    <div
      v-if="open"
      class="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
      role="listbox"
      :aria-label="label"
    >
      <div class="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
        <Search class="h-3.5 w-3.5 shrink-0 text-gray-400" :stroke-width="1.7" />
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          class="w-full bg-transparent font-mono text-[12px] text-ink outline-none placeholder:text-gray-400"
          :placeholder="placeholder"
          @keydown="onKeydown"
        />
      </div>
      <ul class="max-h-56 overflow-y-auto py-1">
        <li>
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-[12px] transition-colors hover:bg-gray-50"
            :class="modelValue === '' ? 'text-ink' : 'text-gray-500'"
            role="option"
            :aria-selected="modelValue === ''"
            @click="select('')"
          >
            <Check
              class="h-3.5 w-3.5 shrink-0 text-ink"
              :class="modelValue === '' ? 'opacity-100' : 'opacity-0'"
              :stroke-width="2"
            />
            <span class="truncate">{{ allLabel }}</span>
          </button>
        </li>
        <li v-for="opt in filtered" :key="opt.value">
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-[12px] transition-colors hover:bg-gray-50"
            :class="modelValue === opt.value ? 'text-ink' : 'text-gray-500'"
            role="option"
            :aria-selected="modelValue === opt.value"
            @click="select(opt.value)"
          >
            <Check
              class="h-3.5 w-3.5 shrink-0 text-ink"
              :class="modelValue === opt.value ? 'opacity-100' : 'opacity-0'"
              :stroke-width="2"
            />
            <span class="truncate">{{ opt.label }}</span>
          </button>
        </li>
        <li v-if="filtered.length === 0">
          <p class="px-3 py-2 font-mono text-[11.5px] text-gray-400">// no matches</p>
        </li>
      </ul>
    </div>
  </div>
</template>
