<script setup lang="ts">
/**
 * Reveal — fade-up entrance animation on mount, mirroring the reference's
 * staggered `.reveal` / `.d1`–`.d5` classes. `delay` maps to d1..d5.
 */
const props = withDefaults(
  defineProps<{
    /** Stagger index: 0..4 maps to the d1..d5 animation delays. */
    delay?: number
  }>(),
  { delay: 0 },
)

const delayClass = ['', 'd1', 'd2', 'd3', 'd4', 'd5'][Math.min(props.delay, 5)] ?? ''
</script>

<template>
  <div class="reveal" :class="delayClass">
    <slot />
  </div>
</template>
