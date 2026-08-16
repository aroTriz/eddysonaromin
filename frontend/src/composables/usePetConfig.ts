import { reactive } from 'vue'

/**
 * Pet configuration — shared by the navbar toggle (AppShell), the SalaryCat
 * pet itself, and the /aromin/preferences admin page. Persisted in
 * localStorage under `aromin-pet-config`; changes apply instantly because
 * every consumer reads the same reactive singleton.
 */
export interface PetConfig {
  /** Show the pet on public pages (navbar toggle + admin switch). */
  enabled: boolean
  /** Sprite scale multiplier (0.35 small → 0.65 large). */
  scale: number
  /** Walk-speed multiplier (0.6 slow → 1.5 fast). */
  speed: number
  /** Idle/walk/wave/jump animations. When off the pet is a static sprite
   *  (still draggable with gravity). */
  animate: boolean
}

export const DEFAULT_PET_CONFIG: PetConfig = {
  enabled: true,
  scale: 0.5,
  speed: 1,
  animate: true,
}

const STORAGE_KEY = 'aromin-pet-config'

/** Size presets used by the admin page. */
export const PET_SCALE_OPTIONS = [
  { value: 0.35, label: 'small' },
  { value: 0.5, label: 'normal' },
  { value: 0.65, label: 'large' },
] as const

/** Speed presets used by the admin page. */
export const PET_SPEED_OPTIONS = [
  { value: 0.6, label: 'slow' },
  { value: 1, label: 'normal' },
  { value: 1.5, label: 'fast' },
] as const

function readConfig(): PetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const j = JSON.parse(raw) as Partial<PetConfig>
      return {
        enabled: typeof j.enabled === 'boolean' ? j.enabled : DEFAULT_PET_CONFIG.enabled,
        scale: PET_SCALE_OPTIONS.some((o) => o.value === j.scale)
          ? (j.scale as number)
          : DEFAULT_PET_CONFIG.scale,
        speed: PET_SPEED_OPTIONS.some((o) => o.value === j.speed)
          ? (j.speed as number)
          : DEFAULT_PET_CONFIG.speed,
        animate: typeof j.animate === 'boolean' ? j.animate : DEFAULT_PET_CONFIG.animate,
      }
    }
  } catch {
    /* storage unavailable — use defaults */
  }
  return { ...DEFAULT_PET_CONFIG }
}

/** Reactive singleton — every consumer reads the same instance. */
export const petConfig = reactive<PetConfig>(readConfig())

/** Merge a partial update, persist it, and let all consumers react. */
export function updatePetConfig(patch: Partial<PetConfig>): void {
  Object.assign(petConfig, patch)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...petConfig }))
  } catch {
    /* storage unavailable — keep in-session state */
  }
}
