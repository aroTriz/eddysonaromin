<script setup lang="ts">
/**
 * Home — hero (terminal style), tech marquee, stats, recommendations.
 * Mirrors the bryllim.com feel: mono metadata, halftone, staggered reveal.
 */
import { ArrowUpRight, Mail, Star } from 'lucide-vue-next'

import ProfileVideo from '@/components/home/ProfileVideo.vue'
import SectionHeading from '@/components/ui/SectionHeading.vue'
import { allTechnologies, profile, recommendation, stats } from '@/data/profile'

const marqueeList = [...allTechnologies, ...allTechnologies]
const year = new Date().getFullYear()
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
    <!-- ── Hero ─────────────────────────────────────────────── -->
    <section aria-label="Intro" class="reveal grid items-center gap-10 md:grid-cols-[1fr_300px]">
      <div>
        <p class="terminal-comment text-[13px]">// Welcome to my portfolio</p>
        <h1 class="mt-3 text-[2.1rem] font-semibold leading-[1.1] tracking-tightest md:text-[3.4rem]">
          Eddyson Tristan
          <span class="text-gray-500">Aromin</span>
        </h1>
        <p class="mt-2 font-mono text-[13px] text-gray-500 md:text-[14px]">
          const role =
          <span class="text-ink">'{{ profile.role }}';</span>
        </p>

        <p class="mt-6 max-w-xl text-[15px] leading-relaxed text-gray-600 md:text-[16px]">
          {{ profile.tagline }}
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-4">
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

      <!-- Theme-triggered profile video (forward=light / reverse=dark) -->
      <div class="mx-auto h-[340px] w-[240px] sm:h-[380px] sm:w-[270px]">
        <ProfileVideo />
      </div>
    </section>

    <!-- ── Tech marquee ─────────────────────────────────────── -->
    <section aria-label="Tech stack" class="mt-14">
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

    <!-- ── Stats ────────────────────────────────────────────── -->
    <section aria-label="Highlights" class="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 sm:grid-cols-5">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="flex flex-col items-center gap-1 bg-white px-4 py-6 text-center"
      >
        <span class="text-[1.6rem] font-semibold tracking-tightest text-ink">{{ stat.value }}</span>
        <span class="font-mono text-[10.5px] uppercase tracking-wide text-gray-500">{{ stat.label }}</span>
      </div>
    </section>

    <!-- ── Recommendations ──────────────────────────────────── -->
    <section aria-label="Recommendations" class="mt-16">
      <SectionHeading comment="// recommendations" title="What People Say" />

      <div class="mt-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 md:p-8">
        <div class="flex items-center gap-1 text-gray-500" aria-label="5 out of 5 stars">
          <Star
            v-for="n in 5"
            :key="n"
            class="h-4 w-4 fill-current"
            :stroke-width="1.4"
          />
        </div>
        <blockquote class="rec-quote text-[17px] leading-relaxed text-gray-700 md:text-[19px]">
          {{ recommendation.quote }}
        </blockquote>
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 font-mono text-[14px] font-semibold text-gray-600">
            LF
          </div>
          <div>
            <p class="text-[14px] font-semibold text-ink">{{ recommendation.author }}</p>
            <p class="font-mono text-[12px] text-gray-500">{{ recommendation.role }}</p>
            <a
              :href="`mailto:${recommendation.email}`"
              class="font-mono text-[12px] text-gray-500 underline underline-offset-2 hover:text-ink"
            >
              {{ recommendation.email }}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Footer ───────────────────────────────────────────── -->
    <footer class="mt-16 border-t border-gray-200 pt-6">
      <p class="font-mono text-[12px] text-gray-500">
        © {{ year }} {{ profile.fullName }}. All rights reserved.
      </p>
    </footer>
  </div>
</template>
