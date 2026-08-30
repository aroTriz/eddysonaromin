<script setup lang="ts">
/**
 * Fixed left sidebar (lg+) — mirrors the bryllim.com shell:
 * pixel logo, mono nav groups, theme switcher, contact footer.
 */
import { Bot, Command, Github, Linkedin, Mail, Menu, MessageCircle, MessagesSquare, PawPrint, Rss, ShoppingBag, User, Wrench, X } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'

import EmailModal from '@/components/home/EmailModal.vue'
import AskOverlay from '@/components/ui/AskOverlay.vue'
import AskTrizOverlay from '@/components/ui/AskTrizOverlay.vue'
import ChatOverlay from '@/components/ui/ChatOverlay.vue'
import PrivateChatOverlay from '@/components/ui/PrivateChatOverlay.vue'
import { petConfig, togglePetLocal } from '@/composables/usePetConfig'
import { profile } from '@/data/profile'
import ThemeSwitch from '@/components/ui/ThemeSwitch.vue'

/** Active viewers — fetched from /api/v1/visitors/active, polled every 30s. */
interface ActiveViewer { device: string; browser: string; os: string; city: string; country: string }
const activeCount = ref(1)
const activeViewers = ref<ActiveViewer[]>([])
let activePollTimer: ReturnType<typeof setInterval> | null = null

async function fetchActiveViewers(): Promise<void> {
  try {
    const res = await fetch('/api/v1/visitors/active', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json() as { count: number; viewers: ActiveViewer[] }
    activeCount.value = data.count || 1
    activeViewers.value = data.viewers || []
  } catch { /* fail-open: keep previous count */ }
}

defineProps<{
  /** Route name of the active page — drives the arrow indicator. */
  active: string
}>()

const emailRef = ref<InstanceType<typeof EmailModal> | null>(null)
const askRef = ref<InstanceType<typeof AskOverlay> | null>(null)
const askTrizRef = ref<InstanceType<typeof AskTrizOverlay> | null>(null)
const chatRef = ref<InstanceType<typeof ChatOverlay> | null>(null)
const privateChatRef = ref<InstanceType<typeof PrivateChatOverlay> | null>(null)
const isMac =  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const mobileOpen = ref(false)

/** Whether the "click me..." (Ask Anything) button shows in the sidebar (admin toggle).
 *  Default OFF + localStorage cache to prevent FOUC: when admin disables (click_me_enabled=0),
 *  a refresh previously flashed the button visible (ref=true) then hidden after fetch.
 *  Now it stays hidden until the API confirms enabled. Cache makes enabled case show instantly on next refresh. */
const CLICK_ME_CACHE = 'aromin-click-me-v1'
function readClickMeCache(): boolean {
  try { return localStorage.getItem(CLICK_ME_CACHE) === '1' } catch { return false }
}
const clickMeEnabled = ref(readClickMeCache())

/** Whether the "Ask Triz.ai" button shows in the sidebar (admin toggle). */
const ASK_TRIZ_CACHE = 'aromin-ask-triz-v1'
function readAskTrizCache(): boolean {
  try { return localStorage.getItem(ASK_TRIZ_CACHE) === '1' } catch { return false }
}
const askTrizEnabled = ref(readAskTrizCache())

function openMobileMenu(): void {
  mobileOpen.value = true
  document.documentElement.style.overflow = 'hidden'
}

function closeMobileMenu(): void {
  mobileOpen.value = false
  document.documentElement.style.overflow = ''
}

/** ⌘K / Alt+K — open the "Ask Triz.ai" overlay. ⌘J / Alt+J — open Command. ⌘P / Alt+P — toggle pet. */
function onGlobalKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.altKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    askTrizRef.value?.openAsk()
  }
  if ((e.metaKey || e.altKey) && e.key.toLowerCase() === 'j') {
    e.preventDefault()
    askRef.value?.openAsk()
  }
  if ((e.metaKey || e.altKey) && e.key.toLowerCase() === 'p') {
    e.preventDefault()
    if (petConfig.globalEnabled) togglePetLocal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  // Fetch sidebar button visibility settings — cache result to avoid flash on next refresh
  fetch('/api/v1/settings', { cache: 'no-store' })
    .then((r) => r.ok ? r.json() : null)
    .then((d) => {
      if (!d) return
      if (typeof d.click_me_enabled === 'boolean') {
        clickMeEnabled.value = d.click_me_enabled
        try { localStorage.setItem(CLICK_ME_CACHE, d.click_me_enabled ? '1' : '0') } catch { /* ignore */ }
      }
      if (typeof d.ask_triz_enabled === 'boolean') {
        askTrizEnabled.value = d.ask_triz_enabled
        try { localStorage.setItem(ASK_TRIZ_CACHE, d.ask_triz_enabled ? '1' : '0') } catch { /* ignore */ }
      }
    })
    .catch(() => { /* keep cached/default (OFF) — no flash */ })
  // Fetch active viewers immediately + poll every 30s
  void fetchActiveViewers()
  activePollTimer = setInterval(fetchActiveViewers, 30_000)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  if (activePollTimer) clearInterval(activePollTimer)
})

