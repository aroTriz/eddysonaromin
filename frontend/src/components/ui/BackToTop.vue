<script setup lang="ts">
/**
 * BackToTop — circular glassmorphic button (lucide ArrowUp, stroke 2, same
 * as the page arrows) that appears after scrolling past one viewport.
 * Mounted once on the public side (App.vue) so EVERY long public page gets
 * it; short pages never reach the threshold so it stays hidden by itself.
 */
import { ArrowUp } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'

const SHOW_AFTER = 600

const visible = ref(false)
let ticking = false

function onScroll(): void {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    visible.value = window.scrollY > SHOW_AFTER
  })
}

function goTop(): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <button
    type="button"
    class="back-top"
    :class="{ 'is-on': visible }"
    aria-label="Back to top"
    title="Back to top"
    @click="goTop"
  >
    <ArrowUp class="h-5 w-5" :stroke-width="2" />
  </button>
</template>

<style scoped>
.back-top {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 40;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem; /* 44px touch target */
  height: 2.75rem;
  border-radius: 9999px;
  border: 1px solid rgb(var(--g200) / 0.7);
  background: rgb(var(--bg) / 0.55);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  color: rgb(var(--ink));
  box-shadow: 0 10px 28px -14px rgb(0 0 0 / 0.35);
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition:
    opacity 0.3s ease,
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    visibility 0s linear 0.35s,
    background-color 0.2s ease,
    color 0.2s ease;
}
.back-top.is-on {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition-delay: 0s;
}
.back-top:hover {
  background: rgb(var(--ink));
  color: rgb(var(--bg));
}
@media (min-width: 1024px) {
  .back-top {
    right: 2rem;
    bottom: 2rem;
  }
}
</style>
