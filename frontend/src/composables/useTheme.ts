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

/** Soft crossfade — the whole page's colors blend in place (bryllim-style
 * fallback). Live elements like the tech marquee keep moving. */
let animTimer: ReturnType<typeof setTimeout> | undefined

function crossfade(pref: ThemePreference): void {
  const root = document.documentElement
  root.classList.add('theme-anim')
  applyClass(pref)
  clearTimeout(animTimer)
  animTimer = setTimeout(() => root.classList.remove('theme-anim'), 520)
}

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

  void event
  crossfade(pref)

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