/**
 * Nav groups mirror bryllim.com's sidebar: three divisions separated by
 * hairline dividers (no visible group labels).
 *  - Group 1: services, blog        (what I do / write)
 *  - Group 2: projects, experience, stack, certifications, recommendations
 *  - Group 3: about, contact
 */
const navGroups = [
  {
    label: 'g1',
    links: [
      { label: 'Shop', to: '/shop', name: 'shop', icon: ShoppingBag },
      { label: 'Services', to: '/services', name: 'services', icon: Wrench },
      { label: 'Blog', to: '/blog', name: 'blog', icon: Rss },
    ],
  },
  {
    label: 'g2',
    links: [
      { label: 'Projects', to: '/projects', name: 'projects', icon: undefined },
      { label: 'Experience', to: '/experience', name: 'experience', icon: undefined },
      { label: 'Tech Stack', to: '/stack', name: 'stack', icon: undefined },
      { label: 'Certifications', to: '/certifications', name: 'certifications', icon: undefined },
      { label: 'Recommendations', to: '/recommendations', name: 'recommendations', icon: undefined },
    ],
  },
  {
    label: 'g3',
    links: [
      { label: 'About', to: '/about', name: 'about', icon: User },
      { label: 'Contact', to: '/contact', name: 'contact', icon: Mail },
    ],
  },
]
</script>

