<script setup lang="ts">
/**
 * /aromin/preferences — page settings. The first (and so far only) setting
 * toggles the site's right-click protection: when "Enable Right Click" is on,
 * visitors can right-click / save images normally; when off (default), the
 * context menu is blocked with the "// right click disabled" toast.
 *
 * The choice is persisted in localStorage and read live by useSiteBehavior,
 * so it applies across the whole site immediately.
 */
import { Check, MessageCircle, MousePointerClick, Sparkles } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import { isRightClickAllowed, RIGHT_CLICK_KEY } from '@/composables/useSiteBehavior'
import { setBackdropEnabled, setCommunityChatEnabled } from '@/services/adminApi'
import { fetchBackdropEnabled, fetchCommunityChatEnabled } from '@/services/chatApi'

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

const backdropStatusLabel = computed(() =>
  backdropEnabled.value
    ? 'on — neural links in light · stars in dark'
    : 'off — pure white / pure black backgrounds',
)

onMounted(() => {
  void fetchCommunityChatEnabled().then((ok) => {
    chatEnabled.value = ok
  })
  void fetchBackdropEnabled().then((ok) => {
    backdropEnabled.value = ok
  })
})

async function toggleBackdrop(): Promise<void> {
  if (backdropBusy.value) return
  const next = !backdropEnabled.value
  backdropBusy.value = true
  backdropError.value = ''
  backdropEnabled.value = next // optimistic — flip the switch immediately
  try {
    await setBackdropEnabled(next)
  } catch (err) {
    backdropEnabled.value = !next // revert on failure
    backdropError.value = err instanceof Error ? err.message : 'Failed to update setting.'
  } finally {
    backdropBusy.value = false
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
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200 dark:bg-white"
            :class="rightClickAllowed ? 'translate-x-[1.5rem]' : 'translate-x-0.5'"
          >
            <Check
              v-if="rightClickAllowed"
              class="h-3 w-3 text-white dark:text-black"
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
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200 dark:bg-white"
            :class="chatEnabled ? 'translate-x-[1.5rem]' : 'translate-x-0.5'"
          >
            <Check
              v-if="chatEnabled"
              class="h-3 w-3 text-white dark:text-black"
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
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200 dark:bg-white"
            :class="backdropEnabled ? 'translate-x-[1.5rem]' : 'translate-x-0.5'"
          >
            <Check
              v-if="backdropEnabled"
              class="h-3 w-3 text-white dark:text-black"
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
