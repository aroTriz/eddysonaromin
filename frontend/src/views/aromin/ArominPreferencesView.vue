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
import { MousePointerClick } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import { isRightClickAllowed, RIGHT_CLICK_KEY } from '@/composables/useSiteBehavior'

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

        <!-- Theme-aligned switch (dark track + light knob in both modes) -->
        <button
          type="button"
          role="switch"
          :aria-checked="rightClickAllowed"
          :aria-label="rightClickAllowed ? 'Disable right click' : 'Enable right click'"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200"
          :class="[
            rightClickAllowed
              ? 'border-gray-400 bg-gray-900 dark:border-gray-400 dark:bg-gray-50'
              : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
          ]"
          @click="toggleRightClick"
        >
          <span
            class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 dark:bg-gray-950"
            :class="rightClickAllowed ? 'translate-x-[1.5rem]' : 'translate-x-0.5'"
          ></span>
        </button>
      </div>
    </section>

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400">
      <MousePointerClick class="h-3.5 w-3.5" :stroke-width="1.7" />
      changes apply instantly across the whole site
    </div>
  </AdminLayout>
</template>
