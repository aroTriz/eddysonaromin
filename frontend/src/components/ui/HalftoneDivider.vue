<script setup lang="ts">
/**
 * HalftoneDivider — bryllim.com's halftone section divider, 1:1.
 * A fading dot-field strip used between major home sections and as the
 * bottom fade before the footer. Theme-aware via the --halftone token.
 *
 * Variants mirror bryllim exactly:
 *  - default: h-6, opacity 0.18 (between sections)
 *  - tall:    h-10, opacity 0.15 (bottom fade before the footer)
 */
withDefaults(
  defineProps<{
    /** Bottom-fade variant (taller, softer) instead of the section divider. */
    tall?: boolean
  }>(),
  { tall: false },
)
</script>

<template>
  <div
    aria-hidden="true"
    class="halftone halftone-wide mask-fade-x w-full"
    :class="tall ? 'mb-16 mt-2 h-10 opacity-[0.15]' : 'my-2 h-6 opacity-[0.18]'"
  ></div>
</template>
