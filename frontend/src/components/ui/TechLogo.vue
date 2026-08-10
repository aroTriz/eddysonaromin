<script setup lang="ts">
/**
 * TechLogo — renders a technology's brand logo (Simple Icons SVG path with its
 * brand color) or a themed lucide fallback when the tech has no brand icon.
 *
 * Dark mode: brand logos turn white (CSS --logo-color override under
 * html.dark) so they read clearly on the dark pill backgrounds.
 */
import { computed } from 'vue'

import { TECH_FALLBACK_ICON, TECH_LOGO_BY_NAME } from '@/data/techLogos'

const props = withDefaults(
  defineProps<{
    /** Exact technology name as stored in the stack data. */
    name: string
    /** Icon size in px. Defaults to 18. */
    size?: number
  }>(),
  { size: 18 },
)

const logo = computed(() => TECH_LOGO_BY_NAME[props.name])
const fallback = computed(() => TECH_FALLBACK_ICON[props.name])
</script>

<template>
  <svg
    v-if="logo"
    :width="size"
    :height="size"
    :viewBox="logo.viewBox ?? '0 0 24 24'"
    fill="currentColor"
    :class="['tech-logo', 'shrink-0']"
    :data-has-dark="logo.pathDark ? 'true' : undefined"
    :style="{ '--logo-color': logo.color, ...(logo.pathDark ? { '--logo-color-dark': '#ffffff' } : {}) }"
    aria-hidden="true"
  >
    <!-- Light-mode glyph; dark mode uses pathDark (the eye only, no filled box). -->
    <path class="tech-logo-path-light" :d="logo.path" :fill-rule="logo.fillRule ?? 'nonzero'" />
    <path v-if="logo.pathDark" class="tech-logo-path-dark" :d="logo.pathDark" />
  </svg>
  <component
    :is="fallback"
    v-else-if="fallback"
    :size="size"
    :stroke-width="1.8"
    class="tech-logo-fallback shrink-0 text-gray-400"
    aria-hidden="true"
  />
</template>

<style>
/* Brand color comes from the data via a custom property so dark mode can
   override it to white with a single html.dark rule (no JS per icon).
   !important beats the inline --logo-color set in the template. */
.tech-logo {
  color: var(--logo-color, #000000);
  transition: color 0.45s ease;
}
html.dark .tech-logo {
  --logo-color: #ffffff !important;
}
html.dark .tech-logo-fallback {
  color: #d4d4d4 !important;
}

/* Dual-path marks (e.g. Grok: filled box + eye cutout in light mode).
   In dark mode swap to the glyph-only dark path so no filled "box" appears. */
.tech-logo-path-dark {
  display: none;
}
html.dark .tech-logo[data-has-dark] .tech-logo-path-light {
  display: none;
}
html.dark .tech-logo-path-dark {
  display: inline;
}
</style>
