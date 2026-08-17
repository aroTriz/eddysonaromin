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
import { computed, onMounted, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import ClickRipple from '@/components/ui/ClickRipple.vue'
import SalaryCat from '@/components/ui/SalaryCat.vue'
import SiteBackdrop from '@/components/layout/SiteBackdrop.vue'
import { useSiteBehavior } from '@/composables/useSiteBehavior'
import { useTheme } from '@/composables/useTheme'
import { bootPetConfig, petConfig } from '@/composables/usePetConfig'
import { trackVisit } from '@/utils/analytics'

// Boot theme handling (applies the persisted preference immediately).
useTheme()

// Boot the pet config from the backend API (global enabled/scale/speed/animate).
void bootPetConfig()

// Right-click protection toast.
const { toastVisible } = useSiteBehavior()

const route = useRoute()
const router = useRouter()

/**
 * Wait for the initial navigation (including the async auth guard on
 * /aromin routes) before rendering anything. Without this, a refresh on an
 * admin page briefly renders the public shell while the session check runs —
 * the wrong navbar flash.
 */
const routerReady = ref(false)
onMounted(async () => {
  await router.isReady()
  // Prefetch the home page's data behind the loading screen so every section
  // appears complete together. The wait is capped (and has a short minimum)
  // so the loader never drags even if one endpoint is slow.
  const { prefetchHomeData } = await import('@/services/api')
  const minShown = new Promise((res) => setTimeout(res, 350))
  await Promise.race([
    Promise.allSettled([prefetchHomeData(), minShown]),
    new Promise((res) => setTimeout(res, 1000)),
  ])
  const loader = document.getElementById('session-loader')
  if (loader) {
    loader.classList.add('is-done')
    await new Promise((res) => setTimeout(res, 350))
    loader.remove()
  }
  routerReady.value = true
})

/** Route name for nav highlighting — falls back to "home". */
const activeRoute = computed(() => (typeof route.name === 'string' ? route.name : 'home'))

/** The /aromin admin area has its own layout — hide the site shell there. */
const isAdmin = computed(() => route.path.startsWith('/aromin'))

/**
 * Analytics — count every public page view (admin pages excluded).
 * The server dedupes visitors by IP (same IP refreshing any number of
 * times = ONE visitor) and stores each view for the dashboard charts.
 * The initial navigation is tracked explicitly (afterEach registered after
 * router.isReady() does not fire for it); later ones via the hook.
 */
onMounted(async () => {
  await router.isReady()
  if (!route.path.startsWith('/aromin')) {
    void trackVisit(route.path, document.referrer)
  }
  router.afterEach((to) => {
    if (to.path.startsWith('/aromin')) return
    void trackVisit(to.path, document.referrer)
  })
})
</script>

<template>
  <!-- Root shell. Formerly <IonApp> (Ionic) — now a plain div; the app never
       relied on Ionic's runtime behaviour beyond the host element, so the
       wrapper swaps 1:1 and drops the Ionic framework from the bundle. -->
  <div class="bg-bg text-ink">
    <!-- Render nothing until the initial route (and its auth guard) settles,
         so a refresh on /aromin never flashes the public navbar. -->
    <template v-if="routerReady">
      <template v-if="isAdmin">
      <!-- Admin area — own layout, no site shell/backdrop.
           The blur entrance lives inside AdminLayout around the content
           only, so the sidebar never blurs. -->
      <main class="relative z-10 min-h-dvh">
        <RouterView />
      </main>
    </template>
    <template v-else>
      <SiteBackdrop />

      <AppShell :active="activeRoute" />

      <!-- SalaryCat desktop pet — always mounted, visibility toggled via CSS -->
      <SalaryCat />

      <!-- Routed content — offset by the fixed sidebar width on lg+.
           Keyed wrapper replays the blur entrance on route change; the
           sidebar/header live outside main so they never blur. -->
      <main class="relative z-10 min-h-dvh lg:pl-56">
        <div :key="route.path" class="page-enter">
          <RouterView />
        </div>
      </main>
    </template>
    </template>

    <!-- Global click ripple (greyfolio-style) — on every route, incl. admin -->
    <ClickRipple />

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
          Right Click Disabled
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
