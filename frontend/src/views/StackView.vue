<script setup lang="ts">
/**
 * Stack — grouped technology stack + core competencies.
 */
import { Wrench } from 'lucide-vue-next'

import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import SectionHeading from '@/components/ui/SectionHeading.vue'
import { competencies, stackGroups } from '@/data/profile'
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
    <PageHeader
      comment="$ ls ./stack/"
      title="stack"
      description="Technologies and tools I work with — from frontend frameworks to backend, mobile, and data."
    />

    <!-- ── Grouped stack ────────────────────────────────────── -->
    <div class="mt-10 grid gap-5 sm:grid-cols-2">
      <Reveal
        v-for="(group, i) in stackGroups"
        :key="group.label"
        :delay="i % 3"
        class="rounded-xl border border-gray-300 bg-white shadow-sm bg-white p-6"
      >
        <h2 class="flex items-center gap-2 font-mono text-[12.5px] uppercase tracking-wide text-gray-500">
          <Wrench class="h-3.5 w-3.5" :stroke-width="1.6" />
          {{ group.label }}
        </h2>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="tech in group.items"
            :key="tech"
            class="rounded-md border border-gray-200 bg-white px-2.5 py-1 font-mono text-[12px] text-gray-600"
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
        title="core competencies"
        blurb="Key areas of expertise"
      />

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <Reveal
          v-for="(competency, i) in competencies"
          :key="competency.title"
          :delay="i % 3"
          class="rounded-xl border border-gray-300 bg-white shadow-sm bg-white p-5"
        >
          <h3 class="text-[15px] font-semibold tracking-tight text-ink">{{ competency.title }}</h3>
          <p class="mt-2 text-[13.5px] leading-relaxed text-gray-500">{{ competency.description }}</p>
        </Reveal>
      </div>
    </section>
  </div>
</template>
