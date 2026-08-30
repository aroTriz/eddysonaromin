import { reactive } from 'vue'

import { getToken } from './useAuth'

/**
 * Pet configuration — the GLOBAL config lives in the backend API
 * (site_settings.pet_settings, edited from the /aromin/pet admin page).
 * The navbar toggle is a per-browser override of `enabled` only. Every
 * consumer (SalaryCat, AppShell, the pet admin page) reads the same
 * reactive singleton, so changes apply instantly.
 */
export interface PetConfig {
  /** Show the pet on public pages (global default). */
  enabled: boolean
  /** When false the pet toggle button is hidden site-wide (admin can disable the pet entirely). */
  globalEnabled: boolean
  /** Sprite scale multiplier (0.35 small → 0.65 large). */
  scale: number
  /** Walk-speed multiplier (0.6 slow → 1.5 fast). */
  speed: number
  /** Idle/walk/wave/jump animations. When off the pet is a static sprite
   *  (still draggable with gravity). */
  animate: boolean
}

export const DEFAULT_PET_CONFIG: PetConfig = {
  // Off by default — everything disabled until the admin enables via preferences.
  enabled: false,
  globalEnabled: false,
  scale: 0.5,
  speed: 1,
  animate: false,
}

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

const API_BASE = '/api/v1'
// v2 keys — the v1 keys held "enabled: true" caches from the earlier
// always-on default; bumping them makes EVERY browser start fresh with the
// new default (off until toggled).
const CACHE_KEY = 'aromin-pet-config-v2'
const LOCAL_ENABLED_KEY = 'aromin-pet-local-enabled-v2' // '0' | '1' | unset

/** Reactive singleton — every consumer reads the same instance. */
export const petConfig = reactive<PetConfig>({ ...DEFAULT_PET_CONFIG })

function readCache(): Partial<PetConfig> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const j = JSON.parse(raw) as Partial<PetConfig>
    return typeof j === 'object' && j !== null ? j : null
  } catch {
    return null
  }
}

function writeCache(): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...petConfig }))
  } catch {
    /* storage unavailable */
  }
}

function readLocalEnabled(): boolean | null {
  try {
    const v = localStorage.getItem(LOCAL_ENABLED_KEY)
    return v === '1' ? true : v === '0' ? false : null
  } catch {
    return null
  }
}

function clearLocalEnabled(): void {
  try {
    localStorage.removeItem(LOCAL_ENABLED_KEY)
  } catch {
    /* storage unavailable */
  }
}

/**
 * Boot — load the GLOBAL config from the API, then apply this browser's
 * local enabled override (from the navbar toggle). Call once at app start;
 * safe to run before the admin login (the endpoint is public).
 */
export async function bootPetConfig(): Promise<void> {
  // Drop the old v1 keys — their "enabled: true" caches would override the
  // new off-by-default behavior for returning visitors.
  try {
    localStorage.removeItem('aromin-pet-config')
    localStorage.removeItem('aromin-pet-local-enabled')
  } catch {
    /* storage unavailable */
  }

  let api: Partial<PetConfig> | null = null
  try {
    const res = await fetch(`${API_BASE}/settings/pet`)
    if (res.ok) api = (await res.json()) as Partial<PetConfig>
  } catch {
    /* offline — fall back to the cached config */
  }

  const base = { ...DEFAULT_PET_CONFIG, ...(api ?? readCache() ?? {}) }
  const local = readLocalEnabled()

  // Apply global config fields first
  petConfig.globalEnabled = base.globalEnabled ?? DEFAULT_PET_CONFIG.globalEnabled
  petConfig.scale = base.scale ?? DEFAULT_PET_CONFIG.scale
  petConfig.speed = base.speed ?? DEFAULT_PET_CONFIG.speed
  petConfig.animate = base.animate ?? DEFAULT_PET_CONFIG.animate

  // Per-browser enabled logic — requested behavior:
  //  - Admin OFF (globalEnabled=false) → hide "toggle pet" button and force pet OFF (enabled=false), clear stale local.
  //  - Admin ON (globalEnabled=true) → only SHOWS the toggle button; pet stays OFF by default (enabled=false)
  //    until the visitor clicks toggle (local=1). Never auto-on for new visitors.
  if (!petConfig.globalEnabled) {
    clearLocalEnabled()
    petConfig.enabled = false
  } else if (local !== null) {
    petConfig.enabled = local
  } else {
    petConfig.enabled = false
  }
  writeCache()
}

/**
 * Admin page — apply the config locally AND persist it globally through
 * the API. Clears the per-browser navbar override so the global value wins.
 */
export async function savePetConfigToApi(): Promise<void> {
  const token = getToken()
  if (!token) return

  const res = await fetch(`${API_BASE}/admin/settings/pet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...petConfig }),
  })
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error ?? 'Failed to save pet settings')
  }

  const saved = (await res.json()) as PetConfig
  Object.assign(petConfig, saved)
  // Admin enabling the pet only shows the toggle button — never auto-enable the cat itself.
  // Visitor must click "toggle pet" to turn it on. Force OFF after every admin save.
  petConfig.enabled = false
  clearLocalEnabled()
  writeCache()
}

/**
 * Navbar toggle — a per-browser on/off for the CURRENT visitor. It never
 * touches the global API config (the admin pet page owns that).
 */
export function togglePetLocal(): void {
  // If the admin has disabled the pet globally, the visitor can't re-enable it
  if (!petConfig.globalEnabled) return
  const next = !petConfig.enabled
  petConfig.enabled = next
  try {
    localStorage.setItem(LOCAL_ENABLED_KEY, next ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
}
