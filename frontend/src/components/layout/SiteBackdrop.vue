<script setup lang="ts">
/**
 * SiteBackdrop — the single page-wide background, shared by the public site,
 * the admin area and the login/OTP screens so every light-mode page shows the
 * same neural-link node animation and every dark-mode page shows the 3D star
 * sphere. Decorative, pointer-events disabled, fixed behind the content (z-0).
 *
 * The two layers crossfade into each other on theme change (Vue Transition),
 * so the background is part of the smooth light/dark transition too.
 */
import { computed } from 'vue'

import NeuralLink from '@/components/layout/NeuralLink.vue'
import StarsThree from '@/components/ui/StarsThree.vue'
import { resolveIsDark, useTheme } from '@/composables/useTheme'

const { preference } = useTheme()

const isDark = computed(() => resolveIsDark(preference.value))
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0">
    <!-- Simultaneous crossfade (no out-in gap): the outgoing layer fades out
         while the incoming fades in, so the background never goes blank. -->
    <Transition name="bg-fade">
      <!-- Light mode: neural link node animation (greyfolio look) -->
      <NeuralLink v-if="!isDark" key="light" class="h-full w-full" />

      <!-- Dark mode: 3D rotating star sphere (resume site look) -->
      <StarsThree v-else key="dark" />
    </Transition>
  </div>
</template>

<style scoped>
/* Crossfade the two background layers on theme change. */
.bg-fade-enter-active,
.bg-fade-leave-active {
  transition: opacity 0.5s ease;
}
.bg-fade-enter-from,
.bg-fade-leave-to {
  opacity: 0;
}
</style>
