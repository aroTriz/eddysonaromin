<script setup lang="ts">
/**
 * Home — mirrors bryllim.com's hero: profile video left, pixel-font
 * name + intro paragraphs + social links right; stats grid, tech
 * marquee, and serif recommendation card below.
 */
import { ArrowUpRight, GraduationCap, Mail } from 'lucide-vue-next'
import { ref } from 'vue'

import BlogSection from '@/components/home/BlogSection.vue'
import EmailModal from '@/components/home/EmailModal.vue'
import GitHubContributions from '@/components/home/GitHubContributions.vue'
import ProfileVideo from '@/components/home/ProfileVideo.vue'
import ProjectDeck from '@/components/home/ProjectDeck.vue'
import { useTypewriter } from '@/composables/useTypewriter'
import {
  allTechnologies,
  certifications,
  experiences,
  profile,
  recommendations,
  stats,
} from '@/data/profile'

const emailModalRef = ref<InstanceType<typeof EmailModal> | null>(null)

/** Typewriter roles shown under the profile video. */
const { displayed: displayedRole, caretOn } = useTypewriter([
  'Frontend Developer',
  'Full-Stack Developer',
  'AI Engineer',
  'Quality Assurance Analyst',
  'Information Technologist',
])

const marqueeList = [...allTechnologies, ...allTechnologies]
const year = new Date().getFullYear()

const intro = [
  "I'm a full-stack engineer. I build modern web & mobile apps, and these days I'm focused on generative AI.",
  "Right now I'm building cool new stuff every day. I love turning rough ideas into things people actually use.",
]

const socials = [
  { label: 'github', href: profile.github },
  { label: 'linkedin', href: profile.linkedin },
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

          <!-- typewriter role line below the video -->
          <div class="mt-4 flex items-center justify-center font-mono text-[12px] text-gray-500">
            <span class="whitespace-nowrap"
              >const role = '{{ displayedRole }}<span
                class="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] bg-gray-500"
                :style="{ opacity: caretOn ? 1 : 0 }"
              ></span
              >'</span
            >
          </div>
        </div>

        <!-- Text column (right) — centered content -->
        <div class="flex flex-col items-center text-center">
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
            class="reveal d4 mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-mono text-[12px] text-gray-500"
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
            <button
              type="button"
              class="hover:text-ink"
              aria-haspopup="dialog"
              @click="emailModalRef?.openModal()"
            >
              email <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
            </button>
          </div>

          <div class="reveal d5 mt-8 flex flex-wrap items-center justify-center gap-4">
            <RouterLink
              to="/projects"
              class="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-mono text-[13px] text-bg transition-opacity hover:opacity-80"
            >
              View My Work
              <ArrowUpRight class="h-4 w-4" :stroke-width="1.8" />
            </RouterLink>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 font-mono text-[13px] text-gray-600 hover:border-gray-300 hover:text-ink"
              aria-haspopup="dialog"
              @click="emailModalRef?.openModal()"
            >
              Get In Touch
              <Mail class="h-4 w-4" :stroke-width="1.8" />
            </button>
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
      <div class="overflow-hidden">
        <div class="mask-fade-x flex w-max animate-marquee gap-3">
          <span
            v-for="(tech, i) in marqueeList"
            :key="`${tech}-${i}`"
            class="rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 font-mono text-[13px] text-gray-700"
          >
            {{ tech }}
          </span>
        </div>
      </div>
    </section>

    <!-- ── Blog (bryllim-style list) ─────────────────────────── -->
    <section id="blog" aria-label="Blog" class="relative py-14">
      <div class="mb-8 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">01 — blog</h2>
        <RouterLink
          to="/blog"
          class="font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          all posts <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>

      <BlogSection />
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

    <!-- ── Experience (bryllim-style rows) ───────────────────── -->
    <section id="experience" aria-label="Experience" class="py-14">
      <div class="mb-6 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">03 — experience</h2>
        <RouterLink
          to="/experience"
          class="font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          full history <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>

      <div class="divide-y divide-gray-200 border-y border-gray-200">
        <div
          v-for="job in experiences"
          :key="job.title"
          class="group grid grid-cols-12 items-baseline gap-3 py-2.5 hover:bg-gray-50/80"
        >
          <div class="col-span-2 font-mono text-[11px] text-gray-400">{{ job.year }}</div>
          <div class="col-span-10 text-[14px] font-medium text-ink sm:col-span-6">{{ job.title }}</div>
          <div class="col-span-12 text-[13px] text-gray-500 sm:col-span-4 sm:text-right">
            {{ job.company }}
          </div>
        </div>
      </div>

      <!-- Stack panel (bryllim-exact: h3 + view all + mono pills) -->
      <div class="mt-10">
        <div class="flex items-baseline justify-between">
          <h3 class="text-[15px] font-semibold tracking-tight text-ink">Stack</h3>
          <RouterLink
            to="/stack"
            class="font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
          >
            view all <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
          </RouterLink>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="tech in allTechnologies.slice(0, 12)"
            :key="tech"
            class="rounded-md border border-gray-200 bg-white px-2.5 py-1 font-mono text-[12px] text-gray-600"
          >
            {{ tech }}
          </span>
          <RouterLink
            to="/stack"
            class="font-mono text-[12px] text-gray-500 hover:text-ink"
          >
            + more
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ── Certifications (bryllim-style grid) ───────────────── -->
    <section id="certifications" aria-label="Certifications" class="py-14">
      <div class="mb-8 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">04 — certifications</h2>
        <RouterLink
          to="/certifications"
          class="font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          all certifications <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <RouterLink
          v-for="cert in certifications"
          :key="cert.title"
          to="/certifications"
          class="group relative flex flex-col items-center rounded-xl bg-gradient-to-b from-gray-50 to-white px-4 py-5 text-center shadow-[0_8px_22px_-14px_rgba(10,10,10,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(10,10,10,0.4)]"
        >
          <span aria-hidden="true" class="pointer-events-none absolute inset-[5px] rounded-lg border border-gray-200/70"></span>
          <div class="relative flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white">
            <GraduationCap class="h-5 w-5 text-gray-500" :stroke-width="1.6" />
          </div>
          <h3 class="relative mt-3 text-[13px] font-semibold leading-snug text-ink">{{ cert.title }}</h3>
          <p class="relative mt-1 font-mono text-[9.5px] uppercase tracking-wider text-gray-400">{{ cert.issuer }}</p>
          <div class="relative mt-3 flex items-center gap-1.5 text-gray-300 group-hover:text-ink">
            <span class="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400 group-hover:text-ink">
              {{ cert.year }}
            </span>
          </div>
        </RouterLink>
      </div>
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

    <!-- ── GitHub (bryllim-style halftone graph) ──────────────── -->
    <section id="github" aria-label="GitHub" class="py-14">
      <div class="mb-6 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">06 — github</h2>
        <a
          :href="profile.github"
          target="_blank"
          rel="noopener noreferrer"
          class="font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          {{ profile.github.replace('https://', '') }} <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </a>
      </div>

      <a :href="profile.github" target="_blank" rel="noopener noreferrer" class="group block">
        <GitHubContributions />
      </a>
    </section>

    <!-- ── Footer ───────────────────────────────────────────── -->
    <footer class="mt-16 border-t border-gray-200 py-8">
      <p class="text-center font-mono text-[12px] text-gray-500">
        © {{ year }} {{ profile.fullName }}. All rights reserved.
      </p>
    </footer>
  </div>

  <!-- Email "say hello" modal (bryllim-style) -->
  <EmailModal ref="emailModalRef" />
</template>

<style scoped>
</style>
