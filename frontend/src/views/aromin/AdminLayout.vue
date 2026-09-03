<script setup lang="ts">
/**
 * Admin layout — fixed left sidebar matching the main site's shell:
 * pixel logo, mono nav groups, theme switcher. Desktop ≥lg; on mobile a
 * sticky top bar with a full-screen menu (mirrors AppShell.vue).
 */
import { FolderKanban, Briefcase, Contact, LayoutDashboard, LogOut, Menu, MessageCircle, MessagesSquare, Quote, Rss, Settings2, Users, X } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getToken, logout } from '@/composables/useAuth'
import { fetchAdminPrivateUnread } from '@/services/adminApi'
import SiteBackdrop from '@/components/layout/SiteBackdrop.vue'
import ThemeSwitch from '@/components/ui/ThemeSwitch.vue'

defineProps<{
  /** Route name of the active admin page. */
  active: string
  /** Wider content container (data tables / dashboards). Defaults to false. */
  wide?: boolean
}>()

const router = useRouter()
const route = useRoute()
const mobileOpen = ref(false)

/** Total unread visitor DMs — drives the red dot on "Private Chat". */
const unreadPrivate = ref(0)
let unreadTimer: ReturnType<typeof setInterval> | null = null

async function refreshUnread(): Promise<void> {
  if (!getToken()) return
  unreadPrivate.value = await fetchAdminPrivateUnread()
}

function startUnreadPoll(): void {
  if (unreadTimer) return
  void refreshUnread()
  unreadTimer = setInterval(() => void refreshUnread(), 15_000)
}

function stopUnreadPoll(): void {
  if (unreadTimer) {
    clearInterval(unreadTimer)
    unreadTimer = null
  }
}

/** Pause the poll while the tab is hidden — no wasted requests in the background. */
function onVisibility(): void {
  if (document.visibilityState === 'hidden') stopUnreadPoll()
  else startUnreadPoll()
}

onMounted(() => {
  startUnreadPoll()
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stopUnreadPoll()
  document.removeEventListener('visibilitychange', onVisibility)
})

// Refresh the badge right after opening the private chat (read → dot gone).
watch(
  () => route.path,
  (p) => {
    if (p === '/aromin/private-chat') void refreshUnread()
  },
)

/**
 * Nav groups mirror the main site's sidebar (AppShell.vue): divisions
 * separated by hairline dividers.
 *  - Group 1: Dashboard          (overview)
 *  - Group 2: Blog, Recommendations   (content)
 *  - Group 3: Community Chat, Private Chat  (messaging)
 *  - Group 4: Users, Preferences (accounts & settings)
 */
