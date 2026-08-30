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

/** Sync the <meta name="theme-color"> so mobile browser chrome matches the theme. */
function syncMetaThemeColor(dark: boolean): void {
  try {
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (meta) meta.content = dark ? '#0c0c0f' : '#ffffff'
  } catch {}
}

/**
 * Toggle the `dark` class on <html> and release the inline background set by
 * the pre-paint <head> script so the CSS variables in main.css take over.
 */
function applyClass(pref: ThemePreference): void {
  const dark = isDark(pref)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.style.backgroundColor = ''
  syncMetaThemeColor(dark)
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
          // Bryllim exact: 540ms + .32,.08,.24,1 — keep it for reference smoothness
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
let animT: ReturnType<typeof setTimeout> | undefined

function crossfade(pref: ThemePreference): void {
  // Fallback / coordinated crossfade like bryllim — html.theme-anim drives
  // background/border/color for 520ms, then cleans up. Also used when the
  // new pref is already the current dark state (no visual flip needed).
  const root = document.documentElement
  root.classList.add('theme-anim')
  preference.value = pref
  applyClass(pref)
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { dark: isDark(pref) } }))
  clearTimeout(animT)
  animT = setTimeout(() => root.classList.remove('theme-anim'), 520)
}

async function applyThemeTransition(pref: ThemePreference, event?: MouseEvent): Promise<void> {
  setRevealOrigin(event)
  const doc = document as ViewTransitionDoc

  // No visual change needed — just sync the active pill state
  if (isDark(pref) === document.documentElement.classList.contains('dark')) {
    preference.value = pref
    applyClass(pref)
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { dark: isDark(pref) } }))
    await nextTick()
    return
  }

  const flip = async (): Promise<void> => {
    preference.value = pref
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
      const vt = (document as ViewTransitionDoc).startViewTransition!(flip)
      animateCircleReveal(vt)
      await Promise.race([
        vt.finished.catch(() => {}),
        new Promise<void>((res) => setTimeout(res, 900)),
      ])
    } finally {
      transitioning = false
    }
  } else {
    // Fallback / mid-flight / hidden / reduced-motion → bryllim crossfade (smooth 520ms)
    // No View Transition to avoid stacking; theme-anim handles the tail
    crossfade(pref)
  }
}

/**
 * Set the theme preference — smooth View-Transition flip (or instant swap
 * when the browser doesn't support it / reduced motion is on).
 */
export function setTheme(pref: ThemePreference, event?: MouseEvent): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {}
  const x = (event && (event as MouseEvent).clientX) || window.innerWidth
  const y = (event && (event as MouseEvent).clientY) || window.innerHeight
  // Pass coordinates through for the clip origin (bryllim pattern)
  const ev = { clientX: x, clientY: y } as unknown as MouseEvent
  void applyThemeTransition(pref, ev)
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
