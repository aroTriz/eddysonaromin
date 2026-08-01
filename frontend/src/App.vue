<script setup lang="ts">
/**
 * App — root layout. Combines the halftone backdrop, the app shell
 * (fixed sidebar on lg+, mobile top bar + fullscreen menu below lg),
 * and the routed content, offset for the sidebar on desktop.
 *
 * NOTE: uses a plain vue-router <RouterView> instead of Ionic's
 * <IonRouterOutlet> — Ionic's outlet caches the previous view, which
 * prevented lazy-loaded pages from re-rendering on SPA navigation
 * (URL changed, content stayed on the old page).
 */
import { IonApp } from '@ionic/vue'
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import HalftoneBackdrop from '@/components/layout/HalftoneBackdrop.vue'
import { useTheme } from '@/composables/useTheme'

// Boot theme handling (applies the persisted preference immediately).
useTheme()

const route = useRoute()

/** Route name for nav highlighting — falls back to "home". */
const activeRoute = computed(() => (typeof route.name === 'string' ? route.name : 'home'))
</script>

<template>
  <IonApp class="bg-bg text-ink">
    <HalftoneBackdrop />

    <AppShell :active="activeRoute" />

    <!-- Routed content — offset by the fixed sidebar width on lg+ -->
    <main class="relative z-10 min-h-dvh lg:pl-56">
      <RouterView />
    </main>
  </IonApp>
</template>
