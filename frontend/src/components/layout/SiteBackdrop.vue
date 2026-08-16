<script setup lang="ts">
/**
 * SiteBackdrop — the single page-wide background, shared by the public site,
 * the admin area and the login/OTP screens so every light-mode page shows the
 * same neural-link node animation and every dark-mode page shows the 3D star
 * sphere. Decorative, pointer-events disabled, fixed behind the content (z-0).
 *
 * BOTH canvases stay mounted permanently (wrapped in v-show, not v-if). A
 * theme switch only toggles CSS visibility — no mount/unmount mid-View-
 * Transition. That is what makes the neural link appear INSTANTLY on the
 * dark→light switch: its canvas is already painted (mounted at page load),
 * so the browser never has to construct a fresh canvas inside the frozen
 * transition frame. Each component receives `active` so the hidden one
 * pauses its rAF loop (no double animation cost = no lag).
 *
 * The whole layer can be turned off from /aromin/preferences ("Animated
 * Backdrops"): when disabled the canvases are not rendered at all and the
 * themes show PURE colors (plain white / plain near-black).
 */
import { computed, onMounted, ref } from 'vue'

import NeuralLink from '@/components/layout/NeuralLink.vue'
import StarsThree from '@/components/ui/StarsThree.vue'
import { resolveIsDark, useTheme } from '@/composables/useTheme'
import { fetchBackdropEnabled } from '@/services/chatApi'

const { preference } = useTheme()

const isDark = computed(() => resolveIsDark(preference.value))

/** Animated backdrops on/off — from the server-side site setting. Fail-open. */
const backdropOn = ref(true)
onMounted(() => {
  void fetchBackdropEnabled().then((ok) => {
    backdropOn.value = ok
  })
})
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0">
    <template v-if="backdropOn">
      <!-- Light mode: neural link node animation (greyfolio look) —
           kept mounted + painted, only visibility toggles -->
      <div v-show="!isDark" class="absolute inset-0">
        <NeuralLink :active="!isDark" class="h-full w-full" />
      </div>

      <!-- Dark mode: 3D rotating star sphere (resume site look) -->
      <div v-show="isDark" class="absolute inset-0">
        <StarsThree :active="isDark" />
      </div>
    </template>
    <!-- backdropOn = false → render nothing → pure theme background -->
  </div>
</template>
