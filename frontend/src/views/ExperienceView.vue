<script setup lang="ts">
/**
 * Experience — timeline with clickable company/school logos (open site in a
 * new tab), a floating hover tooltip to the left of each logo (logo on top +
 * short description), and album / certificate buttons that open a centered
 * modal with a swiper of photos or certificates.
 *
 * Data is fetched from the CMS API (D1 database) instead of static profile.ts.
 */
import { ArrowLeft, ArrowRight, Award, Images, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import { fetchExperiences } from '@/services/api'
import type { ExperienceEntry } from '@/types'

const experiences = ref<ExperienceEntry[]>([])
const education = ref<ExperienceEntry[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const all = await fetchExperiences()
    experiences.value = all.filter((e) => e.type === 'experience')
    education.value = all.filter((e) => e.type === 'education')
  } catch {
    // Silently fail — the page just shows empty state
  } finally {
    loading.value = false
  }
})

const hovered = ref<string | null>(null)

interface ModalState {
  title: string
  items: string[]
  index: number
  /** Institution / company logo — shown in the modal header (same as the rail). */
  logo?: string | null
}

const modal = ref<ModalState | null>(null)

function show(name: string): void {
  hovered.value = name
}
function hide(): void {
  hovered.value = null
}

function openModal(title: string, items: string[] | undefined, logo?: string | null): void {
  modal.value = { title, items: items ?? [], index: 0, logo: logo ?? null }
  document.documentElement.style.overflow = 'hidden'
}

function closeModal(): void {
  modal.value = null
  document.documentElement.style.overflow = ''
}

const currentImage = computed(() => {
  if (!modal.value) return ''
  return modal.value.items[modal.value.index]
})

function prevImage(): void {
  if (!modal.value) return
  modal.value.index =
    (modal.value.index - 1 + modal.value.items.length) % modal.value.items.length
}

function nextImage(): void {
  if (!modal.value) return
  modal.value.index = (modal.value.index + 1) % modal.value.items.length
}

