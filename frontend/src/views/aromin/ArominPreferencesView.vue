<script setup lang="ts">
/**
 * /aromin/preferences — page settings. The first (and so far only) setting
 * toggles the site's right-click protection: when "Enable Right Click" is on,
 * visitors can right-click / save images normally; when off (default), the
 * context menu is blocked with the "// right click disabled" toast.
 *
 * The choice is persisted in localStorage and read live by useSiteBehavior,
 * so it applies across the whole site immediately.
 *
 * NOTE: the SalaryCat pet has its own page (/aromin/pet) with API-backed
 * settings — it deliberately does NOT live here.
 */
import { Check, MessageCircle, MousePointerClick, Sparkles } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import { isRightClickAllowed, RIGHT_CLICK_KEY } from '@/composables/useSiteBehavior'
import { setAskTrizEnabled, setBackdropEnabled, setClickMeEnabled, setCommunityChatEnabled } from '@/services/adminApi'
import { fetchAskTrizEnabled, fetchBackdropEnabled, fetchClickMeEnabled, fetchCommunityChatEnabled } from '@/services/chatApi'

const rightClickAllowed = ref(isRightClickAllowed())

const statusLabel = computed(() =>
  rightClickAllowed.value ? 'enabled — visitors can right-click' : 'disabled — right-click is blocked',
)

function toggleRightClick(): void {
  rightClickAllowed.value = !rightClickAllowed.value
  try {
    localStorage.setItem(RIGHT_CLICK_KEY, rightClickAllowed.value ? 'allowed' : 'blocked')
  } catch {
    /* storage unavailable — keep in-session state */
  }
}

/** Community chat on/off — persisted server-side (site_settings), so the
 *  choice applies to visitors, not just this browser. */
const chatEnabled = ref(true)
const chatBusy = ref(false)
const chatError = ref('')

const chatStatusLabel = computed(() =>
  chatEnabled.value
    ? 'on — visitors can post messages'
    : 'off — visitors see “Community Chat has been turned off”',
)

onMounted(() => {
  void fetchCommunityChatEnabled().then((ok) => {
    chatEnabled.value = ok
  })
  void fetchBackdropEnabled().then((ok) => {
    backdropEnabled.value = ok
  })
  void fetchClickMeEnabled().then((ok) => {
    clickMeEnabled.value = ok
  })
  void fetchAskTrizEnabled().then((ok) => {
    askTrizEnabled.value = ok
  })
})

async function toggleCommunityChat(): Promise<void> {
  if (chatBusy.value) return
  const next = !chatEnabled.value
  chatBusy.value = true
  chatError.value = ''
  chatEnabled.value = next // optimistic — flip the switch immediately
  try {
    await setCommunityChatEnabled(next)
  } catch (err) {
    chatEnabled.value = !next // revert on failure
    chatError.value = err instanceof Error ? err.message : 'Failed to update setting.'
  } finally {
    chatBusy.value = false
  }
}

/** Animated backdrops on/off — persisted server-side (site_settings). When
 *  ON (default), light mode shows the neural-link animation and dark mode
 *  shows the 3D star sphere. When OFF, both themes render pure colors
 *  (plain white / plain near-black). */
const backdropEnabled = ref(true)
const backdropBusy = ref(false)
const backdropError = ref('')

/** Event broadcast after the backdrop setting changes — SiteBackdrop listens
 *  for it so the effect applies INSTANTLY (no page refresh needed). */
const BACKDROP_CHANGE_EVENT = 'backdrop-change'

const backdropStatusLabel = computed(() =>
  backdropEnabled.value
    ? 'on — neural links in light · stars in dark'
    : 'off — pure white / pure black backgrounds',
)

async function toggleBackdrop(): Promise<void> {
  if (backdropBusy.value) return
  const next = !backdropEnabled.value
  backdropBusy.value = true
  backdropError.value = ''
  backdropEnabled.value = next // optimistic — flip the switch immediately
  // Tell every mounted SiteBackdrop (public pages, admin, login) to react
  // NOW — no manual refresh required.
  window.dispatchEvent(new CustomEvent(BACKDROP_CHANGE_EVENT, { detail: { enabled: next } }))
  try {
    await setBackdropEnabled(next)
  } catch (err) {
    backdropEnabled.value = !next // revert on failure
    backdropError.value = err instanceof Error ? err.message : 'Failed to update setting.'
  } finally {
    backdropBusy.value = false
  }
}

/** "Show Click me" toggle — persisted server-side (site_settings). When
 *  ON (default), the sidebar shows "click me..." which opens the original
 *  Ask Anything overlay. When OFF, the button is hidden from the sidebar. */
const clickMeEnabled = ref(true)
const clickMeBusy = ref(false)
const clickMeError = ref('')

const clickMeStatusLabel = computed(() =>
  clickMeEnabled.value
    ? 'on — "click me..." button is visible in the sidebar'
    : 'off — "click me..." button is hidden from the sidebar',
)

