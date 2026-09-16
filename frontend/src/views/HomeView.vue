<script setup lang="ts">
/**
 * Home — mirrors bryllim.com's hero: profile video left, pixel-font
 * name + intro paragraphs + social links right; stats grid, tech
 * marquee, and serif recommendation card below.
 */
import { ArrowUpRight, GraduationCap, Images, Phone, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import BlogSection from '@/components/home/BlogSection.vue'
import EmailModal from '@/components/home/EmailModal.vue'
import GitHubContributions from '@/components/home/GitHubContributions.vue'
import ProfileVideo from '@/components/home/ProfileVideo.vue'
import ProjectDeck from '@/components/home/ProjectDeck.vue'
import InfiniteSwiper from '@/components/ui/InfiniteSwiper.vue'
import TechLogo from '@/components/ui/TechLogo.vue'
import { useTypewriter } from '@/composables/useTypewriter'
import { fetchBlogPosts, fetchCertifications, fetchExperiences, fetchProjects, fetchRecommendations, fetchStackGroups } from '@/services/api'
import type { BlogPost, Certification, ExperienceEntry, Project, Recommendation } from '@/types'
import {
  allTechnologies,
  certifications,
  experiences,
  profile,
  recommendations as staticRecommendations,
  stats,
} from '@/data/profile'

const emailModalRef = ref<InstanceType<typeof EmailModal> | null>(null)

/**
 * Recommendations — fetched from the CMS (managed in /aromin admin).
 * Seeded with the static profile testimonials so the section renders
 * instantly (no skeleton); the API silently overrides the seed when
 * it responds.
 */
const fallbackRecs: Recommendation[] = staticRecommendations.map((rec, i) => ({
  id: i + 1,
  initials: rec.initials,
  quote: rec.quote,
  author: rec.author,
  role: rec.role,
  email: rec.email ?? null,
  phone: null,
  photo_url: null,
  letter_url: null,
  sort_order: i,
  archived_at: null,
  created_at: null,
  updated_at: null,
}))

const recs = ref<Recommendation[]>(fallbackRecs)
const letterModal = ref<string | null>(null)
function openLetter(url: string): void {
  letterModal.value = url
  document.documentElement.style.overflow = 'hidden'
}
function closeLetter(): void {
  letterModal.value = null
  document.documentElement.style.overflow = ''
}

/**
 * Tech marquee — driven by the CMS stack groups (/aromin admin).
 * Static profile data is only the instant fallback while loading / on error.
 *
 * The loop is animated by translateX(-50%); a JS-measured exact distance
 * (one copy's width in whole pixels) is used instead of a raw -50% so the
 * seam never lands on a fractional pixel — eliminating the sub-pixel jump.
 */
const marqueeList = ref<string[]>([...allTechnologies, ...allTechnologies])

function measureMarquee(): void {
  // Apply the exact seam distance to every marquee strip (forward + reverse).
  const strips = Array.from(document.querySelectorAll('.marquee-strip')) as HTMLElement[]
  for (const strip of strips) {
    const pills = Array.from(strip.children) as HTMLElement[]
    if (pills.length < 2) continue
    const half = Math.floor(pills.length / 2)
    const lastOfFirst = pills[half - 1]
    // End of copy 1: last pill's right edge + its trailing mr-3 (12px).
    const dist = lastOfFirst.offsetLeft + lastOfFirst.offsetWidth + 12
    strip.style.setProperty('--marquee-distance', `${dist}px`)
  }
}

onMounted(() => {
  measureMarquee()
  // Widths settle once fonts load — re-measure for an exact seam.
  if (document.fonts?.ready) {
    void document.fonts.ready.then(() => measureMarquee())
  }
  window.addEventListener('resize', measureMarquee)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measureMarquee)
})

/** Live counts for the stats row — "Projects Built" & "Technologies" come from
 * the CMS. Seeded with the static profile values so the stats show instantly
 * (no "0" flash while the API loads); the live counts override when ready. */
const projectsCount = ref(Number(stats.find((s) => s.label === 'Projects Built')?.value) || 0)
const techCount = ref(Number(stats.find((s) => s.label === 'Technologies')?.value) || 0)

/**
 * "Years of Experience" — derived from the graduation year.
 * 1 year → "1+", 2 years → "2+", and so on (never below 1+).
 */
const experienceYears = computed(() => {
  const years = new Date().getFullYear() - profile.graduationYear
  return `${Math.max(1, years)}+`
})

