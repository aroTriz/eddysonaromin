<template>
  <div
    class="phone"
    :style="phoneStyle"
    role="img"
    aria-label="Eddyson Aromin profile terminal"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <!-- Front: profile.sh with theme video -->
    <div class="phone-face phone-front">
      <div class="terminal-bar">
        <span class="dot-red"></span>
        <span class="dot-yellow"></span>
        <span class="dot-green"></span>
        <span class="terminal-title">profile.sh</span>
      </div>
      <div class="face-body">
        <div class="video-container">
          <video
            ref="videoRef"
            class="theme-video"
            muted
            playsinline
            preload="auto"
            @ended="onVideoEnded"
          ></video>
        </div>
        <div class="face-footer">
          <span class="fp">$</span>
          <span class="fc">whoami</span>
          <span class="fr">// eddyson_aromin</span>
        </div>
      </div>
    </div>

    <!-- Back: contact.json -->
    <div class="phone-face phone-back">
      <div class="terminal-bar">
        <span class="dot-red"></span>
        <span class="dot-yellow"></span>
        <span class="dot-green"></span>
        <span class="terminal-title">contact.json</span>
      </div>
      <div class="face-body back-body">
        <div class="back-content">
          <a
            v-for="row in contactRows"
            :key="row.label"
            :href="row.href ?? undefined"
            :target="row.external ? '_blank' : undefined"
            :rel="row.external ? 'noopener noreferrer' : undefined"
            class="br"
          >
            <span class="bl">{{ row.label }}</span>
            <span class="bv">{{ row.value }}</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ProfileVideo — 3D-flippable terminal card with a theme-triggered video:
 *  - Light theme → plays profile-forward.mp4 (light-colored profile)
 *  - Dark theme  → plays profile-reverse.mp4 (dark profile)
 * Draggable to flip between profile.sh and contact.json.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { profile } from '@/data/profile'
import { THEME_CHANGE_EVENT, resolveIsDark } from '@/composables/useTheme'
import type { ThemePreference } from '@/composables/useTheme'

const contactRows = [
  { label: 'email', value: profile.email, href: `mailto:${profile.email}`, external: false },
  { label: 'phone', value: profile.phone, href: `tel:${profile.phone.replace(/\s/g, '')}`, external: false },
  { label: 'location', value: profile.location, href: null as string | null, external: false },
  { label: 'github', value: 'github.com/EddysonA15', href: profile.github, external: true },
  { label: 'linkedin', value: '/in/eddyson-tristan-aromin', href: profile.linkedin, external: true },
]

/* ── 3D drag/flip state ─────────────────────────────────── */
const ox = ref(0)
const oy = ref(0)
const sx = ref(0)
const sy = ref(0)
const rx = ref(0)
const ry = ref(0)
const down = ref(false)
const snap = ref(false)

const phoneStyle = computed(() => ({
  transform: `translate(${ox.value}px,${oy.value}px) rotateX(${rx.value}deg) rotateY(${ry.value}deg)`,
  transition: snap.value ? 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
  cursor: down.value ? 'grabbing' : 'grab',
  zIndex: down.value ? 999 : 1,
}))

