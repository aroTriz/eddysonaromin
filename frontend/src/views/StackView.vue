<script setup lang="ts">
/**
 * Stack — grouped technology stack + core competencies.
 */
import { Wrench } from 'lucide-vue-next'

import Reveal from '@/components/ui/Reveal.vue'
import SectionHeading from '@/components/ui/SectionHeading.vue'
import { competencies, stackGroups } from '@/data/profile'
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
    <Reveal>
      <p class="terminal-comment text-[13px]">$ ls ./stack/</p>
      <h1 class="mt-2 text-[2.1rem] font-semibold leading-tight tracking-tightest md:text-[3rem]">
        [ Stack ]
      </h1>
      <p class="mt-1 font-mono text-[13px] text-gray-500">// Technologies and tools I work with</p>
    </Reveal>

    <!-- ── Grouped stack ────────────────────────────────────── -->
    <div class="mt-10 grid gap-5 sm:grid-cols-2">
      <Reveal
        v-for="(group, i) in stackGroups"
        :key="group.label"
        :delay="i % 3"
        class="rounded-xl border border-gray-200 bg-white p-6"
      >
        <h2 class="flex items-center gap-2 font-mono text-[12.5px] uppercase tracking-wide text-gray-500">
          <Wrench class="h-3.5 w-3.5" :stroke-width="1.6" />
          {{ group.label }}
        </h2>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="tech in group.items"
            :key="tech"
            class="rounded-full border border-gray-200 px-3 py-1 font-mono text-[12px] text-gray-600"
          >
            {{ tech }}
          </span>
        </div>
      </Reveal>
    </div>

    <!-- ── Core competencies ────────────────────────────────── -->
    <section aria-label="Core competencies" class="mt-14">
      <SectionHeading
        comment="// core-competencies"
        title="[ Core Competencies ]"
        blurb="Key areas of expertise"
      />

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <Reveal
          v-for="(competency, i) in competencies"
          :key="competency.title"
          :delay="i % 3"
          class="rounded-xl border border-gray-200 bg-white p-5"
        >
          <h3 class="text-[15px] font-semibold tracking-tight text-ink">{{ competency.title }}</h3>
          <p class="mt-2 text-[13.5px] leading-relaxed text-gray-500">{{ competency.description }}</p>
        </Reveal>
      </div>
    </section>
  </div>
</template>
