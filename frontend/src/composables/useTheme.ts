import { getCurrentInstance, onScopeDispose, ref, watchEffect } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'

/**
 * System-theme daylight window (local time):
 *   light  → 7:00 AM – 5:59 PM
 *   dark   → 6:00 PM – 6:59 AM
 */
const DAYLIGHT_START_HOUR = 7
const DAYLIGHT_END_HOUR = 18

/** Whether the current local time falls inside the daylight window. */
function isDaylight(now = new Date()): boolean {
  const hour = now.getHours()
  return hour >= DAYLIGHT_START_HOUR && hour < DAYLIGHT_END_HOUR
}

/** Resolve whether a preference resolves to dark mode. */
function isDark(pref: ThemePreference): boolean {
  return (
    pref === 'dark' ||
    (pref === 'system' && !isDaylight())
  )
}

/** Read the persisted preference, defaulting to "dark" on first visit. */
function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' || stored === 'light' || stored === 'system'
      ? stored
      : 'dark'
  } catch {
    return 'dark'
  }
}

const preference = ref<ThemePreference>(readPreference())

/** Apply the `dark` class to <html> without any transition. */
function applyClass(pref: ThemePreference): void {
  const root = document.documentElement
  root.classList.toggle('dark', isDark(pref))
  // Release the inline background set by the pre-paint <head> script so the
  // CSS variables in main.css take over from here.
  root.style.backgroundColor = ''
}

/** Soft crossfade fallback (browsers without View Transitions / reduced motion). */
let animTimer: ReturnType<typeof setTimeout> | undefined

function crossfade(pref: ThemePreference): void {
  const root = document.documentElement
  root.classList.add('theme-anim')
  applyClass(pref)
  clearTimeout(animTimer)
  animTimer = setTimeout(() => root.classList.remove('theme-anim'), 520)
}

/**
 * Circular wipe that works even when the browser skips View Transitions
 * (e.g. the tab is occluded/behind other windows — Chromium aborts VT there,
 * freezing the clip animation at 0ms). We can't snapshot the old page without
 * VT, so we play a "reverse ripple": an overlay of the OLD background color
 * shrinks from the full screen down to the pointer, revealing the already-
 * flipped new theme underneath. Visually the same circular feel as bryllim.
 */
function rippleFallback(
  root: HTMLElement,
  oldBg: string,
  x: number,
  y: number,
  radius: number,
): void {
  if (!oldBg || oldBg === 'transparent' || oldBg === 'rgba(0, 0, 0, 0)') return
  const overlay = document.createElement('div')
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:' +
    oldBg +
    ';'
  root.appendChild(overlay)
  try {
    overlay
      .animate(
        {
          clipPath: [
            `circle(${radius}px at ${x}px ${y}px)`,
            `circle(0px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 540,
          easing: 'cubic-bezier(.32,.08,.24,1)',
        },
      )
      .onfinish = () => overlay.remove()
    // Safety: never leave a stuck overlay behind.
    setTimeout(() => overlay.remove(), 700)
  } catch {
    overlay.remove()
  }
}

/** Circular wipe reveal from the pointer — bryllim's exact transition. */
function reveal(pref: ThemePreference, x: number, y: number): void {
  const root = document.documentElement
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )

  const startViewTransition = (
    document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> }
    }
  ).startViewTransition

  if (!startViewTransition) {
    crossfade(pref)
    return
  }

  const oldBg = getComputedStyle(root).backgroundColor
  const vt = startViewTransition.call(document, () => applyClass(pref))

  // Timing varies by Chromium build: in some the ::view-transition-new(root)
  // pseudo already exists the moment startViewTransition returns, in others it
  // is only created on the next frame. Try synchronously first, then retry on
  // the next frame.
  const clip = (): boolean => {
    try {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 540,
          easing: 'cubic-bezier(.32,.08,.24,1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
      return true
    } catch {
      return false
    }
  }

  let fellBack = false
  const fallback = (): void => {
    if (fellBack) return
    fellBack = true
    if (document.hidden) {
      // Animations are frozen while the tab is hidden/occluded — wait until it
      // becomes visible again, then play the ripple so the user still sees it.
      const onVisible = (): void => {
        if (document.hidden) return
        document.removeEventListener('visibilitychange', onVisible)
        rippleFallback(root, oldBg, x, y, radius)
      }
      document.addEventListener('visibilitychange', onVisible)
    } else {
      rippleFallback(root, oldBg, x, y, radius)
    }
  }

  if (!clip()) {
    requestAnimationFrame(() => {
      if (!clip()) fallback()
    })
  }

  // If the browser skipped/aborted the transition (hidden/occluded tab), the
  // VT clip animation never advances — swap in the CSS ripple fallback.
  if (vt?.ready) {
    vt.ready.catch(() => fallback())
  }
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Event name broadcast when the theme changes — components listen for it. */
export const THEME_CHANGE_EVENT = 'theme-change'

/** Resolve whether a preference string resolves to dark mode. */
export function resolveIsDark(pref: ThemePreference): boolean {
  return isDark(pref)
}

/**
 * Set the theme preference. When the resolved light/dark state changes, the
 * whole page's colors blend smoothly in place (coordinated crossfade — the
 * same approach bryllim falls back to). Live content like the tech marquee
 * keeps moving — nothing is frozen by a snapshot.
 */
export function setTheme(pref: ThemePreference, event?: MouseEvent): void {
  preference.value = pref
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    /* storage unavailable — still apply in-session */
  }

  const flipped = isDark(pref) !== document.documentElement.classList.contains('dark')
  if (!flipped) return

  if (prefersReducedMotion) {
    crossfade(pref)
  } else {
    const x = event?.clientX || window.innerWidth
    const y = event?.clientY || window.innerHeight
    reveal(pref, x, y)
  }

  // Notify components (e.g. the theme video) that dark state changed.
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { dark: isDark(pref) } }))
}

/**
 * Reactive theme composable. Apply `class="dark"` on <html> automatically
 * based on the user's preference. In "system" mode the theme follows the
 * current time of day (light during daylight hours, dark at night) and
 * flips automatically at dawn/dusk.
 */
export function useTheme() {
  watchEffect(() => applyClass(preference.value))

  let timer: ReturnType<typeof setInterval> | undefined

  if (typeof window !== 'undefined') {
    // In "system" mode, re-evaluate every 30s so the theme adapts to the
    // current time (auto-flips at 7:00 AM and 6:00 PM local time).
    timer = setInterval(() => {
      if (preference.value !== 'system') return
      const dark = isDark('system')
      const applied = document.documentElement.classList.contains('dark')
      if (dark !== applied) {
        applyClass('system')
        window.dispatchEvent(
          new CustomEvent(THEME_CHANGE_EVENT, { detail: { dark } }),
        )
      }
    }, 30_000)
  }

  // Clean up the timer when the app is disposed (HMR safety).
  const vm = getCurrentInstance()
  vm && onScopeDispose(() => clearInterval(timer))

  return {
    preference,
    setTheme,
    isDaylight,
  }
}
