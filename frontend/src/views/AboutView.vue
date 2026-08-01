<script setup lang="ts">
/**
 * About — bio (terminal style), info.json card, tech stack grid, interests.
 */
import SectionHeading from '@/components/ui/SectionHeading.vue'
import Reveal from '@/components/ui/Reveal.vue'
import {
  allTechnologies,
  interests,
  profile,
} from '@/data/profile'

const info = [
  { label: '// full_name', value: profile.fullName },
  { label: '// degree', value: profile.degree },
  { label: '// university', value: profile.university },
  { label: '// location', value: profile.location },
  { label: '// email', value: profile.email },
  { label: '// phone', value: profile.phone },
  { label: '// languages', value: profile.languages.join(', ') },
]
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
    <!-- ── Header ───────────────────────────────────────────── -->
    <Reveal>
      <p class="terminal-comment text-[13px]">$ cd ./about</p>
      <h1 class="mt-2 text-[2.1rem] font-semibold leading-tight tracking-tightest md:text-[3rem]">
        [ About Me ]
      </h1>
      <p class="mt-1 font-mono text-[13px] text-gray-400">// Get to know the developer behind the code</p>
    </Reveal>

    <!-- ── Bio + info ───────────────────────────────────────── -->
    <div class="mt-10 grid gap-6 md:grid-cols-2">
      <Reveal :delay="1" class="rounded-xl border border-gray-200 bg-white p-6">
        <p class="terminal-comment mb-4 text-[12px]">bio.sh</p>
        <div class="space-y-4 text-[14.5px] leading-relaxed text-gray-600">
          <p v-for="(paragraph, i) in profile.bio" :key="i">{{ paragraph }}</p>
        </div>
      </Reveal>

      <Reveal :delay="2" class="rounded-xl border border-gray-200 bg-white p-6">
        <p class="terminal-comment mb-4 text-[12px]">info.json</p>
        <dl class="space-y-3">
          <div
            v-for="item in info"
            :key="item.label"
            class="flex flex-col gap-0.5 border-b border-gray-100 pb-2.5 last:border-0"
          >
            <dt class="font-mono text-[11.5px] text-gray-400">{{ item.label }}</dt>
            <dd class="text-[13.5px] text-ink">{{ item.value }}</dd>
          </div>
        </dl>
      </Reveal>
    </div>

    <!-- ── Tech stack grid ──────────────────────────────────── -->
    <section aria-label="Tech stack" class="mt-16">
      <SectionHeading
        comment="// tech-stack"
        title="[ Tech Stack ]"
        blurb="Technologies I work with — always in motion"
      />
      <Reveal :delay="1" class="mt-6 flex flex-wrap gap-2.5">
        <span
          v-for="tech in allTechnologies"
          :key="tech"
          class="rounded-full border border-gray-200 px-3.5 py-1.5 font-mono text-[12.5px] text-gray-600"
        >
          {{ tech }}
        </span>
      </Reveal>
    </section>

    <!-- ── Interests ────────────────────────────────────────── -->
    <section aria-label="Interests" class="mt-16">
      <SectionHeading
        comment="// interests"
        title="[ Beyond the Code ]"
        blurb="Things I enjoy when I'm not programming"
      />
      <Reveal :delay="1" class="mt-6 flex flex-wrap gap-2.5">
        <span
          v-for="interest in interests"
          :key="interest"
          class="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3.5 py-1.5 font-mono text-[12.5px] text-gray-600"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-gray-300" aria-hidden="true" />
          {{ interest }}
        </span>
      </Reveal>
    </section>
  </div>
</template>
