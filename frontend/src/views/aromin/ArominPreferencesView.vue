<script setup lang="ts">
/**
 * /aromin/preferences â€” unified page for ALL site settings.
 *
 * Design:
 *  - All toggles default to OFF.
 *  - Changes are staged ("draft mode") â€” nothing applies until "Save Changes".
 *  - "Restore Default" resets the draft to all-OFF without persisting.
 *  - Navigation is blocked if there are unsaved changes.
 *  - Pet settings (size / speed / animations) live inline behind an eye icon.
 */
import {
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  MessageCircle,
  MousePointerClick,
  PawPrint,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter, type RouteLocationNormalized } from 'vue-router'

import AdminLayout from './AdminLayout.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { PET_SCALE_OPTIONS, PET_SPEED_OPTIONS } from '@/composables/usePetConfig'
import { usePreferences } from '@/composables/usePreferences'

const {
  draft,
  loaded,
  saving,
  saved,
  error,
  hasChanges,
  loadFromApi,
  save,
  restoreDefaults,
} = usePreferences()

const router = useRouter()

/* â”€â”€ Pet config expansion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const petExpanded = ref(false)

function togglePetExpanded(): void {
  petExpanded.value = !petExpanded.value
}

/* â”€â”€ Toggle helpers (change draft only â€” nothing persists) â”€â”€â”€â”€â”€â”€â”€ */

function toggleRightClick(): void {
  draft.value.rightClick = !draft.value.rightClick
}
function toggleChat(): void {
  draft.value.chat = !draft.value.chat
}
function toggleBackdrop(): void {
  draft.value.backdrop = !draft.value.backdrop
}
function toggleAskTriz(): void {
  draft.value.askTriz = !draft.value.askTriz
}
function toggleClickMe(): void {
  draft.value.clickMe = !draft.value.clickMe
}
function togglePetEnabled(): void {
  draft.value.petEnabled = !draft.value.petEnabled
  if (!draft.value.petEnabled) petExpanded.value = false
}

/* â”€â”€ Status labels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const rightClickLabel = computed(() =>
  draft.value.rightClick
    ? 'enabled â€” visitors can right-click'
    : 'disabled â€” right-click is blocked',
)
const chatLabel = computed(() =>
  draft.value.chat
    ? 'on â€” visitors can post messages'
    : 'off â€” "Community Chat has been turned off"',
)
const backdropLabel = computed(() =>
  draft.value.backdrop
    ? 'on â€” neural links in light Â· stars in dark'
    : 'off â€” pure white / pure black backgrounds',
)
const askTrizLabel = computed(() =>
  draft.value.askTriz
    ? 'enabled â€” "Ask Triz.ai" is active in the sidebar'
    : 'disabled â€” chat overlay is off',
)
const clickMeLabel = computed(() =>
  draft.value.clickMe
    ? 'on â€” "click me..." button is visible in the sidebar'
    : 'off â€” "click me..." button is hidden',
)
const petLabel = computed(() =>
  draft.value.petEnabled
    ? 'on â€” the "toggle pet" button shows in the navbar for every visitor'
    : 'off â€” "toggle pet" is hidden from the navbar',
)

/* â”€â”€ Navigation guard â€” block leaving with unsaved changes â”€â”€â”€â”€â”€â”€â”€â”€ */

const navGuardOpen = ref(false)
let pendingRoute: RouteLocationNormalized | null = null

onBeforeRouteLeave((to, _from, next) => {
  if (hasChanges.value) {
    pendingRoute = to
    next(false)
    navGuardOpen.value = true
  } else {
    next()
  }
})

function confirmNav(): void {
  navGuardOpen.value = false
  if (pendingRoute) {
    const target = pendingRoute
    pendingRoute = null
    void router.push(target)
  }
}

function cancelNav(): void {
  navGuardOpen.value = false
  pendingRoute = null
}

