<script setup lang="ts">
/**
 * App — root layout. Combines the halftone backdrop, the app shell
 * (fixed sidebar on lg+, mobile top bar + fullscreen menu below lg),
 * and the routed content, offset for the sidebar on desktop.
 */
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

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
      <IonRouterOutlet />
    </main>
  </IonApp>
</template>