async function toggleClickMe(): Promise<void> {
  if (clickMeBusy.value) return
  const next = !clickMeEnabled.value
  clickMeBusy.value = true
  clickMeError.value = ''
  clickMeEnabled.value = next
  try {
    await setClickMeEnabled(next)
  } catch (err) {
    clickMeEnabled.value = !next
    clickMeError.value = err instanceof Error ? err.message : 'Failed to update setting.'
  } finally {
    clickMeBusy.value = false
  }
}

/** "Enable/Disable Triz.ai" toggle — persisted server-side (site_settings). When
 *  ON (default), the sidebar shows "Ask Triz.ai" which opens the AI chat
 *  overlay (ChatGPT-style). When OFF, the sidebar shows "Eddyson Disabled Trizai"
 *  and the chat is disabled — visitors cannot open the overlay. */
const askTrizEnabled = ref(true)
const askTrizBusy = ref(false)
const askTrizError = ref('')

const askTrizStatusLabel = computed(() =>
  askTrizEnabled.value
    ? 'enabled — "Ask Triz.ai" is active in the sidebar'
    : 'disabled — "Eddyson Disabled Trizai" shown, chat is off',
)

async function toggleAskTriz(): Promise<void> {
  if (askTrizBusy.value) return
  const next = !askTrizEnabled.value
  askTrizBusy.value = true
  askTrizError.value = ''
  askTrizEnabled.value = next
  try {
    await setAskTrizEnabled(next)
  } catch (err) {
    askTrizEnabled.value = !next
    askTrizError.value = err instanceof Error ? err.message : 'Failed to update setting.'
  } finally {
    askTrizBusy.value = false
  }
}
</script>

