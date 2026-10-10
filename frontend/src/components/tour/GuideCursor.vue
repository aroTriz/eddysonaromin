<script setup lang="ts">
/**
 * GuideCursor — bryllim.com's guided-tour arrow, ported 1:1.
 * A cursor arrow with an "Eddyson" name tag glides between [data-guide]
 * targets while the tag types each step's message. Desktop + fine pointer
 * + no-preference only (CSS-gated); the engine no-ops elsewhere.
 * Mounted once at the app root (public side) — never in /aromin.
 */
import { ref } from 'vue'

import { useGuideTour } from '@/composables/useGuideTour'

const root = ref<HTMLElement | null>(null)
const tag = ref<HTMLElement | null>(null)
const nameEl = ref<HTMLElement | null>(null)
const clip = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)
const measure = ref<HTMLElement | null>(null)
const caret = ref<HTMLElement | null>(null)
const prompt = ref<HTMLElement | null>(null)

const { replay, dismiss } = useGuideTour({
  root,
  tag,
  nameEl,
  clip,
  inner,
  measure,
  caret,
  prompt,
})
</script>

<template>
  <div id="guideCursor" ref="root" aria-hidden="true">
    <svg class="gc-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path class="gc-rim" d="M5.5 5.5l3.9 11.7 2.2-5.6 5.6-2.2-11.7-3.9z" />
      <path class="gc-body" d="M5.5 5.5l3.9 11.7 2.2-5.6 5.6-2.2-11.7-3.9z" />
    </svg>
    <div ref="tag" class="gc-tag">
      <span ref="nameEl" class="gc-name">Eddyson</span>
      <div ref="clip" class="gc-clip"><div ref="inner" class="gc-text" data-gc-text></div></div>
      <div ref="measure" class="gc-text gc-measure" data-gc-measure></div>
      <span ref="caret" class="gc-caret"></span>
    </div>
  </div>

  <div id="guidePrompt" ref="prompt">
    <button type="button" class="gp-replay" @click="replay">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8a5 5 0 11-1.6-3.7M13 2.5v2.6h-2.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
      take the tour again
    </button>
    <button type="button" class="gp-dismiss" aria-label="Dismiss" @click="dismiss">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
    </button>
  </div>
</template>

<style>
#guideCursor,
#guidePrompt {
  display: none;
}
@media (min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  /* monochrome: ink on paper, so it flips with the theme */
  #guideCursor {
    display: block;
    position: fixed;
    left: 0;
    top: 0;
    z-index: 90;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.45s ease;
    will-change: transform;
  }
  #guideCursor.is-here {
    opacity: 1;
  }
  #guideCursor.is-away {
    opacity: 0;
  }
  .gc-arrow {
    position: absolute;
    left: -4px;
    top: -4px;
    width: 24px;
    height: 24px;
    overflow: visible;
    filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.25));
  }
  .gc-arrow path {
    stroke-linejoin: round;
  }
  .gc-rim {
    stroke: rgb(var(--bg));
    stroke-width: 6.5;
  }
  .gc-body {
    fill: rgb(var(--ink));
    stroke: rgb(var(--ink));
    stroke-width: 4;
  }

  /* name tag that grows into the comment bubble; the corner nearest the arrow stays tight */
  .gc-tag {
    position: absolute;
    left: 0;
    top: 0;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 4px 10px 5px;
    border-radius: 6px 15px 15px 15px;
    background: rgb(var(--ink));
    color: rgb(var(--bg));
    font-family: var(--font-sans);
    white-space: nowrap;
    box-shadow: 0 10px 24px -12px rgb(0 0 0 / 0.5);
    transform: translate(16px, 19px);
    transition:
      transform 0.32s cubic-bezier(0.3, 1.2, 0.4, 1),
      border-radius 0.3s ease;
  }
  #guideCursor.is-up .gc-tag {
    transform: translate(16px, calc(-100% - 1px));
    border-radius: 15px 15px 15px 6px;
  }
  #guideCursor.is-left .gc-tag {
    transform: translate(calc(-100% - 1px), 19px);
    border-radius: 15px 6px 15px 15px;
  }
  #guideCursor.is-up.is-left .gc-tag {
    transform: translate(calc(-100% - 1px), calc(-100% - 1px));
    border-radius: 15px 15px 6px 15px;
  }
  .gc-name {
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1.5;
    letter-spacing: 0.01em;
    transition: opacity 0.25s ease;
  }
  .gc-tag.is-talking .gc-name {
    opacity: 0.6;
  }

  .gc-clip {
    width: 0;
    height: 0;
    overflow: hidden;
    transition:
      width 0.16s cubic-bezier(0.2, 0.8, 0.2, 1),
      height 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .gc-text {
    position: relative;
    width: max-content;
    max-width: 236px;
    padding-top: 1px;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.45;
    white-space: normal;
  }
  .gc-measure {
    position: absolute;
    left: 0;
    top: 0;
    visibility: hidden;
  }
  .gc-ch {
    opacity: 0;
    transition: opacity 0.12s ease;
  }
  .gc-ch.is-on {
    opacity: 1;
  }
  .gc-caret {
    position: absolute;
    left: 0;
    top: 3px;
    width: 1.5px;
    height: 14px;
    border-radius: 1px;
    background: rgb(var(--bg));
    opacity: 0;
    transition:
      transform 0.07s linear,
      opacity 0.2s ease;
  }
  .gc-tag.is-typing .gc-caret {
    opacity: 0.9;
  }

  /* whatever the guide points at lights up as if hovered */
  .gc-hover,
  .gc-hover * {
    color: rgb(var(--ink)) !important;
  }

  /* replay prompt: bottom centre of the content area (the sidebar is 14rem wide) */
  #guidePrompt {
    display: flex;
    align-items: center;
    gap: 2px;
    position: fixed;
    left: calc(50% + 7rem);
    bottom: 20px;
    z-index: 80;
    padding: 3px;
    border: 1px solid rgb(var(--g200));
    border-radius: 9999px;
    background: rgb(var(--bg) / 0.92);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    box-shadow: 0 10px 28px -14px rgb(0 0 0 / 0.35);
    font-family: var(--font-mono);
    opacity: 0;
    visibility: hidden;
    transform: translate(-50%, 10px);
    transition:
      opacity 0.35s ease,
      transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
      visibility 0s linear 0.45s;
  }
  #guidePrompt.is-on {
    opacity: 1;
    visibility: visible;
    transform: translate(-50%, 0);
    transition-delay: 0s;
  }
  .gp-replay {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 8px 5px 10px;
    border-radius: 9999px;
    color: rgb(var(--g500));
    font-size: 11.5px;
    line-height: 1;
  }
  .gp-replay svg {
    width: 12px;
    height: 12px;
  }
  .gp-dismiss {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 9999px;
    color: rgb(var(--g400));
  }
  .gp-dismiss svg {
    width: 10px;
    height: 10px;
  }
  .gp-replay:hover,
  .gp-dismiss:hover {
    background: rgb(var(--g100));
    color: rgb(var(--ink));
  }
}
</style>
