import { nextTick, ref } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'

/**
 * System-theme daylight window (local time):
 *   light  → 7:00 AM – 5:59 PM
 *   dark   → 6:00 PM – 6:59 AM
 */
const DAYLIGHT_START_HOUR = 7
const DAYLIGHT_END_HOUR = 18

const preference = ref<ThemePreference>(readPreference())

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

/** Read the persisted preference, defaulting to "light" on first visit. */
function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' || stored === 'light' || stored === 'system'
      ? stored
      : 'light'
  } catch {
    return 'light'
  }
}

/** Event name broadcast when the theme changes — components listen for it. */
export const THEME_CHANGE_EVENT = 'theme-change'

/** Resolve whether a preference string resolves to dark mode. */
export function resolveIsDark(pref: ThemePreference): boolean {
  return isDark(pref)
}

/**
 * Toggle the `dark` class on <html> and release the inline background set by
 * the pre-paint <head> script so the CSS variables in main.css take over.
 */
function applyClass(pref: ThemePreference): void {
  const root = document.documentElement
  root.classList.toggle('dark', isDark(pref))
  root.style.backgroundColor = ''
}

/* ── Smooth theme flip — View Transitions API ─────────────────────────
   Instead of firing hundreds of per-element `transition-colors` (the old
   approach, which needed a `theme-flip` suppression hack and still felt
   abrupt + janky), we let the browser capture a screenshot of the OLD
   theme, apply the new one, and cross-fade the two snapshots on the GPU
   compositor. One atomic paint, zero per-element transitions = smooth AND
   cheap. The circular reveal grows from the click origin — animated via
   the Web Animations API directly on the `::view-transition-new(root)`
   pseudo-element (bryllim.com's exact technique): an exact pixel radius
   computed from the click point, so the wipe always covers the viewport.
   Falls back to an instant swap when the API is missing or the user
   prefers reduced motion.
   ───────────────────────────────────────────────────────────────────── */
interface ViewTransitionLike {
  finished: Promise<void>
  ready: Promise<void>
  skipTransition: () => void
}
type ViewTransitionDoc = Document & {
  startViewTransition?: (updateCallback: () => Promise<void> | void) => ViewTransitionLike
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    : false
}

/** Keep the last click point — the circle reveal must grow from here. */
let revealX = 0
let revealY = 0

/** Anchor the circular reveal at the click position (defaults to center). */
function setRevealOrigin(event?: MouseEvent): void {
  if (!event) return
  revealX = event.clientX
  revealY = event.clientY
  const root = document.documentElement
  root.style.setProperty('--theme-origin-x', `${revealX}px`)
  root.style.setProperty('--theme-origin-y', `${revealY}px`)
}

/**
 * Animate the circular wipe on the NEW root snapshot — the exact bryllim
 * technique. Runs after `vt.ready` (when the pseudo-element exists), so the
 * browser's own snapshot cross-fade is replaced by a clip-path circle that
 * grows from the click point until it covers the whole viewport.
 */
function animateCircleReveal(vt: ViewTransitionLike): void {
  const root = document.documentElement
  // Distance from the click point to the FARTHEST corner of the viewport —
  // the radius that guarantees the circle fully covers the screen.
  const r = Math.hypot(
    Math.max(revealX, window.innerWidth - revealX),
    Math.max(revealY, window.innerHeight - revealY),
  )
  vt.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${revealX}px ${revealY}px)`,
            `circle(${r}px at ${revealX}px ${revealY}px)`,
          ],
        },
        {
          duration: 540,
          easing: 'cubic-bezier(0.32, 0.08, 0.24, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    .catch(() => {})
}

/** Guard — never stack two flips on top of each other (system timer + click). */
let transitioning = false

/**
 * Flip the theme inside a View Transition. Sequence inside the callback:
 *  1. apply the `dark` class,
 *  2. broadcast THEME_CHANGE_EVENT so components (theme video, ripple ink,
 *     backdrop swap) update in the same frame,
 *  3. await nextTick() so Vue's re-render is captured in the NEW snapshot.
 *
 * Correctness invariant: by the time this resolves, the `dark` class on
 * <html> ALWAYS matches `pref`. If a transition is already in flight (or the
 * tab is hidden / the API is unavailable / reduced motion), we skip the
 * animation but STILL apply the class instantly — a quick double-toggle can
 * never leave the page's theme desynced from its preference (that desync is
 * what used to make the backdrop particles disappear until a refresh).
 */
async function applyThemeTransition(pref: ThemePreference, event?: MouseEvent): Promise<void> {
  setRevealOrigin(event)
  const doc = document as ViewTransitionDoc

  const flip = async (): Promise<void> => {
    applyClass(pref)
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { dark: isDark(pref) } }))
    await nextTick()
  }

  const canAnimate =
    typeof doc.startViewTransition === 'function' &&
    !prefersReducedMotion() &&
    document.visibilityState === 'visible'

  if (canAnimate && !transitioning) {
    transitioning = true
    try {
      const vt = doc.startViewTransition(flip)
      // Circular wipe from the click point (bryllim technique) — animate the
      // `::view-transition-new(root)` pseudo-element via the Web Animations API.
      animateCircleReveal(vt)
      // Race with a timeout so a stalled transition (e.g. the tab hid
      // mid-flip) can NEVER wedge the guard — worst case we lose the
      // animation, never the theme application.
      await Promise.race([
        vt.finished.catch(() => {}),
        new Promise<void>((res) => setTimeout(res, 1200)),
      ])
    } finally {
      transitioning = false
    }
  } else {
    // Mid-flight flip, hidden tab, reduced motion, or no API support —
    // apply instantly, no animation. The class still lands.
    await flip()
  }
}

/**
 * Set the theme preference — smooth View-Transition flip (or instant swap
 * when the browser doesn't support it / reduced motion is on).
 */
export function setTheme(pref: ThemePreference, event?: MouseEvent): void {
  preference.value = pref
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    /* storage unavailable — still apply in-session */
  }
  void applyThemeTransition(pref, event)
}

/* ── System-mode daylight timer (single instance, app lifetime) ─────── */
let systemTimer: ReturnType<typeof setInterval> | undefined

function ensureSystemTimer(): void {
  if (systemTimer !== undefined || typeof window === 'undefined') return
  systemTimer = setInterval(() => {
    if (preference.value !== 'system') return
    const dark = isDark('system')
    const applied = document.documentElement.classList.contains('dark')
    if (dark !== applied) {
      void applyThemeTransition('system')
    }
  }, 30_000)
}

/**
 * Reactive theme composable. Apply `class="dark"` on <html> automatically
 * based on the user's preference. In "system" mode the theme follows the
 * current time of day and flips automatically at dawn/dusk — through the
 * same smooth View Transition.
 */
export function useTheme() {
  // Apply the persisted preference immediately (the pre-paint script in
  // index.html already set the class; this also releases the inline bg).
  applyClass(preference.value)
  ensureSystemTimer()

  return {
    preference,
    setTheme,
    isDaylight,
  }
}
