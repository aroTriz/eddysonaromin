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
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import HalftoneBackdrop from '@/components/layout/HalftoneBackdrop.vue'
import { useSiteBehavior } from '@/composables/useSiteBehavior'
import { useTheme } from '@/composables/useTheme'

// Boot theme handling (applies the persisted preference immediately).
useTheme()

// Right-click protection toast.
const { toastVisible } = useSiteBehavior()

const route = useRoute()

/** Route name for nav highlighting — falls back to "home". */
const activeRoute = computed(() => (typeof route.name === 'string' ? route.name : 'home'))

/** The /aromin admin area has its own layout — hide the site shell there. */
const isAdmin = computed(() => route.path.startsWith('/aromin'))

/** Count this visit once per browser session (public pages only). */
onMounted(() => {
  if (isAdmin.value) return
  try {
    if (sessionStorage.getItem('aromin_visit_counted')) return
    sessionStorage.setItem('aromin_visit_counted', '1')
    fetch('/api/v1/visitors', { method: 'POST' }).catch(() => {})
  } catch {
    /* ignore */
  }
})
</script>

<template>
  <IonApp class="bg-bg text-ink">
    <template v-if="isAdmin">
      <!-- Admin area — own layout, no site shell/backdrop -->
      <main class="relative z-10 min-h-dvh">
        <RouterView />
      </main>
    </template>
    <template v-else>
      <HalftoneBackdrop />

      <AppShell :active="activeRoute" />

      <!-- Routed content — offset by the fixed sidebar width on lg+ -->
      <main class="relative z-10 min-h-dvh lg:pl-56">
        <RouterView />
      </main>
    </template>

    <!-- Right-click disabled toast (top-right) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)]"
        enter-from-class="translate-y-1 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-1 opacity-0"
      >
        <div
          v-if="toastVisible"
          class="fixed right-6 top-6 z-[200] flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3.5 py-2 font-mono text-[12px] text-ink shadow-lg"
          role="status"
        >
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true"></span>
          right click disabled
        </div>
      </Transition>
    </Teleport>
  </IonApp>
</template>