<template>
  <!-- ── Fixed left sidebar (lg+) ─────────────────────────── -->
  <!-- `bg-white` is theme-aware (remapped to --bg) so it flips to the exact
       page background (near-black #0c0c0f) in dark mode — no gray override.
       No self color-transition either: the View Transition snapshot handles
       the flip, keeping the sidebar perfectly in sync with the background. -->
  <nav
    class="fixed inset-y-0 left-0 z-50 hidden w-56 flex-col border-r border-gray-200 bg-white px-7 py-8 lg:flex"
    aria-label="Primary"
  >
    <RouterLink to="/" class="shrink-0 font-pixel text-[15px] leading-none text-ink hover:opacity-60 dark:text-gray-950">
      &lt; Aromin /&gt;
    </RouterLink>

    <div class="mt-9 flex flex-1 flex-col gap-4 overflow-y-auto font-mono text-[13px]">
      <template v-for="(group, gi) in navGroups" :key="group.label">
        <div class="flex flex-col gap-2.5">
          <RouterLink
            v-for="link in group.links"
            :key="link.name"
            :to="link.to"
            class="relative inline-flex w-fit items-center gap-2.5 text-gray-500 hover:text-ink dark:text-gray-400 dark:hover:text-gray-950"
            :class="{ 'pl-5 text-ink dark:text-gray-950': active === link.name }"
          >
            <component
              :is="link.icon"
              v-if="link.icon"
              class="h-[1.15em] w-[1.15em] shrink-0"
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
            {{ link.label }}
          </RouterLink>
        </div>
        <div v-if="gi < navGroups.length - 1" class="h-px bg-gray-200 dark:bg-gray-300" />
      </template>
    </div>

    <button
      type="button"
      class="mt-6 inline-flex w-fit items-center gap-2 text-[12px] text-gray-400 hover:text-ink dark:hover:text-gray-950"
      aria-label="Ask Triz.ai — AI chat assistant"
      @click="askTrizRef?.openAsk()"
    >
      <Bot class="h-3.5 w-3.5" :stroke-width="1.8" />
      <span>Ask Triz.ai</span>
      <span class="inline-flex items-center gap-1">
        <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] leading-none text-gray-500 dark:border-gray-500 dark:bg-gray-900 dark:text-gray-400">
          {{ isMac ? '⌘' : 'Alt' }}
        </kbd>
        <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500">+</span>
        <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] leading-none text-gray-500 dark:border-gray-500 dark:bg-gray-900 dark:text-gray-400">K</kbd>
      </span>
    </button>

    <button
      v-if="clickMeEnabled"
      type="button"
      class="mt-3 inline-flex w-fit items-center gap-2 text-[12px] text-gray-400 hover:text-ink dark:hover:text-gray-950"
      @click="askRef?.openAsk()"
    >
      <Command class="h-3.5 w-3.5" :stroke-width="1.8" />
      <span>Command</span>
      <span class="inline-flex items-center gap-1">
        <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] leading-none text-gray-500 dark:border-gray-500 dark:bg-gray-900 dark:text-gray-400">
          {{ isMac ? '⌘' : 'Alt' }}
        </kbd>
        <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500">+</span>
        <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] leading-none text-gray-500 dark:border-gray-500 dark:bg-gray-900 dark:text-gray-400">J</kbd>
      </span>
    </button>

    <button
      v-if="petConfig.globalEnabled"
      type="button"
      class="mt-3 inline-flex w-fit items-center gap-2 whitespace-nowrap text-[12px] transition-colors"
      :class="petConfig.enabled
        ? 'text-gray-700 hover:text-ink dark:text-gray-300 dark:hover:text-gray-950'
        : 'text-gray-400 hover:text-ink dark:text-gray-500 dark:hover:text-gray-950'"
      :aria-pressed="petConfig.enabled"
      :aria-label="petConfig.enabled ? 'Hide pet' : 'Show pet'"
      @click="togglePetLocal"
    >
      <PawPrint
        class="h-3.5 w-3.5"
        :stroke-width="1.8"
        :class="petConfig.enabled ? 'text-ink dark:text-gray-950' : 'text-gray-400'"
      />
      <span :class="petConfig.enabled ? 'text-ink dark:text-gray-950' : ''">toggle pet</span>
      <span class="inline-flex items-center gap-1">
        <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] leading-none text-gray-500 dark:border-gray-500 dark:bg-gray-900 dark:text-gray-400">
          {{ isMac ? '⌘' : 'Alt' }}
        </kbd>
        <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500">+</span>
        <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] leading-none text-gray-500 dark:border-gray-500 dark:bg-gray-900 dark:text-gray-400">P</kbd>
      </span>
    </button>

    <div class="mt-4 border-y border-gray-200 py-3.5 dark:border-gray-300">
      <p class="presence-label mt-1 font-mono text-[10.5px] text-gray-500 dark:text-gray-400">
        <b class="presence-num font-bold text-ink dark:text-gray-950">{{ activeCount }}</b>
        {{ activeCount === 1 ? 'person' : 'people' }} viewing now
      </p>
      <button
        type="button"
        class="mt-3 inline-flex w-fit items-center gap-2 font-mono text-[12px] text-gray-500 transition-colors hover:text-ink dark:text-gray-400 dark:hover:text-gray-950"
        @click="chatRef?.openChat()"
      >
        <MessageCircle class="h-4 w-4" :stroke-width="1.6" />
        community chat
      </button>
      <button
        type="button"
        class="mt-2 inline-flex w-fit items-center gap-2 font-mono text-[12px] text-gray-500 transition-colors hover:text-ink dark:text-gray-400 dark:hover:text-gray-950"
        @click="privateChatRef?.openChat()"
      >
        <MessagesSquare class="h-4 w-4" :stroke-width="1.6" />
        private chat
      </button>
    </div>

    <div class="mt-6 shrink-0">
      <div class="mb-4">
        <ThemeSwitch />
      </div>
      <div class="mb-3 flex items-center gap-2">
        <a
          :href="profile.github"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-ink dark:border-gray-500 dark:text-gray-400 dark:hover:text-gray-950"
          :aria-label="`GitHub — ${profile.github.replace('https://', '')}`"
          :title="`GitHub — ${profile.github.replace('https://', '')}`"
        >
          <Github class="h-3.5 w-3.5" :stroke-width="1.7" />
        </a>
        <a
          :href="profile.linkedin"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-ink dark:border-gray-500 dark:text-gray-400 dark:hover:text-gray-950"
          aria-label="LinkedIn profile"
          title="LinkedIn"
        >
          <Linkedin class="h-3.5 w-3.5" :stroke-width="1.7" />
        </a>
      </div>
      <p class="text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
        For work, collabs &amp; everything else, reach me at
      </p>
      <button
        type="button"
        class="mt-1.5 inline-flex w-fit max-w-full items-center gap-1.5 font-mono text-[10.5px] text-ink hover:text-gray-500 dark:text-gray-950 dark:hover:text-gray-400"
        aria-haspopup="dialog"
        @click="emailRef?.openModal()"
      >
        <Mail class="h-[1.05em] w-[1.05em] shrink-0" />
        <span class="whitespace-nowrap">{{ profile.email }}</span>
      </button>
    </div>
  </nav>

  <!-- ── Mobile top bar (below lg) ─────────────────────────── -->
  <header class="sticky top-0 z-50 border-b border-gray-200/70 bg-white/90 backdrop-blur-md lg:hidden">
    <div class="mx-auto flex max-w-3xl items-center justify-between px-4 sm:px-6 py-3">
      <RouterLink to="/" class="font-pixel text-[14px]">
        &lt; Aromin /&gt;
      </RouterLink>
      <button
        type="button"
        aria-label="Open menu"
        class="-mr-1 p-1 text-gray-700 hover:text-ink"
        @click="openMobileMenu"
      >
        <Menu class="h-5 w-5" />
      </button>
    </div>
  </header>

  <!-- ── Mobile full-screen menu (below lg) ─────────────────── -->
  <Teleport to="body">
    <div
      v-if="mobileOpen"
      id="mobileNav"
      class="fixed inset-0 z-[60] flex flex-col bg-white lg:hidden overflow-hidden"
    >
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <RouterLink to="/" class="font-pixel text-[14px]" @click="closeMobileMenu">
          &lt; Aromin /&gt;
        </RouterLink>
        <button
          type="button"
          aria-label="Close menu"
          class="-mr-1 p-1 text-gray-700 hover:text-ink"
          @click="closeMobileMenu"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="flex flex-1 flex-col overflow-y-auto px-7 py-8 font-mono text-[16px]">
        <div
          v-for="(group, gi) in navGroups"
          :key="group.label"
          class="mnav-group flex flex-col gap-4"
          :style="{ transitionDelay: `${0.05 + gi * 0.06}s` }"
        >
          <RouterLink
            v-for="link in group.links"
            :key="link.name"
            :to="link.to"
            class="relative inline-flex w-fit items-center gap-3 text-gray-700 hover:text-ink"
            :class="{ 'pl-6 text-ink': active === link.name }"
            @click="closeMobileMenu"
          >
            <component
              :is="link.icon"
              v-if="link.icon"
              class="h-[1.15em] w-[1.15em] shrink-0"
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
            {{ link.label }}
          </RouterLink>
        </div>
        <div class="my-5 h-px bg-gray-200" />
        <div class="mnav-group flex flex-col gap-5" style="transition-delay: 0.29s">
          <div>
            <button
              type="button"
              class="mb-5 inline-flex w-fit items-center gap-2 text-[14px] text-gray-500 hover:text-ink"
              aria-label="Ask Triz.ai — AI chat assistant"
              @click="closeMobileMenu(); askTrizRef?.openAsk()"
            >
              <span>Ask Triz.ai</span>
              <span class="inline-flex items-center gap-1">
                <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[10px] leading-none text-gray-500">
                  {{ isMac ? '⌘' : 'Alt' }}
                </kbd>
                <span class="text-[10px] text-gray-400">+</span>
                <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[10px] leading-none text-gray-500">K</kbd>
              </span>
            </button>
            <button
              v-if="clickMeEnabled"
              type="button"
              class="mb-5 inline-flex w-fit items-center gap-2 text-[14px] text-gray-500 hover:text-ink"
              @click="closeMobileMenu(); askRef?.openAsk()"
            >
              <Command class="h-[1.15em] w-[1.15em]" :stroke-width="1.6" />
              <span>Command</span>
              <span class="inline-flex items-center gap-1">
                <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[10px] leading-none text-gray-500">
                  {{ isMac ? '⌘' : 'Alt' }}
                </kbd>
                <span class="text-[10px] text-gray-400">+</span>
                <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[10px] leading-none text-gray-500">J</kbd>
              </span>
            </button>
            <button
              type="button"
              class="mb-5 inline-flex w-fit items-center gap-2 text-[14px] text-gray-600 hover:text-ink"
              @click="closeMobileMenu(); chatRef?.openChat()"
            >
              <MessageCircle class="h-[1.15em] w-[1.15em]" :stroke-width="1.6" />
              community chat
            </button>
            <button
              type="button"
              class="mb-5 inline-flex w-fit items-center gap-2 text-[14px] text-gray-600 hover:text-ink"
              @click="closeMobileMenu(); privateChatRef?.openChat()"
            >
              <MessagesSquare class="h-[1.15em] w-[1.15em]" :stroke-width="1.6" />
              private chat
            </button>
            <button
              v-if="petConfig.globalEnabled"
              type="button"
              class="mb-5 inline-flex w-fit items-center gap-2 text-[14px] transition-colors"
              :class="petConfig.enabled ? 'text-ink' : 'text-gray-600 hover:text-ink'"
              @click="togglePetLocal"
            >
              <PawPrint class="h-[1.15em] w-[1.15em]" :stroke-width="1.6" />
              toggle pet
              <span
                class="rounded-full px-1.5 py-0.5 text-[10px] leading-none"
                :class="petConfig.enabled ? 'bg-ink text-bg' : 'bg-gray-200 text-gray-500'"
              >{{ petConfig.enabled ? 'on' : 'off' }}</span>
            </button>
            <div class="mb-4">
              <ThemeSwitch />
            </div>
            <div class="mb-3 flex items-center gap-2">
              <a
                :href="profile.github"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-ink"
                aria-label="GitHub profile"
                title="GitHub"
              >
                <Github class="h-4 w-4" :stroke-width="1.7" />
              </a>
              <a
                :href="profile.linkedin"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-ink"
                aria-label="LinkedIn profile"
                title="LinkedIn"
              >
                <Linkedin class="h-4 w-4" :stroke-width="1.7" />
              </a>
            </div>
            <p class="text-[12px] leading-relaxed text-gray-500">
              For work, collabs &amp; everything else, reach me at
            </p>
            <button
              type="button"
              class="mt-1.5 inline-flex w-fit max-w-full items-center gap-1.5 text-[11px] text-ink hover:text-gray-500"
              aria-haspopup="dialog"
              @click="closeMobileMenu(); emailRef?.openModal()"
            >
              <Mail class="h-[1.05em] w-[1.05em] shrink-0" />
              <span class="whitespace-nowrap">{{ profile.email }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Ask Triz.ai overlay (⌘K / Alt+K) -->
  <AskTrizOverlay ref="askTrizRef" :enabled="askTrizEnabled" />

  <!-- "click me..." overlay (original Ask Anything) -->
  <AskOverlay ref="askRef" />

  <!-- Community chat (bryllim-style) -->
  <ChatOverlay ref="chatRef" />

  <!-- Private chat (1-on-1 DMs) -->
  <PrivateChatOverlay ref="privateChatRef" />

  <!-- Email "say hello" modal (bryllim-style) -->
  <EmailModal ref="emailRef" />
</template>
