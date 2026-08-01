<script setup lang="ts">
/**
 * ThemeSwitch — animated light/dark toggle with a sliding knob and
 * rotating sun/moon icons, matching the resume site's navbar toggle.
 * Keeps the light/dark/system semantics from useTheme: the switch
 * flips light <-> dark, and "system" is used for the initial value.
 */
import { computed } from 'vue'

import { useTheme } from '@/composables/useTheme'

const { preference, setTheme } = useTheme()

const isDark = computed(() => {
  if (preference.value === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return preference.value === 'dark'
})

function toggle(event: MouseEvent): void {
  setTheme(isDark.value ? 'light' : 'dark', event)
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :class="{ dark: isDark }"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDark ? 'Light mode' : 'Dark mode'"
    :aria-pressed="isDark"
    @click="toggle($event)"
  >
    <span class="theme-toggle-track">
      <span class="theme-toggle-knob" :class="{ dark: isDark }">
        <!-- Sun -->
        <svg
          class="toggle-icon sun"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <!-- Moon -->
        <svg
          class="toggle-icon moon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
    </span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  outline: none;
  line-height: 0;
}

.theme-toggle .theme-toggle-track {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: rgb(var(--g300));
  transition: background 0.3s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.theme-toggle:hover .theme-toggle-track {
  background: rgb(var(--g400));
}

.theme-toggle.dark .theme-toggle-track {
  background: rgb(var(--g600));
}

.theme-toggle .theme-toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgb(var(--bg));
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.35s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.theme-toggle.dark .theme-toggle-knob {
  left: calc(100% - 22px);
  background: rgb(var(--g50));
}

.theme-toggle .toggle-icon {
  position: absolute;
  transition:
    opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.theme-toggle .toggle-icon.sun {
  color: rgb(var(--ink));
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.theme-toggle.dark .toggle-icon.sun {
  opacity: 0;
  transform: rotate(180deg) scale(0.2);
}

.theme-toggle .toggle-icon.moon {
  color: rgb(var(--ink));
  opacity: 0;
  transform: rotate(-90deg) scale(0.2);
}

.theme-toggle.dark .toggle-icon.moon {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.theme-toggle:hover .theme-toggle-knob {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.theme-toggle:active .theme-toggle-knob {
  transform: scale(0.95);
}
</style>
