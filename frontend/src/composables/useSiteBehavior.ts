import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Site-wide behavior: right-click protection — blocks contextmenu and shows
 * a small toast in the top-right corner ("// right click disabled") styled
 * like the site. Applied globally from App.vue.
 *
 * The protection can be toggled from the admin Preferences page
 * (/aromin/preferences). The setting is stored in localStorage under
 * RIGHT_CLICK_KEY ('allowed' = right-click works normally; anything else —
 * the default — keeps the protection active).
 */

const TOAST_MS = 1800

/** localStorage key for the "enable right click" preference. */
export const RIGHT_CLICK_KEY = 'aromin-right-click'

/** Value that means "right-click is allowed". Any other value keeps it blocked. */
const ALLOWED = 'allowed'

const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | undefined

/** Whether right-click is currently allowed (reads live, so admin changes apply instantly). */
export function isRightClickAllowed(): boolean {
  try {
    return localStorage.getItem(RIGHT_CLICK_KEY) === ALLOWED
  } catch {
    return false
  }
}

/** Show the "right click disabled" toast in the top-right corner. */
function showToast(): void {
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, TOAST_MS)
}

function onContextMenu(e: MouseEvent): void {
  if (isRightClickAllowed()) return
  e.preventDefault()
  showToast()
}

export function useSiteBehavior() {
  onMounted(() => {
    if (typeof window === 'undefined') return
    document.addEventListener('contextmenu', onContextMenu)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('contextmenu', onContextMenu)
    clearTimeout(toastTimer)
  })

  return { toastVisible }
}
