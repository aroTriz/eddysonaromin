<script setup lang="ts">
/**
 * Experience — work history + education timeline, static profile data.
 */
import { Building2, GraduationCap } from 'lucide-vue-next'

import Reveal from '@/components/ui/Reveal.vue'
import SectionHeading from '@/components/ui/SectionHeading.vue'
import { education, experiences } from '@/data/profile'

const tagStyles: Record<string, string> = {
  Professional: 'bg-gray-100 text-gray-700',
  Internship: 'bg-gray-50 text-gray-500',
  Graduated: 'bg-gray-100 text-gray-700',
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
    <Reveal>
      <p class="terminal-comment text-[13px]">$ cat ./resume.md</p>
      <h1 class="mt-2 text-[2.1rem] font-semibold leading-tight tracking-tightest md:text-[3rem]">
        [ Resume ]
      </h1>
      <p class="mt-1 font-mono text-[13px] text-gray-400">// Experience, education &amp; achievements</p>
    </Reveal>

    <!-- ── Work experience ──────────────────────────────────── -->
    <section aria-label="Work experience" class="mt-12">
      <SectionHeading comment="// work-experience" title="[ Work Experience ]" blurb="Where I've applied my craft" />

      <div class="mt-6 space-y-5">
        <Reveal
          v-for="(job, i) in experiences"
          :key="job.title"
          :delay="i % 3"
          class="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div class="flex flex-wrap items-center gap-3">
            <span class="font-mono text-[12px] text-gray-400">{{ job.period }}</span>
            <span
              class="rounded-full px-2.5 py-0.5 font-mono text-[11px]"
              :class="tagStyles[job.tag] ?? 'bg-gray-100 text-gray-700'"
            >
              {{ job.tag }}
            </span>
          </div>
          <h3 class="mt-3 flex items-start gap-2 text-[17px] font-semibold tracking-tight text-ink">
            <Building2 class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" :stroke-width="1.6" />
            {{ job.title }}
          </h3>
          <p class="mt-0.5 font-mono text-[13px] text-gray-500">@{{ job.company }}</p>
          <p class="mt-3 text-[14px] leading-relaxed text-gray-600">{{ job.description }}</p>
          <ul class="mt-4 space-y-2 border-t border-gray-100 pt-4">
            <li
              v-for="highlight in job.highlights"
              :key="highlight"
              class="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-gray-600"
            >
              <span class="mt-0.5 font-mono text-gray-400" aria-hidden="true">&gt;</span>
              {{ highlight }}
            </li>
          </ul>
        </Reveal>
      </div>
    </section>

    <!-- ── Education ────────────────────────────────────────── -->
    <section aria-label="Education" class="mt-14">
      <SectionHeading comment="// education" title="[ Education ]" blurb="Academic background" />

      <div class="mt-6 space-y-5">
        <Reveal
          v-for="(edu, i) in education"
          :key="edu.title"
          :delay="i % 3"
          class="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div class="flex flex-wrap items-center gap-3">
            <span class="font-mono text-[12px] text-gray-400">{{ edu.period }}</span>
            <span
              class="rounded-full px-2.5 py-0.5 font-mono text-[11px]"
              :class="tagStyles[edu.tag] ?? 'bg-gray-100 text-gray-700'"
            >
              {{ edu.tag }}
            </span>
          </div>
          <h3 class="mt-3 flex items-start gap-2 text-[17px] font-semibold tracking-tight text-ink">
            <GraduationCap class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" :stroke-width="1.6" />
            {{ edu.title }}
          </h3>
          <p class="mt-0.5 font-mono text-[13px] text-gray-500">@{{ edu.school }}</p>
          <p class="mt-3 text-[14px] leading-relaxed text-gray-600">{{ edu.detail }}</p>
        </Reveal>
      </div>
    </section>
  </div>
</template>
