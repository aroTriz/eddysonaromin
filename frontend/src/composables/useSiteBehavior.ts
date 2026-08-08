import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Site-wide behavior: right-click protection — blocks contextmenu and shows
 * a small toast in the top-right corner ("// right click disabled") styled
 * like the site. Applied globally from App.vue.
 */

const TOAST_MS = 1800

const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | undefined

/** Show the "right click disabled" toast in the top-right corner. */
function showToast(): void {
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, TOAST_MS)
}

function onContextMenu(e: MouseEvent): void {
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
