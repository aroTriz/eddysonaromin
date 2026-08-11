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

/** Apply the `dark` class to <html> — instant switch, no transition. */
function applyClass(pref: ThemePreference): void {
  const root = document.documentElement
  root.classList.toggle('dark', isDark(pref))
  // Release the inline background set by the pre-paint <head> script so the
  // CSS variables in main.css take over from here.
  root.style.backgroundColor = ''
}

/**
 * Greyfolio-style theme switch: add `theme-flip` (suppresses the per-element
 * `transition-colors` burst so cards/borders switch in one atomic paint),
 * force a reflow so the suppression is committed, THEN flip the `dark` class.
 * html/body keep their own 220ms background/color fade (the only animation),
 * everything else snaps instantly. `theme-flip` stays active for the full
 * transition window (Vue's reactive re-renders happen after the class flip,
 * so a single-frame suppression would let them fire) and is then removed so
 * hover/route transitions work normally again.
 */
let flipCleanupTimer: ReturnType<typeof setTimeout> | undefined
/** Releases `theme-flip` on the next pointer move so hover transitions work. */
let flipReleasePointer: (() => void) | undefined

const THEME_FLIP_MS = 1500

function withThemeFlip(pref: ThemePreference): void {
  const root = document.documentElement
  root.classList.add('theme-flip')
  // Force a style/layout flush so `transition: none` is committed before the
  // class flip — otherwise the per-element transitions would still fire.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  void root.offsetHeight
  applyClass(pref)
  const cleanup = (): void => {
    if (flipReleasePointer) {
      window.removeEventListener('pointermove', flipReleasePointer, { capture: true })
      flipReleasePointer = undefined
    }
    root.classList.remove('theme-flip')
  }
  // Removing `transition: none` can make Chromium RESTART canceled transitions
  // on every `transition-colors` element (94 usages across the site) — a
  // visible 220ms burst. So we hold the suppression until the user's NEXT
  // pointer move (they always move the mouse after a theme switch), then drop
  // it cleanly. A timer guarantees release even if no interaction happens.
  if (flipReleasePointer) {
    window.removeEventListener('pointermove', flipReleasePointer, { capture: true })
  }
  flipReleasePointer = cleanup
  window.addEventListener('pointermove', cleanup, { capture: true, once: true })
  clearTimeout(flipCleanupTimer)
  flipCleanupTimer = setTimeout(cleanup, THEME_FLIP_MS)
}

/** Event name broadcast when the theme changes — components listen for it. */
export const THEME_CHANGE_EVENT = 'theme-change'

/** Resolve whether a preference string resolves to dark mode. */
export function resolveIsDark(pref: ThemePreference): boolean {
  return isDark(pref)
}

/**
 * Set the theme preference — greyfolio-style instant switch. The `dark` class
 * flips immediately inside a `theme-flip` suppression window so per-element
 * `transition-colors` utilities can't fire; html/body/ion-app keep their own
 * 220ms background/color fade (the only animation).
 */
export function setTheme(pref: ThemePreference, _event?: MouseEvent): void {
  preference.value = pref
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    /* storage unavailable — still apply in-session */
  }

  withThemeFlip(pref)

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
        withThemeFlip('system')
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