const navGroups = [
  {
    label: 'g1',
    links: [
      { label: 'Dashboard', to: '/aromin/dashboard', name: 'aromin-dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'g2',
    links: [
      { label: 'Blog', to: '/aromin/blog', name: 'aromin-blog', icon: Rss },
      { label: 'Projects', to: '/aromin/projects', name: 'aromin-projects', icon: FolderKanban },
      { label: 'Experience', to: '/aromin/experience', name: 'aromin-experience', icon: Briefcase },
      { label: 'Recommendations', to: '/aromin/recommendations', name: 'aromin-recommendations', icon: Quote },
      { label: 'References', to: '/aromin/references', name: 'aromin-references', icon: Contact },
    ],
  },
  {
    label: 'g3',
    links: [
      { label: 'Community Chat', to: '/aromin/chat', name: 'aromin-chat', icon: MessageCircle },
      { label: 'Private Chat', to: '/aromin/private-chat', name: 'aromin-private-chat', icon: MessagesSquare },
    ],
  },
  {
    label: 'g4',
    links: [
      { label: 'Users', to: '/aromin/users', name: 'aromin-users', icon: Users },
      { label: 'Preferences', to: '/aromin/preferences', name: 'aromin-preferences', icon: Settings2 },
    ],
  },
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
    <!-- Theme-aware backdrop: neural link in light mode, star sphere in dark -->
    <SiteBackdrop />

    <!-- ── Desktop left sidebar (lg+) ─────────────────────────── -->
    <!-- `bg-white` is theme-aware (remapped to --bg) so it flips to the exact
         page background (near-black #0c0c0f) in dark mode — no gray override.
         No self color-transition: the View Transition snapshot keeps the
         sidebar perfectly in sync with the background during the flip. -->
    <nav
      class="fixed inset-y-0 left-0 z-50 hidden w-56 flex-col border-r border-gray-200 bg-white px-7 py-8 lg:flex"
      aria-label="Admin"
    >
      <RouterLink to="/aromin/dashboard" class="shrink-0 font-pixel text-[15px] leading-none text-ink hover:opacity-60 dark:text-gray-950">
        &lt; Aromin-Admin /&gt;
      </RouterLink>

      <div class="mt-9 flex flex-1 flex-col gap-4 overflow-y-auto font-mono text-[13px]">
        <template v-for="(group, gi) in navGroups" :key="group.label">
          <div class="flex flex-col gap-2.5">
            <RouterLink
              v-for="link in group.links"
              :key="link.name"
              :to="link.to"
              class="relative inline-flex w-fit items-center gap-2.5 whitespace-nowrap text-gray-500 hover:text-ink dark:text-gray-400 dark:hover:text-gray-950"
              :class="{ 'pl-5 text-ink dark:text-gray-950': active === link.name }"
            >
              <component :is="link.icon" class="h-[1.15em] w-[1.15em] shrink-0" :stroke-width="1.7" />
              {{ link.label }}
              <span
                v-if="link.name === 'aromin-private-chat' && unreadPrivate > 0"
                class="ml-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
                :title="`${unreadPrivate} unread message${unreadPrivate > 1 ? 's' : ''}`"
                aria-label="Unread private messages"
              />
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
            </RouterLink>
          </div>
          <div v-if="gi < navGroups.length - 1" class="h-px bg-gray-200 dark:bg-gray-300" />
        </template>
      </div>

      <div class="mt-6 shrink-0">
        <div class="mb-4">
          <ThemeSwitch />
        </div>
        <div class="border-t border-gray-200 pt-3.5 dark:border-gray-300">
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
      <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-2.5">
        <RouterLink to="/aromin/dashboard" class="-my-2 py-2 font-pixel text-[14px]">&lt; Aromin-Admin /&gt;</RouterLink>
        <div class="flex items-center gap-3">
          <ThemeSwitch />
          <button
            type="button"
            aria-label="Open admin menu"
            class="-mr-1.5 flex h-11 w-11 items-center justify-center text-gray-700 hover:text-ink"
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
            class="-mr-1.5 flex h-11 w-11 items-center justify-center text-gray-700 hover:text-ink"
            @click="closeMobileMenu"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="flex flex-1 flex-col overflow-y-auto px-7 py-8 font-mono text-[16px]">
          <template v-for="(group, gi) in navGroups" :key="group.label">
            <div class="flex flex-col gap-4">
              <RouterLink
                v-for="link in group.links"
                :key="link.name"
                :to="link.to"
                class="relative inline-flex w-fit items-center gap-3 whitespace-nowrap py-2 text-gray-700 hover:text-ink"
                :class="{ 'pl-6 text-ink': active === link.name }"
                @click="closeMobileMenu"
              >
              <component :is="link.icon" class="h-[1.15em] w-[1.15em] shrink-0" :stroke-width="1.7" />
              {{ link.label }}
              <span
                v-if="link.name === 'aromin-private-chat' && unreadPrivate > 0"
                class="ml-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
                :title="`${unreadPrivate} unread message${unreadPrivate > 1 ? 's' : ''}`"
                aria-label="Unread private messages"
              />
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
              </RouterLink>
            </div>
            <div v-if="gi < navGroups.length - 1" class="my-5 h-px bg-gray-200" />
          </template>
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
      <div
        class="mx-auto px-4 sm:px-6 py-6 sm:py-10 lg:py-14"
        :class="wide ? 'max-w-6xl' : 'max-w-3xl'"
      >
        <!-- Keyed wrapper — blur entrance on route change; the sidebar and
             top bar live outside this wrapper so they never blur. -->
        <div :key="route.path" class="page-enter">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
