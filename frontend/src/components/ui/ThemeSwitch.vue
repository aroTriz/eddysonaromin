<script setup lang="ts">
/**
 * Light / Dark / System theme switcher — mirrors the reference pill control.
 */
import { Monitor, Moon, Sun } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'
import type { ThemePreference } from '@/composables/useTheme'

const { preference, setTheme } = useTheme()

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System theme', icon: Monitor },
  { value: 'light', label: 'Light theme', icon: Sun },
  { value: 'dark', label: 'Dark theme', icon: Moon },
]

function pick(option: ThemePreference, event: MouseEvent): void {
  setTheme(option, event)
}
</script>

<template>
  <div
    class="theme-switch inline-flex items-center gap-[1px] rounded-full border border-gray-200 p-0.5"
    role="group"
    aria-label="Theme"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="theme-opt inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-gray-400 hover:text-ink"
      :class="{ 'is-active bg-gray-100 text-ink': preference === option.value }"
      :title="option.label"
      :aria-label="option.label"
      :aria-pressed="preference === option.value"
      @click="pick(option.value, $event)"
    >
      <component :is="option.icon" class="h-[13px] w-[13px]" :stroke-width="1.7" />
    </button>
  </div>
</template>