/* â”€â”€ Pet preview sprite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const FRAME_W = 192
const FRAME_H = 208
const COLS = 8
const IDLE_FRAMES = [0, 1, 2, 3, 4, 5]
const IDLE_FPS = 8

let animTimer: ReturnType<typeof setInterval> | null = null
const previewFrame = ref(0)

function previewBgPos(): string {
  const col = IDLE_FRAMES[previewFrame.value] % COLS
  const row = Math.floor(IDLE_FRAMES[previewFrame.value] / COLS)
  const s = draft.value.petScale
  return `${-(col * FRAME_W * s)}px ${-(row * FRAME_H * s)}px`
}

function startPreviewAnim(): void {
  stopPreviewAnim()
  if (!draft.value.petAnimate) return
  animTimer = setInterval(() => {
    previewFrame.value = (previewFrame.value + 1) % IDLE_FRAMES.length
  }, 1000 / IDLE_FPS)
}

function stopPreviewAnim(): void {
  if (animTimer) {
    clearInterval(animTimer)
    animTimer = null
  }
}

watch(
  () => draft.value.petAnimate,
  () => {
    previewFrame.value = 0
    startPreviewAnim()
  },
)

/* â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

onMounted(async () => {
  await loadFromApi()
  startPreviewAnim()
})

onBeforeUnmount(() => {
  stopPreviewAnim()
})

/* â”€â”€ Restore confirmation modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const restoreOpen = ref(false)

function openRestore(): void {
  restoreOpen.value = true
}

function confirmRestore(): void {
  restoreOpen.value = false
  restoreDefaults()
  petExpanded.value = false
}

function cancelRestore(): void {
  restoreOpen.value = false
}
</script>

<template>
  <AdminLayout active="aromin-preferences">
    <!-- â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <div class="mb-8">
      <h1
        class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink"
      >
        page preferences<span class="text-gray-400">.</span>
      </h1>
      <p class="mt-1.5 font-mono text-[12px] text-gray-500">
        // settings that control how the site behaves for visitors
      </p>
    </div>

    <!-- â”€â”€ Loading skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <div v-if="!loaded" class="space-y-6">
      <div
        v-for="i in 5"
        :key="i"
        class="h-[120px] skeleton rounded-xl border border-gray-200 bg-gray-50"
      />
    </div>

    <template v-else>
      <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
      <!-- SETTINGS                                                -->
      <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->

      <!-- â”€â”€ Right-click protection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <section class="rounded-xl border border-gray-200 bg-white p-6">
        <div class="flex items-start justify-between gap-6">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <MousePointerClick
                class="h-4 w-4 shrink-0 text-gray-400"
                :stroke-width="1.7"
              />
              <h2 class="font-mono text-[13px] font-semibold text-ink">
                Enable Right Click
              </h2>
            </div>
            <p
              class="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500"
            >
              When off, visitors can&rsquo;t right-click or save images
              &mdash; the site shows a &ldquo;// right click disabled&rdquo;
              toast instead. Turn it on to let visitors use the context menu
              freely.
            </p>
            <p class="mt-3 font-mono text-[11px] text-gray-400">
              // {{ rightClickLabel }}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="draft.rightClick"
            :aria-label="
              draft.rightClick ? 'Disable right click' : 'Enable right click'
            "
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200"
            :class="[
              draft.rightClick
                ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
                : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
            ]"
            @click="toggleRightClick"
          >
            <span
              class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
              :class="
                draft.rightClick ? 'translate-x-[1.5rem]' : 'translate-x-0.5'
              "
            >
              <Check
                v-if="draft.rightClick"
                class="h-3 w-3 text-white"
                :stroke-width="3"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </section>

      <!-- â”€â”€ Community chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <div class="flex items-start justify-between gap-6">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <MessageCircle
                class="h-4 w-4 shrink-0 text-gray-400"
                :stroke-width="1.7"
              />
              <h2 class="font-mono text-[13px] font-semibold text-ink">
                Community Chat
              </h2>
            </div>
            <p
              class="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500"
            >
              When off, visitors can&rsquo;t send messages &mdash; the chat
              shows &ldquo;Community Chat has been turned off&rdquo; instead.
              Turn it on to let visitors post again.
            </p>
            <p class="mt-3 font-mono text-[11px] text-gray-400">
              // {{ chatLabel }}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="draft.chat"
            :aria-label="
              draft.chat
                ? 'Turn off community chat'
                : 'Turn on community chat'
            "
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200"
            :class="[
              draft.chat
                ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
                : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
            ]"
            @click="toggleChat"
          >
            <span
              class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
              :class="
                draft.chat ? 'translate-x-[1.5rem]' : 'translate-x-0.5'
              "
            >
              <Check
                v-if="draft.chat"
                class="h-3 w-3 text-white"
                :stroke-width="3"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </section>

      <!-- â”€â”€ Animated backdrops â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <div class="flex items-start justify-between gap-6">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <Sparkles
                class="h-4 w-4 shrink-0 text-gray-400"
                :stroke-width="1.7"
              />
              <h2 class="font-mono text-[13px] font-semibold text-ink">
                Animated Backdrops
              </h2>
            </div>
            <p
              class="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500"
            >
              When on, light mode shows the neural-link node animation and
              dark mode shows the 3D star sphere. Turn it off for pure
              backgrounds &mdash; plain white in light mode, plain near-black
              in dark mode.
            </p>
            <p class="mt-3 font-mono text-[11px] text-gray-400">
              // {{ backdropLabel }}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="draft.backdrop"
            :aria-label="
              draft.backdrop
                ? 'Turn off animated backdrops'
                : 'Turn on animated backdrops'
            "
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200"
            :class="[
              draft.backdrop
                ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
                : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
            ]"
            @click="toggleBackdrop"
          >
            <span
              class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
              :class="
                draft.backdrop
                  ? 'translate-x-[1.5rem]'
                  : 'translate-x-0.5'
              "
            >
              <Check
                v-if="draft.backdrop"
                class="h-3 w-3 text-white"
                :stroke-width="3"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </section>

      <!-- â”€â”€ Enable/Disable Triz.ai â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <div class="flex items-start justify-between gap-6">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <Sparkles
                class="h-4 w-4 shrink-0 text-gray-400"
                :stroke-width="1.7"
              />
              <h2 class="font-mono text-[13px] font-semibold text-ink">
                Enable/Disable Triz.ai
              </h2>
            </div>
            <p
              class="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500"
            >
              When enabled, the sidebar shows &ldquo;Ask Triz.ai&rdquo; which
              opens a ChatGPT-style AI chat overlay. When disabled, the sidebar
              shows &ldquo;Eddyson Disabled Trizai&rdquo; and the chat is
              completely off.
            </p>
            <p class="mt-3 font-mono text-[11px] text-gray-400">
              // {{ askTrizLabel }}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="draft.askTriz"
            :aria-label="
              draft.askTriz
                ? 'Disable Triz.ai chat'
                : 'Enable Triz.ai chat'
            "
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200"
            :class="[
              draft.askTriz
                ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
                : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
            ]"
            @click="toggleAskTriz"
          >
            <span
              class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
              :class="
                draft.askTriz
                  ? 'translate-x-[1.5rem]'
                  : 'translate-x-0.5'
              "
            >
              <Check
                v-if="draft.askTriz"
                class="h-3 w-3 text-white"
                :stroke-width="3"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </section>

      <!-- â”€â”€ Show "Click me..." â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <div class="flex items-start justify-between gap-6">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <MousePointerClick
                class="h-4 w-4 shrink-0 text-gray-400"
                :stroke-width="1.7"
              />
              <h2 class="font-mono text-[13px] font-semibold text-ink">
                Show Command
              </h2>
            </div>
            <p
              class="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500"
            >
              When on, the sidebar shows the &ldquo;Command&rdquo; button that
              opens the original Ask Anything overlay. Turn it off to hide the
              button from the sidebar.
            </p>
            <p class="mt-3 font-mono text-[11px] text-gray-400">
              // {{ clickMeLabel }}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="draft.clickMe"
            :aria-label="
              draft.clickMe
                ? 'Hide click me button'
                : 'Show click me button'
            "
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200"
            :class="[
              draft.clickMe
                ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
                : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
            ]"
            @click="toggleClickMe"
          >
            <span
              class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
              :class="
                draft.clickMe
                  ? 'translate-x-[1.5rem]'
                  : 'translate-x-0.5'
              "
            >
              <Check
                v-if="draft.clickMe"
                class="h-3 w-3 text-white"
                :stroke-width="3"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </section>

      <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
      <!-- PET SECTION                                              -->
      <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
      <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <div class="flex items-start justify-between gap-6">
          <div class="min-w-0">
            <div class="flex items-center gap-3">
              <PawPrint
                class="h-4 w-4 shrink-0 text-gray-400"
                :stroke-width="1.7"
              />
              <h2 class="font-mono text-[13px] font-semibold text-ink">
                Salary Cat
              </h2>
              <!-- live animated sprite preview -->
              <div
                class="rounded-md bg-gray-50"
                :style="{
                  width: `${192 * draft.petScale}px`,
                  height: `${208 * draft.petScale}px`,
                  backgroundImage: 'url(/pets/salary-cat.webp)',
                  backgroundSize: `${FRAME_W * COLS * draft.petScale}px ${FRAME_H * 9 * draft.petScale}px`,
                  backgroundPosition: previewBgPos(),
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated',
                }"
              />
            </div>
            <p
              class="mt-3 max-w-md text-[13px] leading-relaxed text-gray-500"
            >
              The little cat that roams the site&rsquo;s public pages. Visitors
              can drag it around and click it to wave. Changes here are
              global &mdash; every visitor sees them.
            </p>
            <p class="mt-3 font-mono text-[11px] text-gray-400">
              // {{ petLabel }}
            </p>
            <p
              v-if="draft.petEnabled"
              class="mt-1.5 font-mono text-[10.5px] text-gray-400"
            >
              // navbar toggle (&#8984;P / Alt+P) lets visitors hide it
              per-browser
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <!-- Eye icon â€” configure pet (only when enabled) -->
            <button
              v-if="draft.petEnabled"
              type="button"
              :aria-label="
                petExpanded
                  ? 'Collapse pet configuration'
                  : 'Expand pet configuration'
              "
              class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
              @click="togglePetExpanded"
            >
              <EyeOff
                v-if="petExpanded"
                class="h-4 w-4"
                :stroke-width="1.7"
              />
              <Eye v-else class="h-4 w-4" :stroke-width="1.7" />
            </button>

            <!-- Enable switch -->
            <button
              type="button"
              role="switch"
              :aria-checked="draft.petEnabled"
              :aria-label="
                draft.petEnabled
                  ? 'Hide salary cat from navbar'
                  : 'Show salary cat in navbar'
              "
              class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200"
              :class="[
                draft.petEnabled
                  ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
                  : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
              ]"
              @click="togglePetEnabled"
            >
              <span
                class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
                :class="
                  draft.petEnabled
                    ? 'translate-x-[1.5rem]'
                    : 'translate-x-0.5'
                "
              >
                <Check
                  v-if="draft.petEnabled"
                  class="h-3 w-3 text-white"
                  :stroke-width="3"
                  aria-hidden="true"
                />
              </span>
            </button>
          </div>
        </div>

        <!-- â”€â”€ Expanded pet config (size / speed / animations) â”€â”€ -->
        <Transition
          enter-active-class="transition-all duration-250 ease-[cubic-bezier(.16,1,.3,1)]"
          enter-from-class="max-h-0 opacity-0"
          enter-to-class="max-h-60 opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="max-h-60 opacity-100"
          leave-to-class="max-h-0 opacity-0"
        >
          <div
            v-if="petExpanded && draft.petEnabled"
            class="mt-5 grid grid-cols-1 gap-4 overflow-hidden border-t border-gray-100 pt-5 sm:grid-cols-3"
          >
            <div class="flex flex-col gap-1.5">
              <label
                class="font-mono text-[11px] text-gray-500"
                for="pref-pet-scale"
              >
                size
              </label>
              <select
                id="pref-pet-scale"
                v-model="draft.petScale"
                class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              >
                <option
                  v-for="o in PET_SCALE_OPTIONS"
                  :key="o.value"
                  :value="o.value"
                >
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label
                class="font-mono text-[11px] text-gray-500"
                for="pref-pet-speed"
              >
                walk speed
              </label>
              <select
                id="pref-pet-speed"
                v-model="draft.petSpeed"
                class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              >
                <option
                  v-for="o in PET_SPEED_OPTIONS"
                  :key="o.value"
                  :value="o.value"
                >
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label
                class="font-mono text-[11px] text-gray-500"
                for="pref-pet-animate"
              >
                animations
              </label>
              <select
                id="pref-pet-animate"
                v-model="draft.petAnimate"
                class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
              >
                <option :value="true">on</option>
                <option :value="false">off</option>
              </select>
            </div>
          </div>
        </Transition>
      </section>

      <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
      <!-- SAVE / RESTORE BAR                                       -->
      <!-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
      <div class="mt-8 flex flex-wrap items-center gap-4 border-t border-gray-200 pt-6">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
          :disabled="saving || !hasChanges"
          @click="save"
        >
          <LoaderCircle
            v-if="saving"
            class="h-4 w-4 animate-spin"
            :stroke-width="1.7"
          />
          <Save v-else class="h-4 w-4" :stroke-width="1.7" />
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>

        <Transition
          enter-active-class="transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)]"
          enter-from-class="translate-y-1 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="translate-y-1 opacity-0"
        >
          <p
            v-if="saved"
            class="font-mono text-[11px] text-green-600"
            role="status"
          >
            // saved &mdash; applies to the whole site
          </p>
        </Transition>

        <Transition
          enter-active-class="transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)]"
          enter-from-class="translate-y-1 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="translate-y-1 opacity-0"
        >
          <p
            v-if="error"
            class="font-mono text-[11px] text-red-500"
            role="alert"
          >
            // {{ error }}
          </p>
        </Transition>

        <div v-if="hasChanges" class="ml-auto">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[12px] text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
            @click="openRestore"
          >
            <RotateCcw class="h-3.5 w-3.5" :stroke-width="1.7" />
            Restore Default
          </button>
        </div>
      </div>

      <div
        class="mt-6 flex items-center gap-2 font-mono text-[10.5px] text-gray-400"
      >
        <MousePointerClick class="h-3.5 w-3.5" :stroke-width="1.7" />
        changes apply after saving &mdash; navigate away is blocked if there
        are unsaved changes
      </div>
    </template>

    <!-- â”€â”€ Restore defaults confirmation modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <ConfirmModal
      :open="restoreOpen"
      title="restore defaults"
      message="Reset all preferences to defaults? Unsaved changes will be lost."
      confirm-label="restore"
      danger
      @confirm="confirmRestore"
      @cancel="cancelRestore"
    />

    <!-- â”€â”€ Unsaved changes navigation guard modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <ConfirmModal
      :open="navGuardOpen"
      title="unsaved changes"
      message="You have unsaved changes that will be lost. Are you sure you want to leave?"
      confirm-label="leave"
      danger
      @confirm="confirmNav"
      @cancel="cancelNav"
    />
  </AdminLayout>
</template>

