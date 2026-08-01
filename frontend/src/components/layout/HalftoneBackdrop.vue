<script setup lang="ts">
/**
 * Page-wide backdrop — halftone dot field in light mode, 3D rotating
 * star sphere (Three.js, from the resume site) in dark mode.
 * Decorative, pointer-events disabled.
 */
import { computed } from 'vue'

import StarsThree from '@/components/ui/StarsThree.vue'
import { useTheme } from '@/composables/useTheme'

const { preference } = useTheme()

const isDark = computed(() => {
  const dark =
    preference.value === 'dark' ||
    (preference.value === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  return dark
})
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0">
    <!-- Light mode: halftone dot textures (reference site look) -->
    <template v-if="!isDark">
      <div class="halftone halftone-wide mask-tr absolute right-0 top-0 h-[70vh] w-[65vw] opacity-[0.16]"></div>
      <div class="halftone mask-bl absolute bottom-0 left-0 h-[60vh] w-[55vw] opacity-[0.13]"></div>
    </template>

    <!-- Dark mode: 3D rotating star sphere (resume site look) -->
    <StarsThree v-else />
  </div>
</template>
