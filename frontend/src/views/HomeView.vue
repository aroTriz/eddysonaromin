<script setup lang="ts">
/**
 * Home — mirrors bryllim.com's hero: profile video left, pixel-font
 * name + intro paragraphs + social links right; stats grid, tech
 * marquee, and serif recommendation card below.
 */
import { ArrowUpRight, Mail } from 'lucide-vue-next'

import ProfileVideo from '@/components/home/ProfileVideo.vue'
import ProjectDeck from '@/components/home/ProjectDeck.vue'
import {
  allTechnologies,
  profile,
  recommendations,
  stats,
} from '@/data/profile'

const marqueeList = [...allTechnologies, ...allTechnologies]
const year = new Date().getFullYear()

const intro = [
  "I'm a full-stack engineer. I build modern web & mobile apps, and these days I'm focused on generative AI.",
  "Right now I'm building cool new stuff every day. I love turning rough ideas into things people actually use.",
]

const socials = [
  { label: 'github', href: profile.github },
  { label: 'linkedin', href: profile.linkedin },
  { label: 'portfolio', href: `https://${profile.portfolio}` },
]
</script>

<template>
  <div class="mx-auto w-full max-w-2xl px-6">
    <!-- ── Hero ─────────────────────────────────────────────── -->
    <section class="relative py-16 sm:py-24">
      <div class="grid gap-9 sm:grid-cols-[16rem_1fr] sm:items-start sm:gap-10">
        <!-- Video column (left) — fixed aspect so the phone doesn't collapse -->
        <div class="reveal d1 mx-auto w-full max-w-[18rem] sm:mx-0">
          <div class="aspect-[3/4] w-full">
            <ProfileVideo />
          </div>
        </div>

        <!-- Text column (right) -->
        <div>
          <h1 class="reveal d2 font-pixel text-[1.9rem] leading-none sm:text-[2.4rem]">
            {{ profile.name }}
          </h1>

          <p
            v-for="(paragraph, i) in intro"
            :key="i"
            class="reveal d3 mt-6 text-[15px] leading-relaxed text-gray-600"
            :class="{ 'mt-5': i > 0 }"
          >
            {{ paragraph }}
          </p>

          <!-- links below the intro -->
          <div
            class="reveal d4 mt-7 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[12px] text-gray-500"
          >
            <a
              v-for="social in socials"
              :key="social.label"
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-ink"
            >
              {{ social.label }} <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
            </a>
            <a :href="`mailto:${profile.email}`" class="hover:text-ink">email <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" /></a>
          </div>

          <div class="reveal d5 mt-8 flex flex-wrap items-center gap-4">
            <RouterLink
              to="/projects"
              class="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-mono text-[13px] text-bg transition-opacity hover:opacity-80"
            >
              View My Work
              <ArrowUpRight class="h-4 w-4" :stroke-width="1.8" />
            </RouterLink>
            <a
              :href="`mailto:${profile.email}`"
              class="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 font-mono text-[13px] text-gray-600 hover:border-gray-300 hover:text-ink"
            >
              Get In Touch
              <Mail class="h-4 w-4" :stroke-width="1.8" />
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Stats (bryllim-style) ────────────────────────────── -->
    <section
      aria-label="Highlights"
      class="grid grid-cols-2 divide-x divide-y divide-gray-200 border-t border-gray-200 sm:grid-cols-5 sm:divide-y-0"
    >
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="flex flex-col items-center py-6 text-center sm:px-4"
      >
        <div class="font-pixel text-lg leading-none text-ink">{{ stat.value }}</div>
        <div class="mt-2 font-mono text-[11px] uppercase tracking-wider text-gray-500">
          {{ stat.label }}
        </div>
      </div>
    </section>

    <!-- ── Tech marquee ─────────────────────────────────────── -->
    <section aria-label="Tech stack" class="mt-16">
      <p class="terminal-comment mb-4 text-[13px]">// tech stack</p>
      <div class="mask-fade-x overflow-hidden">
        <div class="flex w-max animate-marquee gap-3">
          <span
            v-for="(tech, i) in marqueeList"
            :key="`${tech}-${i}`"
            class="rounded-full border border-gray-200 px-4 py-1.5 font-mono text-[13px] text-gray-600"
          >
            {{ tech }}
          </span>
        </div>
      </div>
    </section>

    <!-- ── Projects spotlight deck (bryllim-style, personal only) ── -->
    <section id="projects" aria-label="Projects" class="py-14">
      <div class="mb-8 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">02 — projects</h2>
        <RouterLink
          to="/projects"
          class="font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          all projects <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>

      <ProjectDeck />
    </section>

    <!-- ── Recommendations (bryllim 3-card grid) ──────────────── -->
    <section id="recommendations" aria-label="Recommendations" class="py-14">
      <div class="mb-8 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">05 — recommendations</h2>
        <RouterLink
          to="/recommendations"
          class="font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          all recommendations <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <a
          v-for="rec in recommendations.slice(0, 3)"
          :key="rec.initials"
          href="/recommendations"
          class="group flex flex-col rounded-xl bg-gradient-to-b from-gray-50 to-white p-5 shadow-[0_8px_22px_-16px_rgba(10,10,10,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(10,10,10,0.35)]"
        >
          <svg class="h-5 w-5 text-gray-200" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M9 7H6a3 3 0 00-3 3v1a3 3 0 003 3h1v1a2 2 0 01-2 2H4v2h1a4 4 0 004-4V7zm11 0h-3a3 3 0 00-3 3v1a3 3 0 003 3h1v1a2 2 0 01-2 2h-1v2h1a4 4 0 004-4V7z" />
          </svg>

          <p class="rec-quote mt-2 line-clamp-5 text-[13.5px] leading-relaxed text-gray-700">
            {{ rec.quote }}
          </p>

          <div class="mt-4 flex items-center gap-2.5 border-t border-gray-100 pt-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[10px] font-medium text-gray-600">
              {{ rec.initials }}
            </div>
            <div class="min-w-0">
              <div class="truncate text-[12px] font-semibold text-ink">{{ rec.author }}</div>
              <div class="truncate font-mono text-[9px] uppercase tracking-wider text-gray-400">
                {{ rec.role }}
              </div>
            </div>
          </div>
        </a>
      </div>
    </section>

    <!-- ── Footer ───────────────────────────────────────────── -->
    <footer class="mt-16 border-t border-gray-200 py-8">
      <p class="font-mono text-[12px] text-gray-500">
        © {{ year }} {{ profile.fullName }}. All rights reserved.
      </p>
    </footer>
  </div>
</template>

<style scoped>
</style>