function onPointerDown(e: PointerEvent): void {
  down.value = true
  snap.value = false
  sx.value = e.clientX - ox.value
  sy.value = e.clientY - oy.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function onPointerMove(e: PointerEvent): void {
  if (!down.value) return
  ox.value = e.clientX - sx.value
  oy.value = e.clientY - sy.value
  rx.value = -(oy.value / 300) * 180
  ry.value = (ox.value / 300) * 180
}
function onPointerUp(): void {
  if (!down.value) return
  down.value = false
  snap.value = true
  ox.value = 0
  oy.value = 0
  rx.value = 0
  ry.value = 0
  setTimeout(() => {
    snap.value = false
  }, 600)
}

/* ── Theme-triggered video ──────────────────────────────── */
const videoRef = ref<HTMLVideoElement | null>(null)
let activeVideoLoad: (() => void) | null = null
let themeListener: ((e: Event) => void) | null = null

function onVideoEnded(): void {
  // Video finished — stays at last frame
}

function playVideo(src: string): void {
  const v = videoRef.value
  if (!v) return

  if (activeVideoLoad) {
    activeVideoLoad()
    activeVideoLoad = null
  }

  v.pause()
  v.style.opacity = '0'

  v.src = src
  v.load()

  let cancelled = false
  activeVideoLoad = () => {
    cancelled = true
  }

  const onReady = (): void => {
    v.removeEventListener('canplay', onReady)
    activeVideoLoad = null
    if (cancelled) return
    v.style.opacity = '1'
    v.play().catch(() => {})
  }

  v.addEventListener('canplay', onReady, { once: true })
}

function playForward(): void {
  playVideo('/videos/profile-forward.mp4')
}
function playReverse(): void {
  playVideo('/videos/profile-reverse.mp4')
}

function handleThemeChange(dark: boolean): void {
  if (dark) playReverse()
  else playForward()
}

function currentThemeIsDark(): boolean {
  const stored = (localStorage.getItem('theme') ?? 'light') as ThemePreference
  return resolveIsDark(stored)
}

onMounted(() => {
  const v = videoRef.value
  if (!v) return
  const dark = currentThemeIsDark()

  // Show the correct static frame instantly, then play the transition
  // when the theme changes.
  function seekEnd(): void {
    if (!v) return
    const onSeeked = (): void => {
      v.removeEventListener('seeked', onSeeked)
      v.style.opacity = '1'
    }
    v.addEventListener('seeked', onSeeked, { once: true })
    v.currentTime = v.duration || 999
  }

  v.preload = 'auto'
  v.src = dark ? '/videos/profile-reverse.mp4' : '/videos/profile-forward.mp4'
  v.load()

  if (v.readyState >= 2) {
    seekEnd()
  } else {
    v.addEventListener('loadeddata', seekEnd, { once: true })
    v.addEventListener('canplay', seekEnd, { once: true })
  }

  const onThemeChange = (e: Event): void => {
    const dark = (e as CustomEvent).detail?.dark
    if (typeof dark === 'boolean') handleThemeChange(dark)
  }
  themeListener = onThemeChange
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange)
})

onUnmounted(() => {
  if (themeListener) {
    window.removeEventListener(THEME_CHANGE_EVENT, themeListener)
    themeListener = null
  }
})
</script>

<style scoped>
.phone {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  perspective: 1000px;
  touch-action: none;
  user-select: none;
  will-change: transform;
}
.phone-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 26px 55px -22px rgba(10, 10, 10, 0.3),
    0 0 0 1px rgb(var(--g200));
  background: rgb(var(--bg));
}
.phone-back {
  transform: rotateY(180deg);
}
.terminal-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgb(var(--g100));
  border-bottom: 1px solid rgb(var(--g200));
  flex-shrink: 0;
}
.terminal-title {
  margin-left: 16px;
  font-size: 12px;
  color: rgb(var(--g500));
  font-family: var(--font-mono);
}
.dot-red,
.dot-yellow,
.dot-green {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-red {
  background: #ff5f57;
}
.dot-yellow {
  background: #ffbd2e;
}
.dot-green {
  background: #28c840;
}
.face-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.video-container {
  position: relative;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
.theme-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  pointer-events: none;
  transform: scale(1.15);
}
.face-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 10px 16px;
  background: rgb(var(--g100));
  border-top: 1px solid rgb(var(--g200));
  flex-shrink: 0;
  font-family: var(--font-mono);
}
.fp {
  color: rgb(var(--ink));
  font-weight: 700;
}
.fc {
  color: rgb(var(--ink));
  font-weight: 500;
}
.fr {
  color: rgb(var(--g500));
  font-style: italic;
}
.back-body {
  align-items: center;
  justify-content: center;
}
.back-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  width: 100%;
}
.br {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-left: 2px solid rgb(var(--g300));
  transition: border-color 0.2s;
}
.br:hover {
  border-left-color: rgb(var(--ink));
}
.bl {
  font-size: 11px;
  color: rgb(var(--g500));
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.bv {
  font-size: 13px;
  color: rgb(var(--ink));
  font-family: var(--font-mono);
  word-break: break-all;
}
</style>
