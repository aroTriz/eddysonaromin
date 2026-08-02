<script setup lang="ts">
/**
 * Certifications — education credentials, affiliations and references.
 */
import { Award, BadgeCheck, UserRound } from 'lucide-vue-next'

import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import SectionHeading from '@/components/ui/SectionHeading.vue'
import { affiliations, certifications, references } from '@/data/profile'
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
    <PageHeader
      comment="$ cat ./certifications.md"
      title="certifications"
      description="Credentials, affiliations & references."
    />

    <!-- ── Certifications ───────────────────────────────────── -->
    <section aria-label="Certifications" class="mt-10">
      <SectionHeading comment="// certifications" title="[ Credentials ]" blurb="Academic and professional certificates" />

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <Reveal
          v-for="(cert, i) in certifications"
          :key="cert.title"
          :delay="i % 3"
          class="rounded-xl border border-gray-200 bg-white p-5"
        >
          <div class="flex items-start gap-3">
            <Award class="mt-0.5 h-5 w-5 shrink-0 text-gray-500" :stroke-width="1.6" />
            <div>
              <h3 class="text-[15px] font-semibold leading-snug tracking-tight text-ink">
                {{ cert.title }}
              </h3>
              <p class="mt-1 font-mono text-[12.5px] text-gray-500">{{ cert.issuer }}</p>
              <p class="mt-0.5 font-mono text-[12px] text-gray-500">{{ cert.year }}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>

    <!-- ── Affiliations ─────────────────────────────────────── -->
    <section aria-label="Affiliations" class="mt-14">
      <SectionHeading comment="// affiliations" title="[ Affiliations ]" blurb="Communities and organizations" />

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <Reveal
          v-for="(affiliation, i) in affiliations"
          :key="affiliation.org"
          :delay="i % 3"
          class="rounded-xl border border-gray-200 bg-white p-5"
        >
          <div class="flex items-start gap-3">
            <BadgeCheck class="mt-0.5 h-5 w-5 shrink-0 text-gray-500" :stroke-width="1.6" />
            <div>
              <h3 class="text-[15px] font-semibold tracking-tight text-ink">{{ affiliation.org }}</h3>
              <p class="mt-0.5 font-mono text-[12.5px] text-gray-500">{{ affiliation.role }}</p>
              <p class="mt-2 text-[13.5px] leading-relaxed text-gray-500">{{ affiliation.detail }}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>

    <!-- ── References ───────────────────────────────────────── -->
    <section aria-label="References" class="mt-14">
      <SectionHeading comment="// references" title="[ References ]" blurb="People I've worked with" />

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <Reveal
          v-for="(reference, i) in references"
          :key="reference.name"
          :delay="i % 3"
          class="rounded-xl border border-gray-200 bg-white p-5"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-[13px] font-semibold text-gray-600"
            >
              {{ reference.initials }}
            </div>
            <div>
              <h3 class="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-ink">
                <UserRound class="h-3.5 w-3.5 text-gray-500" :stroke-width="1.6" />
                {{ reference.name }}
              </h3>
              <p class="mt-0.5 text-[12.5px] text-gray-500">{{ reference.title }}</p>
              <a
                v-if="reference.email"
                :href="`mailto:${reference.email}`"
                class="mt-1 inline-block font-mono text-[12px] text-gray-500 underline underline-offset-2 hover:text-ink"
              >
                {{ reference.email }}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  </div>
</template>