function onKeydown(e: KeyboardEvent): void {
  if (!modal.value) return
  if (e.key === 'Escape') closeModal()
  if (e.key === 'ArrowLeft') prevImage()
  if (e.key === 'ArrowRight') nextImage()
}
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
        :key="job.id"
        class="reveal relative flex gap-4 sm:gap-5"
      >
        <!-- logo rail -->
        <div class="flex flex-col items-center">
          <div class="relative">
            <!-- clickable logo → company site -->
            <a
              v-if="job.logo_url"
              :href="job.website_url ?? '#'"
              target="_blank"
              rel="noopener noreferrer"
              class="block h-12 w-12 rounded-lg border border-gray-200 bg-[#ffffff] p-1.5 transition-transform hover:scale-105"
              :aria-label="`Open ${job.company} website`"
              @mouseenter="show(String(job.id))"
              @mouseleave="hide"
            >
              <img
                :src="job.logo_url"
                :alt="`${job.company} logo`"
                class="h-full w-full object-contain"
              />
            </a>
            <div
              v-else
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white font-pixel text-[12px] text-ink"
            >
              {{ job.company.charAt(0) }}
            </div>

            <!-- floating tooltip (left of logo) -->
            <Transition name="float">
              <div
                v-if="hovered === String(job.id) && job.tooltip_desc"
                class="absolute right-full top-0 z-30 mr-4 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]"
                @mouseenter="show(String(job.id))"
                @mouseleave="hide"
              >
                <!-- company logo -->
                <div
                  class="flex aspect-[16/10] w-full items-center justify-center bg-[#ffffff] p-5"
                >
                  <img
                    v-if="job.logo_url"
                    :src="job.logo_url"
                    :alt="`${job.company} logo`"
                    class="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                  <div v-else class="flex flex-col items-center gap-1.5 text-gray-300">
                    <Images class="h-7 w-7" :stroke-width="1.4" />
                    <span class="font-mono text-[10px] text-gray-400">no logo</span>
                  </div>
                </div>
                <div class="p-3.5">
                  <p class="text-[13px] font-semibold leading-snug text-ink">
                    {{ job.company }}
                  </p>
                  <p class="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-gray-600">
                    {{ job.tooltip_desc }}
                  </p>
                </div>
              </div>
            </Transition>
          </div>
          <div v-if="i < experiences.length - 1" class="mt-2 w-px flex-1 bg-gray-200"></div>
        </div>

        <!-- content -->
        <div class="flex-1 pb-12">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-[16px] font-semibold leading-snug text-ink">{{ job.company }}</h2>
            <!-- album + certificate buttons -->
            <div class="flex shrink-0 items-center gap-1.5">
              <button
                v-if="job.albums.length > 0"
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-ink sm:h-11 sm:w-11"
                :title="`${job.company} photos`"
                :aria-label="`Open ${job.company} album`"
                @click="openModal(`${job.company} — photos`, job.albums, job.logo_url)"
              >
                <Images class="h-3.5 w-3.5" :stroke-width="1.7" />
              </button>
              <button
                v-if="job.certificates.length > 0"
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-ink sm:h-11 sm:w-11"
                :title="`${job.company} certificates`"
                :aria-label="`Open ${job.company} certificates`"
                @click="openModal(`${job.company} — certificates`, job.certificates, job.logo_url)"
              >
                <Award class="h-3.5 w-3.5" :stroke-width="1.7" />
              </button>
            </div>
          </div>
          <p class="mt-1 font-mono text-[12px] text-gray-500">{{ job.tag }}</p>

          <div class="mt-5">
            <h3 class="text-[15px] font-medium text-ink">{{ job.title }}</h3>
            <p class="mt-1 font-mono text-[11px] uppercase tracking-wider text-gray-400">
              {{ job.period }}
            </p>

            <div class="mt-3 space-y-3 text-[14px] leading-relaxed text-gray-600">
              <p>{{ job.description }}</p>
            </div>

            <div v-if="job.highlights?.length" class="mt-4 space-y-2">
              <p
                v-for="(highlight, hi) in job.highlights"
                :key="hi"
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
        :key="edu.id"
        class="reveal relative flex gap-4 sm:gap-5"
      >
        <div class="flex flex-col items-center">
          <div class="relative">
            <!-- clickable logo → school site -->
            <a
              v-if="edu.logo_url"
              :href="edu.website_url ?? '#'"
              target="_blank"
              rel="noopener noreferrer"
              class="block h-12 w-12 rounded-lg border border-gray-200 bg-[#ffffff] p-1.5 transition-transform hover:scale-105"
              :aria-label="`Open ${edu.company} website`"
              @mouseenter="show(String(edu.id))"
              @mouseleave="hide"
            >
              <img
                :src="edu.logo_url"
                :alt="`${edu.company} logo`"
                class="h-full w-full object-contain"
              />
            </a>
            <div
              v-else
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white"
            >
              <span class="font-pixel text-[12px] text-ink">{{ edu.company.charAt(0) }}</span>
            </div>

            <!-- floating tooltip (left of logo) -->
            <Transition name="float">
              <div
                v-if="hovered === String(edu.id) && edu.tooltip_desc"
                class="absolute right-full top-0 z-30 mr-4 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]"
                @mouseenter="show(String(edu.id))"
                @mouseleave="hide"
              >
                <!-- school logo -->
                <div
                  class="flex aspect-[16/10] w-full items-center justify-center bg-[#ffffff] p-5"
                >
                  <img
                    v-if="edu.logo_url"
                    :src="edu.logo_url"
                    :alt="`${edu.company} logo`"
                    class="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                  <div v-else class="flex flex-col items-center gap-1.5 text-gray-300">
                    <Images class="h-7 w-7" :stroke-width="1.4" />
                    <span class="font-mono text-[10px] text-gray-400">no logo</span>
                  </div>
                </div>
                <div class="p-3.5">
                  <p class="text-[13px] font-semibold leading-snug text-ink">
                    {{ edu.company }}
                  </p>
                  <p class="mt-1.5 text-[12px] leading-relaxed text-gray-600">
                    {{ edu.tooltip_desc }}
                  </p>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex-1">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-[16px] font-semibold leading-snug text-ink">{{ edu.company }}</h2>
            <!-- album + certificate buttons -->
            <div class="flex shrink-0 items-center gap-1.5">
              <button
                v-if="edu.albums.length > 0"
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-ink sm:h-11 sm:w-11"
                :title="`${edu.company} photos`"
                :aria-label="`Open ${edu.company} album`"
                @click="openModal(`${edu.company} — photos`, edu.albums)"
              >
                <Images class="h-3.5 w-3.5" :stroke-width="1.7" />
              </button>
              <button
                v-if="edu.certificates.length > 0"
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-ink sm:h-11 sm:w-11"
                :title="`${edu.company} certificates`"
                :aria-label="`Open ${edu.company} certificates`"
                @click="openModal(`${edu.company} — certificates`, edu.certificates)"
              >
                <Award class="h-3.5 w-3.5" :stroke-width="1.7" />
              </button>
            </div>
          </div>
          <p class="mt-1 font-mono text-[12px] text-gray-500">{{ edu.tag }}</p>

          <div class="mt-5">
            <h3 class="text-[15px] font-medium text-ink">{{ edu.title }}</h3>
            <p class="mt-1 font-mono text-[11px] uppercase tracking-wider text-gray-400">
              {{ edu.period }}
            </p>
            <div class="mt-3 space-y-3 text-[14px] leading-relaxed text-gray-600">
              <p>{{ edu.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- centered swiper modal (album / certificates) -->
    <Teleport to="body">
      <div
        v-if="modal"
        class="fixed inset-0 z-[100] flex items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        :aria-label="modal.title"
        @keydown="onKeydown"
      >
        <!-- blurred backdrop — pure blur, no dark overlay -->
        <div class="absolute inset-0 bg-transparent backdrop-blur-md" @click="closeModal"></div>

        <!-- panel (landscape, default size) -->
        <div
          class="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_40px_90px_-20px_rgba(0,0,0,0.5)]"
        >
          <!-- header -->
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <div class="flex items-center gap-2.5">
              <span
                v-if="modal.logo"
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-100 bg-[#ffffff] p-1"
              >
                <img
                  :src="modal.logo"
                  :alt="`${modal.title} logo`"
                  class="h-full w-full object-contain"
                />
              </span>
              <p class="font-mono text-[12px] text-gray-500">{{ modal.title }}</p>
            </div>
            <button
              type="button"
              class="text-gray-400 transition hover:text-ink"
              aria-label="Close"
              @click="closeModal"
            >
              <X class="h-4 w-4" :stroke-width="1.8" />
            </button>
          </div>

          <!-- swiper body — landscape stage with a default 16/10 ratio -->
          <div class="relative aspect-[16/10] w-full bg-gray-50">
            <template v-if="modal.items.length > 0">
              <img
                :src="currentImage"
                :alt="`${modal.title} ${modal.index + 1}`"
                class="absolute inset-0 h-full w-full object-contain"
              />

              <!-- arrows -->
              <button
                v-if="modal.items.length > 1"
                type="button"
                class="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-sm transition hover:text-ink"
                aria-label="Previous image"
                @click="prevImage"
              >
                <ArrowLeft class="h-4 w-4" :stroke-width="1.8" />
              </button>
              <button
                v-if="modal.items.length > 1"
                type="button"
                class="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-sm transition hover:text-ink"
                aria-label="Next image"
                @click="nextImage"
              >
                <ArrowRight class="h-4 w-4" :stroke-width="1.8" />
              </button>
            </template>

            <!-- no album images → show the institution/company logo instead -->
            <div v-else class="flex h-full w-full items-center justify-center bg-gray-50 p-10">
              <img
                v-if="modal.logo"
                :src="modal.logo"
                :alt="`${modal.title} logo`"
                class="max-h-32 max-w-[60%] object-contain"
              />
              <div v-else class="flex flex-col items-center gap-2 text-gray-300">
                <Images class="h-10 w-10" :stroke-width="1.2" />
                <span class="font-mono text-[11px] text-gray-400">no image</span>
              </div>
            </div>
          </div>

          <!-- dots -->
          <div
            v-if="modal.items.length > 1"
            class="flex justify-center gap-1.5 border-t border-gray-100 py-3"
          >
            <button
              v-for="(item, j) in modal.items"
              :key="item"
              type="button"
              class="h-1.5 rounded-full transition-all"
              :class="j === modal.index ? 'w-5 bg-ink' : 'w-1.5 bg-gray-300'"
              :aria-label="`Go to image ${j + 1}`"
              @click="modal.index = j"
            ></button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* gentle floating animation for the tooltip */
.float-enter-active,
.float-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.float-enter-from,
.float-leave-to {
  opacity: 0;
  transform: translateX(8px) scale(0.96);
}
/* once entered, keep a slow float up/down */
.float-enter-active {
  animation: tooltip-float 3s ease-in-out 0.35s infinite;
}
.float-enter-to,
.float-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
}
@keyframes tooltip-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
</style>
