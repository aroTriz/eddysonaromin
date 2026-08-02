<script setup lang="ts">
/**
 * Experience — bryllim-style timeline: company/school logo rail
 * (round logo avatar + vertical line) + company header + role cards
 * with period/description.
 */
import { education, experiences } from '@/data/profile'
</script>

<template>
  <div class="mx-auto w-full max-w-2xl px-6 py-14 sm:py-20">
    <!-- header -->
    <header class="mb-12">
      <p class="terminal-comment mb-3 text-[13px]">$ cat ./resume.md</p>
      <h1 class="font-pixel text-2xl leading-none">experience</h1>
    </header>

    <p class="reveal mb-14 mt-12 max-w-xl text-[15px] leading-relaxed text-gray-600">
      Hands-on experience across web and mobile development, QA, and AI research —
      from Agile teams at a solutions studio to a QA internship at a business application firm.
    </p>

    <!-- timeline -->
    <div class="space-y-0">
      <div
        v-for="(job, i) in experiences"
        :key="job.company"
        class="reveal relative flex gap-4 sm:gap-5"
      >
        <!-- logo rail -->
        <div class="flex flex-col items-center">
          <img
            v-if="job.logo"
            :src="job.logo"
            :alt="`${job.company} logo`"
            class="h-12 w-12 shrink-0 rounded-lg border border-gray-200 bg-white object-contain p-1.5"
          />
          <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white font-pixel text-[12px] text-ink">
            {{ job.company.charAt(0) }}
          </div>
          <div v-if="i < experiences.length - 1" class="mt-2 w-px flex-1 bg-gray-200"></div>
        </div>

        <!-- content -->
        <div class="flex-1 pb-12">
          <h2 class="text-[16px] font-semibold leading-snug text-ink">{{ job.company }}</h2>
          <p class="mt-1 font-mono text-[12px] text-gray-500">{{ job.tag }}</p>

          <div class="mt-5">
            <h3 class="text-[15px] font-medium text-ink">{{ job.title }}</h3>
            <p class="mt-1 font-mono text-[11px] uppercase tracking-wider text-gray-400">
              {{ job.period }}
            </p>

            <div class="mt-3 space-y-3 text-[14px] leading-relaxed text-gray-600">
              <p>{{ job.description }}</p>
            </div>

            <div v-if="job.highlights.length" class="mt-4 space-y-2">
              <p
                v-for="highlight in job.highlights"
                :key="highlight"
                class="flex items-start gap-2 text-[13.5px] leading-relaxed text-gray-600"
              >
                <span class="mt-0.5 font-mono text-gray-400" aria-hidden="true">&gt;</span>
                {{ highlight }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- education -->
    <div class="mt-10">
      <div
        v-for="edu in education"
        :key="edu.school"
        class="reveal relative flex gap-4 sm:gap-5"
      >
        <div class="flex flex-col items-center">
          <img
            v-if="edu.logo"
            :src="edu.logo"
            :alt="`${edu.school} logo`"
            class="h-12 w-12 shrink-0 rounded-lg border border-gray-200 bg-white object-contain p-1.5"
          />
          <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <span class="font-pixel text-[12px] text-ink">{{ edu.school.charAt(0) }}</span>
          </div>
        </div>

        <div class="flex-1">
          <h2 class="text-[16px] font-semibold leading-snug text-ink">{{ edu.school }}</h2>
          <p class="mt-1 font-mono text-[12px] text-gray-500">{{ edu.tag }}</p>

          <div class="mt-5">
            <h3 class="text-[15px] font-medium text-ink">{{ edu.title }}</h3>
            <p class="mt-1 font-mono text-[11px] uppercase tracking-wider text-gray-400">
              {{ edu.period }}
            </p>
            <div class="mt-3 space-y-3 text-[14px] leading-relaxed text-gray-600">
              <p>{{ edu.detail }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
