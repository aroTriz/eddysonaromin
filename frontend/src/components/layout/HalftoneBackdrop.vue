<script setup lang="ts">
/**
 * Page-wide halftone dot backdrop — decorative, pointer-events disabled.
 * Mirrors the reference site's fixed textured field behind the content.
 */
</script>

<template>
  <div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0">
    <div class="halftone halftone-wide mask-tr absolute right-0 top-0 h-[70vh] w-[65vw] opacity-[0.16]"></div>
    <div class="halftone mask-bl absolute bottom-0 left-0 h-[60vh] w-[55vw] opacity-[0.13]"></div>
  </div>
</template>
