<script setup lang="ts">
/**
 * ThemeSwitch — 3-option segmented pill (System / Light / Dark) with
 * tiny icons, matching the bryllim.com theme switcher exactly.
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
    class="theme-switch inline-flex items-center gap-px rounded-full border border-gray-200 p-0.5"
    role="group"
    aria-label="Theme"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="theme-opt inline-flex items-center justify-center rounded-full text-gray-400 transition-colors hover:text-ink"
      :class="{ 'is-active': preference === option.value }"
      :title="option.label"
      :aria-label="option.label"
      :aria-pressed="preference === option.value"
      @click="pick(option.value, $event)"
    >
      <component :is="option.icon" :stroke-width="1.7" />
    </button>
  </div>
</template>

<style scoped>
.theme-switch {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 2px;
  border: 1px solid rgb(var(--g200));
  border-radius: 9999px;
}

.theme-opt {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 9999px;
  color: rgb(var(--g400));
  transition:
    color 0.2s,
    background-color 0.2s;
}

.theme-opt:hover {
  color: rgb(var(--ink));
}

.theme-opt.is-active {
  background: rgb(var(--g100));
  color: rgb(var(--ink));
}

.theme-opt svg {
  width: 13px;
  height: 13px;
}
</style>
