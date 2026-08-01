<script setup lang="ts">
/**
 * Fixed left sidebar (lg+) — mirrors the bryllim.com shell:
 * pixel logo, mono nav groups, theme switcher, contact footer.
 */
import { Github, Globe, Linkedin, Mail, Menu, Rss, User, X } from 'lucide-vue-next'
import { ref } from 'vue'

import { profile } from '@/data/profile'
import ThemeSwitch from '@/components/ui/ThemeSwitch.vue'

defineProps<{
  /** Route name of the active page — drives the arrow indicator. */
  active: string
}>()

const mobileOpen = ref(false)

function openMobileMenu(): void {
  mobileOpen.value = true
  document.documentElement.style.overflow = 'hidden'
}

function closeMobileMenu(): void {
  mobileOpen.value = false
  document.documentElement.style.overflow = ''
}

const navGroups = [
  {
    label: 'work',
    links: [
      { label: 'Projects', to: '/projects', name: 'projects', icon: undefined },
      { label: 'Experience', to: '/experience', name: 'experience', icon: undefined },
      { label: 'Stack', to: '/stack', name: 'stack', icon: undefined },
      { label: 'Certifications', to: '/certifications', name: 'certifications', icon: undefined },
      { label: 'Recommendations', to: '/recommendations', name: 'recommendations', icon: undefined },
    ],
  },
  {
    label: 'writing',
    links: [
      { label: 'Blog', to: '/blog', name: 'blog', icon: Rss },
    ],
  },
]

const contactLinks = [
  { label: 'About', to: '/about', name: 'about', icon: User },
  { label: 'Contact', to: '/contact', name: 'contact', icon: Mail },
]
</script>

<template>
  <!-- ── Fixed left sidebar (lg+) ─────────────────────────── -->
  <nav
    class="fixed inset-y-0 left-0 z-50 hidden w-56 flex-col border-r border-gray-200 bg-white px-7 py-8 lg:flex"
    aria-label="Primary"
  >
    <RouterLink to="/" class="shrink-0 font-pixel text-[15px] leading-none hover:opacity-60">
      &lt; Aromin /&gt;
    </RouterLink>

    <div class="mt-9 flex flex-1 flex-col gap-4 overflow-y-auto font-mono text-[13px]">
      <template v-for="group in navGroups" :key="group.label">
        <div class="flex flex-col gap-2.5">
          <RouterLink
            v-for="link in group.links"
            :key="link.name"
            :to="link.to"
            class="relative inline-flex w-fit items-center gap-2.5 text-gray-500 hover:text-ink"
            :class="{ 'pl-5 text-ink': active === link.name }"
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
        <div class="h-px bg-gray-200" />
      </template>

      <div class="flex flex-col gap-2.5">
        <RouterLink
          v-for="link in contactLinks"
          :key="link.name"
          :to="link.to"
          class="relative inline-flex w-fit items-center gap-2.5 text-gray-500 hover:text-ink"
          :class="{ 'pl-5 text-ink': active === link.name }"
        >
          <component :is="link.icon" class="h-[1.15em] w-[1.15em] shrink-0" />
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

    <div class="mt-4 border-y border-gray-200 py-3.5">
      <p class="presence-label mt-1 font-mono text-[10.5px] text-gray-500">
        <b class="presence-num font-bold text-ink">1</b> person viewing now
      </p>
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
          class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-ink"
          :aria-label="`GitHub — ${profile.github.replace('https://', '')}`"
          :title="`GitHub — ${profile.github.replace('https://', '')}`"
        >
          <Github class="h-3.5 w-3.5" :stroke-width="1.7" />
        </a>
        <a
          :href="profile.linkedin"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-ink"
          aria-label="LinkedIn profile"
          title="LinkedIn"
        >
          <Linkedin class="h-3.5 w-3.5" :stroke-width="1.7" />
        </a>
        <a
          :href="`https://${profile.portfolio}`"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-ink"
          aria-label="Portfolio site"
          title="Portfolio"
        >
          <Globe class="h-3.5 w-3.5" :stroke-width="1.7" />
        </a>
      </div>
      <p class="text-[12px] leading-relaxed text-gray-500">
        For work, collabs &amp; everything else, reach me at
      </p>
      <a
        :href="`mailto:${profile.email}`"
        class="mt-1.5 inline-flex w-fit max-w-full items-center gap-1.5 font-mono text-[10.5px] text-ink hover:text-gray-500"
      >
        <Mail class="h-[1.05em] w-[1.05em] shrink-0" />
        <span class="whitespace-nowrap">{{ profile.email }}</span>
      </a>
    </div>
  </nav>

  <!-- ── Mobile top bar (below lg) ─────────────────────────── -->
  <header class="sticky top-0 z-50 border-b border-gray-200/70 bg-white/90 backdrop-blur-md lg:hidden">
    <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
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
      class="fixed inset-0 z-[60] flex flex-col bg-white lg:hidden"
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
        <div class="mnav-group flex flex-col gap-4" style="transition-delay: 0.23s">
          <RouterLink
            v-for="link in contactLinks"
            :key="link.name"
            :to="link.to"
            class="relative inline-flex w-fit items-center gap-3 text-gray-700 hover:text-ink"
            @click="closeMobileMenu"
          >
            <component :is="link.icon" class="h-[1.15em] w-[1.15em] shrink-0" />
            {{ link.label }}
          </RouterLink>
        </div>
        <div class="my-5 h-px bg-gray-200" />
        <div class="mnav-group flex flex-col gap-5" style="transition-delay: 0.29s">
          <div>
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
              <a
                :href="`https://${profile.portfolio}`"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-ink"
                aria-label="Portfolio site"
                title="Portfolio"
              >
                <Globe class="h-4 w-4" :stroke-width="1.7" />
              </a>
            </div>
            <p class="text-[12px] leading-relaxed text-gray-500">
              For work, collabs &amp; everything else, reach me at
            </p>
            <a
              :href="`mailto:${profile.email}`"
              class="mt-1.5 inline-flex w-fit max-w-full items-center gap-1.5 text-[11px] text-ink hover:text-gray-500"
            >
              <Mail class="h-[1.05em] w-[1.05em] shrink-0" />
              <span class="whitespace-nowrap">{{ profile.email }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