/** Stats row — CMS-derived / computed values override the static ones. */
const displayStats = computed(() =>
  stats.map((s) => {
    if (s.label === 'Projects Built') return { ...s, value: projectsCount.value.toLocaleString() }
    if (s.label === 'Technologies') return { ...s, value: techCount.value.toLocaleString() }
    if (s.label === 'Years of Experience') return { ...s, value: experienceYears.value }
    return s
  }),
)

/**
 * Home sections — dynamic hide + auto-renumber (hehe gets mo).
 * If a section has no laman (empty), it hides and the next one moves up
 * to become 01, 02, ... . When laman returns (e.g. blog gets posts again),
 * blog becomes 01 again. Applied to all home sections.
 *
 * Order is fixed; visibility decides numbering.
 */
type SectionKey = 'blog' | 'projects' | 'experience' | 'certifications' | 'recommendations' | 'github'
const SECTION_ORDER: SectionKey[] = ['blog', 'projects', 'experience', 'certifications', 'recommendations', 'github']

// CMS-driven lists that gate visibility. Loading = true so sections show
// their skeleton during fetch; only after fetch do we hide if truly empty.
const homeBlogPosts = ref<BlogPost[]>([])
const homePersonalProjects = ref<Project[]>([])
const homeBlogLoaded = ref(false)
const homeProjectsLoaded = ref(false)
// Experience / certifications are CMS-driven too — seeded with static so
// home renders instantly, then silently overridden by the API. If the CMS
// returns 0 rows, the section hides ("walang laman hide").
const homeExperiences = ref<(ExperienceEntry | typeof experiences[number])[]>([...experiences] as unknown as ExperienceEntry[])
const homeCertifications = ref<(Certification | typeof certifications[number])[]>([...certifications] as unknown as Certification[])
const homeExpLoaded = ref(false)
const homeCertsLoaded = ref(false)

const sectionVisibility = computed<Record<SectionKey, boolean>>(() => ({
  blog: !homeBlogLoaded.value ? true : homeBlogPosts.value.length > 0,
  projects: !homeProjectsLoaded.value ? true : homePersonalProjects.value.length > 0,
  experience: !homeExpLoaded.value ? true : homeExperiences.value.length > 0,
  certifications: !homeCertsLoaded.value ? true : homeCertifications.value.length > 0,
  recommendations: recs.value.length > 0,
  github: !!profile.github,
}))

const sectionNumbers = computed<Record<SectionKey, string>>(() => {
  const map = {} as Record<SectionKey, string>
  let n = 0
  for (const key of SECTION_ORDER) {
    if (sectionVisibility.value[key]) {
      n += 1
      map[key] = String(n).padStart(2, '0')
    } else {
      map[key] = ''
    }
  }
  return map
})

onMounted(async () => {
  try {
    const [projectList, groups] = await Promise.all([
      fetchProjects(),
      fetchStackGroups(),
    ])
    projectsCount.value = projectList.length
    const flat = groups.flatMap((g) => g.items).filter(Boolean)
    techCount.value = new Set(flat).size
    if (flat.length > 0) {
      marqueeList.value = [...flat, ...flat]
      // The strip's width changed — re-measure so the loop seam stays exact.
      await nextTick()
      measureMarquee()
    }
  } catch {
    // Keep the static fallbacks when the API is unavailable.
  }

  // Home section visibility: fetch blog + personal projects + experience + certs.
  // These drive whether the section hides and how numbering shifts.
  try {
    const [blogData, personal, expData, certData] = await Promise.all([
      fetchBlogPosts().catch(() => [] as BlogPost[]),
      fetchProjects({ category: 'personal' }).catch(() => [] as Project[]),
      fetchExperiences().catch(() => null as unknown as ExperienceEntry[]),
      fetchCertifications().catch(() => null as unknown as Certification[]),
    ])
    homeBlogPosts.value = (blogData ?? []).slice(0, 3)
    homePersonalProjects.value = personal ?? []
    if (expData !== null) {
      homeExperiences.value = expData as unknown as typeof homeExperiences.value
    }
    if (certData !== null) {
      homeCertifications.value = certData as unknown as typeof homeCertifications.value
    }
  } catch {
    // keep seeded fallbacks for exp/certs, but blog/projects go empty -> hide
    homeBlogPosts.value = []
    homePersonalProjects.value = []
  } finally {
    homeBlogLoaded.value = true
    homeProjectsLoaded.value = true
    homeExpLoaded.value = true
    homeCertsLoaded.value = true
  }

  // Recommendations — API is source of truth for hide/show.
  // If CMS returns [] (archived all), hide the section; only on fetch
  // failure do we keep the static seed so the site never blanks by accident.
  try {
    const data = await fetchRecommendations()
    recs.value = data ?? []
  } catch {
    // Keep the static seed — a failed fetch must never blank the section.
  }
})

