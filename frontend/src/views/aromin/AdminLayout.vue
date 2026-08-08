<script setup lang="ts">
/**
 * Admin layout — fixed left sidebar matching the main site's shell:
 * pixel logo, mono nav groups, theme switcher. Desktop ≥lg; on mobile a
 * sticky top bar with a full-screen menu (mirrors AppShell.vue).
 */
import { LogOut, Menu, Rss, Wrench, X } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { logout } from '@/composables/useAuth'
import StarsThree from '@/components/ui/StarsThree.vue'
import ThemeSwitch from '@/components/ui/ThemeSwitch.vue'

defineProps<{
  /** Route name of the active admin page. */
  active: string
}>()

const router = useRouter()
const mobileOpen = ref(false)

const navLinks = [
  { label: 'Blog', to: '/aromin/blog', name: 'aromin-blog', icon: Rss },
  { label: 'Tech Stack', to: '/aromin/stack', name: 'aromin-stack', icon: Wrench },
]

function openMobileMenu(): void {
  mobileOpen.value = true
  document.documentElement.style.overflow = 'hidden'
}

function closeMobileMenu(): void {
  mobileOpen.value = false
  document.documentElement.style.overflow = ''
}

async function handleLogout(): Promise<void> {
  await logout()
  router.push('/aromin')
}
</script>

<template>
  <div class="relative min-h-dvh bg-bg">
    <!-- Starfield across the whole admin interface -->
    <StarsThree />

    <!-- ── Desktop left sidebar (lg+) ─────────────────────────── -->
    <nav
      class="fixed inset-y-0 left-0 z-50 hidden w-56 flex-col border-r border-gray-200 bg-white px-7 py-8 lg:flex"
      aria-label="Admin"
    >
      <RouterLink to="/aromin/dashboard" class="shrink-0 font-pixel text-[15px] leading-none hover:opacity-60">
        &lt; Aromin-Admin /&gt;
      </RouterLink>

      <div class="mt-9 flex flex-1 flex-col gap-4 overflow-y-auto font-mono text-[13px]">
        <div class="flex flex-col gap-2.5">
          <RouterLink
            v-for="link in navLinks"
            :key="link.name"
            :to="link.to"
            class="relative inline-flex w-fit items-center gap-2.5 text-gray-500 hover:text-ink"
            :class="{ 'pl-5 text-ink': active === link.name }"
          >
            <component :is="link.icon" class="h-[1.15em] w-[1.15em] shrink-0" :stroke-width="1.7" />
            <svg
              v-if="active === link.name"
              class="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ link.label }}
          </RouterLink>
        </div>
      </div>

      <div class="mt-6 shrink-0">
        <div class="mb-4">
          <ThemeSwitch />
        </div>
        <div class="border-t border-gray-200 pt-3.5">
          <button
            type="button"
            class="inline-flex w-fit items-center gap-2.5 font-mono text-[13px] text-gray-400 transition-colors hover:text-red-500"
            @click="handleLogout"
          >
            <LogOut class="h-[1.15em] w-[1.15em]" :stroke-width="1.7" />
            logout
          </button>
        </div>
      </div>
    </nav>

    <!-- ── Mobile top bar (below lg) ─────────────────────────── -->
    <header class="sticky top-0 z-50 border-b border-gray-200/70 bg-white/90 backdrop-blur-md lg:hidden">
      <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <RouterLink to="/aromin/dashboard" class="font-pixel text-[14px]">&lt; Aromin-Admin /&gt;</RouterLink>
        <div class="flex items-center gap-3">
          <ThemeSwitch />
          <button
            type="button"
            aria-label="Open admin menu"
            class="-mr-1 p-1 text-gray-700 hover:text-ink"
            @click="openMobileMenu"
          >
            <Menu class="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>

    <!-- ── Mobile full-screen menu ───────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-[60] flex flex-col bg-white lg:hidden"
      >
        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-3">
          <RouterLink to="/aromin/dashboard" class="font-pixel text-[14px]" @click="closeMobileMenu">
            &lt; Aromin-Admin /&gt;
          </RouterLink>
          <button
            type="button"
            aria-label="Close admin menu"
            class="-mr-1 p-1 text-gray-700 hover:text-ink"
            @click="closeMobileMenu"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="flex flex-1 flex-col overflow-y-auto px-7 py-8 font-mono text-[16px]">
          <div class="flex flex-col gap-4">
            <RouterLink
              v-for="link in navLinks"
              :key="link.name"
              :to="link.to"
              class="relative inline-flex w-fit items-center gap-3 text-gray-700 hover:text-ink"
              :class="{ 'pl-6 text-ink': active === link.name }"
              @click="closeMobileMenu"
            >
              <component :is="link.icon" class="h-[1.15em] w-[1.15em] shrink-0" :stroke-width="1.7" />
              <svg
                v-if="active === link.name"
                class="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{ link.label }}
            </RouterLink>
          </div>
          <div class="my-5 h-px bg-gray-200" />
          <div class="flex flex-col gap-5">
            <button
              type="button"
              class="inline-flex w-fit items-center gap-2 text-[14px] text-gray-500 hover:text-red-500"
              @click="closeMobileMenu(); handleLogout()"
            >
              <LogOut class="h-[1.05em] w-[1.05em]" :stroke-width="1.7" />
              logout
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Content ───────────────────────────────────────────── -->
    <div class="relative z-10 lg:pl-56">
      <div class="mx-auto max-w-3xl px-6 py-10 lg:py-14">
        <slot />
      </div>
    </div>
  </div>
</template>
