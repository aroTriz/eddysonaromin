<script setup lang="ts">
/**
 * About — bio (terminal style), info.json card, tech stack grid, interests.
 */
import { Download, Eye } from 'lucide-vue-next'
import { computed } from 'vue'

import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import SectionHeading from '@/components/ui/SectionHeading.vue'
import TechLogo from '@/components/ui/TechLogo.vue'
import {
  allTechnologies,
  interests,
  profile,
} from '@/data/profile'

/** Resume — served from /public/resume (view opens in a new tab). */
const RESUME_URL = '/resume/AROMIN-Resume.pdf'

/**
 * Pyramid arrangement — a single pill at the TOP, rows growing 2,3,4,… down
 * to the widest row at the BOTTOM. Each row is centered. Every tech appears
 * exactly once (sequential slicing — no repeats).
 */
const diamondRows = computed<string[][]>(() => {
  const items = [...allTechnologies]
  const rows: string[][] = []
  let cursor = 0
  let count = 1
  while (cursor < items.length) {
    rows.push(items.slice(cursor, cursor + count))
    cursor += count
    count++
  }
  return rows
})

const info = [
  { label: '// full_name', value: profile.fullName },
  { label: '// degree', value: profile.degree },
  { label: '// university', value: profile.university },
  { label: '// location', value: profile.location },
  { label: '// hometown', value: profile.hometown },
  { label: '// email', value: profile.email },
  { label: '// phone', value: profile.phone },
  { label: '// languages', value: profile.languages.join(', ') },
]
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
    <PageHeader
      comment="$ cd ./about"
      title="about"
      description="Get to know the developer behind the code."
    />

    <!-- ── Bio + info ───────────────────────────────────────── -->
    <div class="mt-10 grid gap-6 md:grid-cols-2">
      <Reveal :delay="1" class="rounded-xl border border-gray-300 bg-white shadow-sm bg-white p-6">
        <p class="terminal-comment mb-4 text-[12px]">bio.sh</p>
        <div class="space-y-4 text-[14.5px] leading-relaxed text-gray-600">
          <p v-for="(paragraph, i) in profile.bio" :key="i">{{ paragraph }}</p>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <a
            :href="RESUME_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-mono text-[13px] text-bg transition-opacity hover:opacity-80"
          >
            <Eye class="h-4 w-4" :stroke-width="1.8" />
            View Resume
          </a>
          <a
            :href="RESUME_URL"
            download="AROMIN-Resume.pdf"
            class="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 font-mono text-[13px] text-gray-600 transition-colors hover:border-gray-300 hover:text-ink"
          >
            <Download class="h-4 w-4" :stroke-width="1.8" />
            Download Resume
          </a>
        </div>
      </Reveal>

      <Reveal :delay="2" class="rounded-xl border border-gray-300 bg-white shadow-sm bg-white p-6">
        <p class="terminal-comment mb-4 text-[12px]">info.json</p>
        <dl class="space-y-3">
          <div
            v-for="item in info"
            :key="item.label"
            class="flex flex-col gap-0.5 border-b border-gray-100 pb-2.5 last:border-0"
          >
            <dt class="font-mono text-[11.5px] text-gray-500">{{ item.label }}</dt>
            <dd class="text-[13.5px] text-ink">{{ item.value }}</dd>
          </div>
        </dl>
      </Reveal>
    </div>

    <!-- ── Tech stack grid ──────────────────────────────────── -->
    <section aria-label="Tech stack" class="mt-16">
      <SectionHeading
        comment="// tech-stack"
        title="tech stack"
        blurb="Technologies I work with — always in motion"
      />
      <!-- Pyramid rows — each centered so the pills form a ▲ shape -->
      <Reveal :delay="1" class="mt-6 flex flex-col items-center gap-2.5">
        <div
          v-for="(row, ri) in diamondRows"
          :key="ri"
          class="flex flex-wrap items-center justify-center gap-2.5"
        >
          <span
            v-for="tech in row"
            :key="tech"
            class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3.5 py-1.5 font-mono text-[12.5px] text-gray-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-md dark:border-gray-300 dark:bg-gray-100 dark:text-gray-500 dark:hover:border-gray-500"
          >
            <TechLogo :name="tech" :size="15" />
            {{ tech }}
          </span>
        </div>
      </Reveal>
    </section>

    <!-- ── Interests ────────────────────────────────────────── -->
    <section aria-label="Interests" class="mt-16">
      <SectionHeading
        comment="// interests"
        title="beyond the code"
        blurb="Things I enjoy when I'm not programming"
      />
      <Reveal :delay="1" class="mt-6 flex flex-wrap gap-2.5">
        <span
          v-for="interest in interests"
          :key="interest"
          class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white shadow-sm px-3.5 py-1.5 font-mono text-[12.5px] text-gray-600"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-gray-300" aria-hidden="true" />
          {{ interest }}
        </span>
      </Reveal>
    </section>
  </div>
</template>