/** Live refresh for hide/show — when CMS edits happen in /aromin (same tab
 * via focus/visibility or other tab via storage), re-fetch all gated lists
 * so sections hide/show and renumber without a hard refresh. */
async function refreshHomeSections(): Promise<void> {
  try {
    const [blogData, personal, expData, certData, recData] = await Promise.all([
      fetchBlogPosts().catch(() => [] as BlogPost[]),
      fetchProjects({ category: 'personal' }).catch(() => [] as Project[]),
      fetchExperiences().catch(() => null as unknown as ExperienceEntry[]),
      fetchCertifications().catch(() => null as unknown as Certification[]),
      fetchRecommendations().catch(() => null as unknown as Recommendation[]),
    ])
    homeBlogPosts.value = (blogData ?? []).slice(0, 3)
    homePersonalProjects.value = personal ?? []
    if (expData !== null) homeExperiences.value = expData as unknown as typeof homeExperiences.value
    if (certData !== null) homeCertifications.value = certData as unknown as typeof homeCertifications.value
    if (recData !== null) recs.value = recData as Recommendation[]
  } catch {
    // ignore — keep current visibility
  } finally {
    homeBlogLoaded.value = true
    homeProjectsLoaded.value = true
    homeExpLoaded.value = true
    homeCertsLoaded.value = true
  }
}

onMounted(() => {
  const onStorage = (e: StorageEvent): void => {
    if (!e.key) return
    if (e.key === '__api_cache_bust' || e.key.startsWith('__api_cache_bust:')) void refreshHomeSections()
  }
  const onFocus = (): void => void refreshHomeSections()
  const onVis = (): void => {
    if (!document.hidden) void refreshHomeSections()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVis)
  onBeforeUnmount(() => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVis)
  })
})

/** Typewriter roles shown under the profile video. */
const { displayed: displayedRole, caretOn } = useTypewriter([
  'Frontend Developer',
  'Full-Stack Developer',
  'AI Engineer',
  'Quality Assurance Analyst',
  'Information Technologist',
])

const year = new Date().getFullYear()

const intro = [
  "I'm a full-stack engineer. I build modern web & mobile apps, and these days I'm focused on generative AI.",
  "Right now I'm building cool new stuff every day. I love turning rough ideas into things people actually use.",
]

const socials = [
  { label: 'github', href: profile.github },
  { label: 'linkedin', href: profile.linkedin },
  { label: 'instagram', href: profile.instagram },
]
</script>

