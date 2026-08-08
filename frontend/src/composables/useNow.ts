import { onScopeDispose, ref } from 'vue'

/**
 * Reactive "now" — ticks every `intervalMs` so relative timestamps
 * ("3 min ago", "edited 2 hr ago") stay synced with the current time
 * without constant re-renders. Used by blog cards / post pages.
 */
export function useNow(intervalMs = 30_000): { now: () => Date } {
  const tick = ref(Date.now())
  const timer = setInterval(() => {
    tick.value = Date.now()
  }, intervalMs)

  onScopeDispose(() => clearInterval(timer))

  return { now: () => new Date(tick.value) }
}