<template>
  <AdminLayout active="aromin-preferences">
    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="mb-8">
      <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
        page preferences<span class="text-gray-400">.</span>
      </h1>
      <p class="mt-1.5 font-mono text-[12px] text-gray-500">
        // settings that control how the site behaves for visitors
      </p>
    </div>

    <!-- ── Right-click protection ─────────────────────────────── -->
    <section class="rounded-xl border border-gray-200 bg-white p-6">
      <div class="flex items-start justify-between gap-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <MousePointerClick class="h-4 w-4 shrink-0 text-gray-400" :stroke-width="1.7" />
            <h2 class="font-mono text-[13px] font-semibold text-ink">Enable Right Click</h2>
          </div>
          <p class="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500">
            When off, visitors can&rsquo;t right-click or save images — the site
            shows a &ldquo;// right click disabled&rdquo; toast instead. Turn it on
            to let visitors use the context menu freely.
          </p>
          <p class="mt-3 font-mono text-[11px] text-gray-400">
            // {{ statusLabel }}
          </p>
        </div>

        <!-- Outlined switch: no fill when ticked — just border + circle with a black check -->
        <button
          type="button"
          role="switch"
          :aria-checked="rightClickAllowed"
          :aria-label="rightClickAllowed ? 'Disable right click' : 'Enable right click'"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200"
          :class="[
            rightClickAllowed
              ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
              : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
          ]"
          @click="toggleRightClick"
        >
          <span
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
            :class="rightClickAllowed ? 'translate-x-[1.5rem]' : 'translate-x-0.5'"
          >
            <Check
              v-if="rightClickAllowed"
              class="h-3 w-3 text-white"
              :stroke-width="3"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>
    </section>

    <!-- ── Community chat on/off ─────────────────────────────── -->
    <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      <div class="flex items-start justify-between gap-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <MessageCircle class="h-4 w-4 shrink-0 text-gray-400" :stroke-width="1.7" />
            <h2 class="font-mono text-[13px] font-semibold text-ink">Community Chat</h2>
          </div>
          <p class="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500">
            When off, visitors can&rsquo;t send messages — the chat shows
            &ldquo;Community Chat has been turned off&rdquo; instead. Turn it
            on to let visitors post again.
          </p>
          <p class="mt-3 font-mono text-[11px] text-gray-400">
            // {{ chatStatusLabel }}
          </p>
          <p v-if="chatError" class="mt-2 font-mono text-[11px] text-red-500">
            // {{ chatError }}
          </p>
        </div>

        <!-- Same outlined switch as right-click protection -->
        <button
          type="button"
          role="switch"
          :aria-checked="chatEnabled"
          :aria-label="chatEnabled ? 'Turn off community chat' : 'Turn on community chat'"
          :disabled="chatBusy"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-50"
          :class="[
            chatEnabled
              ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
              : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
          ]"
          @click="toggleCommunityChat"
        >
          <span
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
            :class="chatEnabled ? 'translate-x-[1.5rem]' : 'translate-x-0.5'"
          >
            <Check
              v-if="chatEnabled"
              class="h-3 w-3 text-white"
              :stroke-width="3"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>
    </section>

    <!-- ── Animated backdrops on/off ─────────────────────────── -->
    <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      <div class="flex items-start justify-between gap-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <Sparkles class="h-4 w-4 shrink-0 text-gray-400" :stroke-width="1.7" />
            <h2 class="font-mono text-[13px] font-semibold text-ink">Animated Backdrops</h2>
          </div>
          <p class="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500">
            When on, light mode shows the neural-link node animation and dark
            mode shows the 3D star sphere. Turn it off for pure backgrounds
            &mdash; plain white in light mode, plain near-black in dark mode.
          </p>
          <p class="mt-3 font-mono text-[11px] text-gray-400">
            // {{ backdropStatusLabel }}
          </p>
          <p v-if="backdropError" class="mt-2 font-mono text-[11px] text-red-500">
            // {{ backdropError }}
          </p>
        </div>

        <!-- Same outlined switch as the other settings -->
        <button
          type="button"
          role="switch"
          :aria-checked="backdropEnabled"
          :aria-label="backdropEnabled ? 'Turn off animated backdrops' : 'Turn on animated backdrops'"
          :disabled="backdropBusy"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-50"
          :class="[
            backdropEnabled
              ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
              : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
          ]"
          @click="toggleBackdrop"
        >
          <span
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
            :class="backdropEnabled ? 'translate-x-[1.5rem]' : 'translate-x-0.5'"
          >
            <Check
              v-if="backdropEnabled"
              class="h-3 w-3 text-white"
              :stroke-width="3"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>
    </section>

    <!-- ── Enable/Disable "Ask Triz.ai" in sidebar ────────────── -->
    <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      <div class="flex items-start justify-between gap-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <Sparkles class="h-4 w-4 shrink-0 text-gray-400" :stroke-width="1.7" />
            <h2 class="font-mono text-[13px] font-semibold text-ink">Enable/Disable Triz.ai</h2>
          </div>
          <p class="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500">
            When enabled, the sidebar shows &ldquo;Ask Triz.ai&rdquo; which opens
            a ChatGPT-style AI chat overlay. When disabled, the sidebar shows
            &ldquo;Eddyson Disabled Trizai&rdquo; and the chat is completely off
            &mdash; visitors cannot open the overlay.
          </p>
          <p class="mt-3 font-mono text-[11px] text-gray-400">
            // {{ askTrizStatusLabel }}
          </p>
          <p v-if="askTrizError" class="mt-2 font-mono text-[11px] text-red-500">
            // {{ askTrizError }}
          </p>
        </div>

        <!-- Same outlined switch as the other settings -->
        <button
          type="button"
          role="switch"
          :aria-checked="askTrizEnabled"
          :aria-label="askTrizEnabled ? 'Disable Triz.ai chat' : 'Enable Triz.ai chat'"
          :disabled="askTrizBusy"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-50"
          :class="[
            askTrizEnabled
              ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
              : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
          ]"
          @click="toggleAskTriz"
        >
          <span
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
            :class="askTrizEnabled ? 'translate-x-[1.5rem]' : 'translate-x-0.5'"
          >
            <Check
              v-if="askTrizEnabled"
              class="h-3 w-3 text-white"
              :stroke-width="3"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>
    </section>

    <!-- ── Show "Click me..." in sidebar ─────────────────────── -->
    <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      <div class="flex items-start justify-between gap-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <MousePointerClick class="h-4 w-4 shrink-0 text-gray-400" :stroke-width="1.7" />
            <h2 class="font-mono text-[13px] font-semibold text-ink">Show Command</h2>
          </div>
          <p class="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500">
            When on, the sidebar shows the &ldquo;Command&rdquo; button that
            opens the original Ask Anything overlay. Turn it off to hide
            the button from the sidebar.
          </p>
          <p class="mt-3 font-mono text-[11px] text-gray-400">
            // {{ clickMeStatusLabel }}
          </p>
          <p v-if="clickMeError" class="mt-2 font-mono text-[11px] text-red-500">
            // {{ clickMeError }}
          </p>
        </div>

        <!-- Same outlined switch as the other settings -->
        <button
          type="button"
          role="switch"
          :aria-checked="clickMeEnabled"
          :aria-label="clickMeEnabled ? 'Hide click me button' : 'Show click me button'"
          :disabled="clickMeBusy"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-50"
          :class="[
            clickMeEnabled
              ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
              : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
          ]"
          @click="toggleClickMe"
        >
          <span
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
            :class="clickMeEnabled ? 'translate-x-[1.5rem]' : 'translate-x-0.5'"
          >
            <Check
              v-if="clickMeEnabled"
              class="h-3 w-3 text-white"
              :stroke-width="3"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>
    </section>

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400">
      <MousePointerClick class="h-3.5 w-3.5" :stroke-width="1.7" />
      changes apply instantly across the whole site
    </div>
  </AdminLayout>
</template>