<template>
  <div class="mx-auto w-full max-w-2xl px-4 sm:px-6">
    <!-- -- Hero — tightened after CTA removal, aligned to bryllim.com rhythm -- -->
    <section class="relative pt-16 sm:pt-24 pb-10 sm:pb-14">
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

          <!-- availability status line below the role -->
          <div class="mt-1.5 flex items-center justify-center gap-1.5 font-mono text-[12px] text-gray-500">
            <span>const available = '</span>
            <span class="pulse-dot h-1.5 w-1.5 rounded-full bg-[#28c840]" aria-hidden="true"></span>
            <span class="text-ink">For Hire</span>
            <span>'</span>
          </div>
        </div>

        <!-- Text column (right) — centered content -->
        <div class="flex min-w-0 w-full max-w-full flex-col items-center overflow-hidden text-center">
          <h1 class="reveal d2 w-full max-w-full break-words font-pixel text-[1.5rem] leading-none sm:text-[2.4rem]">
            {{ profile.name }}
          </h1>

          <p
            v-for="(paragraph, i) in intro"
            :key="i"
            class="reveal d3 mt-6 w-full max-w-full break-words text-[15px] leading-relaxed text-gray-600"
            :class="{ 'mt-5': i > 0 }"
          >
            {{ paragraph }}
          </p>

          <!-- links below the intro — one line at 320, no wrap -->
          <div
            class="reveal d4 mt-6 flex flex-nowrap items-center justify-center gap-x-1 overflow-hidden font-mono text-[11px] text-gray-500 sm:gap-x-2 sm:text-[12px]"
          >
            <a
              v-for="social in socials"
              :key="social.label"
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
              class="-my-1.5 inline-flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap px-1 py-1.5 hover:text-ink sm:px-1.5"
            >
              {{ social.label }}<ArrowUpRight class="inline h-3 w-3 shrink-0" :stroke-width="2" />
            </a>
            <button
              type="button"
              class="-my-1.5 inline-flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap px-1 py-1.5 hover:text-ink sm:px-1.5"
              aria-haspopup="dialog"
              @click="emailModalRef?.openModal()"
            >
              email <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
            </button>
          </div>


        </div>
      </div>
    </section>

    <!-- -- Stats (bryllim-style) — 5 cols ONE LINE on all widths (mobile too) --
         Desktop: px-4 py-6 text-lg / text[11px]; Mobile: px-1 py-4 text[11px] / text[7px]
         shrunk to fit 320px without wrapping to 2 rows — exactly as requested.
         Desktop structure/position untouched (sm: keeps original). -->
    <section
      aria-label="Highlights"
      class="grid grid-cols-5 divide-x divide-gray-200 border-t border-gray-200"
    >
      <div
        v-for="stat in displayStats"
        :key="stat.label"
        class="flex flex-col items-center px-1 py-4 text-center sm:px-4 sm:py-6"
      >
        <div class="font-pixel text-[11px] leading-none text-ink sm:text-lg">{{ stat.value }}</div>
        <div
          class="mt-1.5 break-words font-mono text-[7px] uppercase leading-tight tracking-wider text-gray-500 sm:mt-2 sm:text-[11px]"
        >
          {{ stat.label }}
        </div>
      </div>
    </section>

    <!-- -- Tech marquee --------------------------------------- -->
    <section aria-label="Tech stack" class="mt-16">
      <div class="mb-4 flex items-baseline justify-between">
        <p class="terminal-comment text-[13px]">// tech stack</p>
        <RouterLink
          to="/stack"
          class="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 py-2 font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          all stack <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>
      <div class="marquee-clip overflow-hidden min-h-[44px] py-2">
        <div class="marquee-strip flex w-max animate-marquee">
          <span
            v-for="(tech, i) in marqueeList"
            :key="`${tech}-${i}`"
            class="mr-3 inline-flex items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-4 min-h-[44px] py-2 font-mono text-[13px] text-gray-700 shadow-sm dark:border-gray-300 dark:bg-gray-100 dark:text-gray-500"
          >
            <TechLogo :name="tech" :size="15" />
            {{ tech }}
          </span>
        </div>
      </div>
      <div class="marquee-clip overflow-hidden min-h-[44px] py-2">
        <div class="marquee-strip marquee-reverse flex w-max">
          <span
            v-for="(tech, i) in marqueeList"
            :key="`rev-${tech}-${i}`"
            class="mr-3 inline-flex items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-4 min-h-[44px] py-2 font-mono text-[13px] text-gray-700 shadow-sm dark:border-gray-300 dark:bg-gray-100 dark:text-gray-500"
          >
            <TechLogo :name="tech" :size="15" />
            {{ tech }}
          </span>
        </div>
      </div>
    </section>

    <!-- -- Blog (bryllim-style list) — auto-hides when empty, auto-renumbers -- -->
    <section v-if="sectionVisibility.blog" id="blog" aria-label="Blog" class="relative py-14">
      <div class="mb-8 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">{{ sectionNumbers.blog }} — blog</h2>
        <RouterLink
          to="/blog"
          class="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 py-2 font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          all posts <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>

      <BlogSection :posts="homeBlogPosts" />
    </section>

    <!-- -- Projects spotlight deck (bryllim-style, personal only) — auto-hides when empty -- -->
    <section v-if="sectionVisibility.projects" id="projects" aria-label="Projects" class="py-8 sm:py-14">
      <div class="mb-8 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">{{ sectionNumbers.projects }} — projects</h2>
        <RouterLink
          to="/projects"
          class="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 py-2 font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          all projects <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>

      <ProjectDeck :projects="homePersonalProjects" />
    </section>

    <!-- -- Experience (bryllim-style rows) — auto-hides when empty -- -->
    <section v-if="sectionVisibility.experience" id="experience" aria-label="Experience" class="py-8 sm:py-14">
      <div class="mb-6 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">{{ sectionNumbers.experience }} — experience</h2>
        <RouterLink
          to="/experience"
          class="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 py-2 font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          full history <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>

      <div class="divide-y divide-gray-200 border-y border-gray-200">
        <div
          v-for="job in homeExperiences"
          :key="job.title"
          class="group grid grid-cols-12 items-baseline gap-2 sm:gap-3 py-2.5 hover:bg-gray-50/80"
        >
          <div class="col-span-4 whitespace-nowrap font-mono text-[11px] text-gray-400 sm:col-span-2">{{ job.year }}</div>
          <div class="col-span-8 text-[14px] font-medium leading-tight text-ink sm:col-span-6">{{ job.title }}</div>
          <div class="col-span-12 text-[13px] text-gray-500 sm:col-span-4 sm:text-right">
            {{ job.company }}
          </div>
        </div>
      </div>
    </section>

    <!-- -- Certifications — infinite swiper (single line, never wraps) — auto-hides when empty -- -->
    <section v-if="sectionVisibility.certifications" id="certifications" aria-label="Certifications" class="py-8 sm:py-14">
      <div class="mb-8 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">{{ sectionNumbers.certifications }} — certifications</h2>
        <RouterLink
          to="/certifications"
          class="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 py-2 font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          all certifications <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>

      <InfiniteSwiper :items="(homeCertifications as unknown[])" :gap="16">
        <template #default="{ item }">
          <RouterLink
            :to="`/certifications/${(item as typeof certifications[number]).slug}`"
            class="group relative flex h-full min-h-[156px] w-full flex-col items-center rounded-md bg-gradient-to-b from-gray-50 to-white px-4 py-5 text-center shadow-[0_8px_22px_-14px_rgba(10,10,10,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(10,10,10,0.4)]"
          >
            <span aria-hidden="true" class="pointer-events-none absolute inset-[5px] rounded-md border border-gray-200/70"></span>
            <div class="relative flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white">
              <GraduationCap class="h-5 w-5 text-gray-500" :stroke-width="1.6" />
            </div>
            <h3 class="relative mt-3 w-full truncate text-[13px] font-semibold leading-snug text-ink text-center" :title="(item as typeof certifications[number]).title">{{ (item as typeof certifications[number]).title }}</h3>
            <p class="relative mt-1 w-full truncate font-mono text-[9.5px] uppercase tracking-wider text-gray-400 text-center" :title="(item as typeof certifications[number]).issuer">{{ (item as typeof certifications[number]).issuer }}</p>
            <div class="relative mt-3 flex items-center gap-1.5 text-gray-300 group-hover:text-ink">
              <span class="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-400 group-hover:text-ink">
                {{ (item as typeof certifications[number]).year }}
              </span>
            </div>
          </RouterLink>
        </template>
      </InfiniteSwiper>
    </section>

    <!-- -- Recommendations — infinite swiper (single line, never wraps) — auto-hides when empty -- -->
    <section v-if="sectionVisibility.recommendations" id="recommendations" aria-label="Recommendations" class="py-8 sm:py-14">
      <div class="mb-8 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-400">{{ sectionNumbers.recommendations }} — recommendations</h2>
        <RouterLink
          to="/recommendations"
          class="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 py-2 font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-ink"
        >
          all recommendations <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </RouterLink>
      </div>

      <InfiniteSwiper v-if="recs.length > 0" :items="(recs as unknown[])" :gap="16">
        <template #default="{ item }">
          <RouterLink
            to="/recommendations"
            class="group flex w-full flex-col rounded-md bg-gradient-to-b from-gray-50 to-white p-5 shadow-[0_8px_22px_-16px_rgba(10,10,10,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(10,10,10,0.35)]"
          >
            <svg class="h-5 w-5 text-gray-200" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 7H6a3 3 0 00-3 3v1a3 3 0 003 3h1v1a2 2 0 01-2 2H4v2h1a4 4 0 004-4V7zm11 0h-3a3 3 0 00-3 3v1a3 3 0 003 3h1v1a2 2 0 01-2 2h-1v2h1a4 4 0 004-4V7z" />
            </svg>

            <p class="rec-quote mt-2 line-clamp-5 min-h-[6.8rem] text-[13.5px] leading-relaxed text-gray-700">
              {{ (item as Recommendation).quote }}
            </p>

            <div class="mt-4 flex items-center gap-2.5 border-t border-gray-100 pt-3">
              <div v-if="(item as Recommendation).photo_url" class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
                <img :src="(item as Recommendation).photo_url!" :alt="(item as Recommendation).author" class="h-full w-full object-cover" loading="lazy" />
              </div>
              <div v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 font-mono text-[10px] font-medium text-gray-600">
                {{ (item as Recommendation).initials }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[12px] font-semibold text-ink">{{ (item as Recommendation).author }}</div>
                <div class="truncate font-mono text-[9px] uppercase tracking-wider text-gray-400">
                  {{ (item as Recommendation).role }}
                </div>
                <a v-if="(item as Recommendation).phone" :href="`tel:${(item as Recommendation).phone}`" class="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-gray-500 hover:text-ink">
                  <Phone class="h-3 w-3" :stroke-width="1.6" />
                  {{ (item as Recommendation).phone }}
                </a>
              </div>
              <button v-if="(item as Recommendation).letter_url" type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-ink" aria-label="View recommendation letter" @click.stop.prevent="openLetter((item as Recommendation).letter_url!)">
                <Images class="h-3.5 w-3.5" :stroke-width="1.6" />
              </button>
            </div>
          </RouterLink>
        </template>
      </InfiniteSwiper>
    </section>

    <!-- -- GitHub (bryllim-style halftone graph) — auto-renumbers when sections above hide -- -->
    <section v-if="sectionVisibility.github" id="github" aria-label="GitHub" class="py-8 sm:py-14">
      <div class="mb-6 flex items-baseline justify-between">
        <h2 class="font-pixel text-sm text-gray-500 dark:text-gray-400">{{ sectionNumbers.github }} — github</h2>
        <a
          :href="profile.github"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 py-2 font-mono text-[11px] uppercase tracking-wider text-gray-600 transition-colors hover:text-ink dark:text-gray-400 dark:hover:text-gray-950"
        >
          {{ profile.github.replace('https://', '') }} <ArrowUpRight class="inline h-3 w-3" :stroke-width="2" />
        </a>
      </div>

      <a :href="profile.github" target="_blank" rel="noopener noreferrer" class="group block">
        <GitHubContributions />
      </a>
    </section>

    <!-- -- Footer --------------------------------------------- -->
    <footer class="mt-16 border-t border-gray-200 py-8">
      <p class="text-center font-mono text-[12px] text-gray-500">
        © {{ year }} {{ profile.fullName }}. All rights reserved.
      </p>
    </footer>
  </div>

  <!-- Letter modal -->
  <Teleport to="body">
    <div v-if="letterModal" class="fixed inset-0 z-[100] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Recommendation letter" @click.self="closeLetter">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeLetter"></div>
      <div class="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <p class="font-mono text-[12px] text-gray-500">// recommendation letter</p>
          <button type="button" class="rounded p-1 text-gray-400 hover:text-ink" @click="closeLetter"><X class="h-4 w-4" :stroke-width="1.7" /></button>
        </div>
        <div class="flex-1 overflow-auto bg-gray-50 p-4 flex items-center justify-center">
          <img :src="letterModal" alt="Recommendation letter" class="max-h-[70vh] w-auto max-w-full object-contain rounded-md border border-gray-200 bg-white" />
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Email "say hello" modal (bryllim-style) -->
  <EmailModal ref="emailModalRef" />
</template>

<style scoped>
/* Promote the marquee strip to its own GPU layer for smooth scrolling.
   The animation itself is the global `animate-marquee` utility; the seam
   distance (--marquee-distance) is measured in JS for an exact pixel loop. */
.marquee-strip {
  will-change: transform;
  transform: translateZ(0);
  contain: layout paint style;
  animation-duration: 90s;
}

/* Second row scrolls in the opposite direction (right → left). */
.marquee-strip.marquee-reverse {
  animation: marquee-reverse 90s linear infinite;
}

/* Let the pill shadows show (vertical padding) and fade pills in/out
   gracefully at the visible edges (greyfolio-style) so the pill shapes
   read as complete instead of hard-cut. */
.marquee-clip {
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    #000 28px,
    #000 calc(100% - 28px),
    transparent
  );
  mask-image: linear-gradient(
    to right,
    transparent,
    #000 28px,
    #000 calc(100% - 28px),
    transparent
  );
}
</style>

