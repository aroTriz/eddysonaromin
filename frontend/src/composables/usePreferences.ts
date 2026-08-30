/**
 * usePreferences — unified preferences composable.
 *
 * All settings are managed as a staged "draft". Toggles change the draft
 * without applying to the live site. "Save Changes" persists everything
 * at once (localStorage + API). "Restore Default" resets the draft to
 * all-OFF defaults.
 *
 * Storage layout:
 *  - rightClick  → localStorage (per-browser)
 *  - chat, backdrop, askTriz, clickMe → D1 via API (global)
 *  - pet config  → D1 via API (global) + reactive singleton
 */
import { computed, ref } from 'vue'

import { isRightClickAllowed, RIGHT_CLICK_KEY } from './useSiteBehavior'
import { bootPetConfig, petConfig, savePetConfigToApi } from './usePetConfig'
import { setAskTrizEnabled, setBackdropEnabled, setClickMeEnabled, setCommunityChatEnabled } from '@/services/adminApi'
import { fetchAskTrizEnabled, fetchBackdropEnabled, fetchClickMeEnabled, fetchCommunityChatEnabled } from '@/services/chatApi'

/* ── Types ─────────────────────────────────────────────────────── */

export interface PrefDraft {
  rightClick: boolean
  chat: boolean
  backdrop: boolean
  askTriz: boolean
  clickMe: boolean
  petEnabled: boolean
  petScale: number
  petSpeed: number
  petAnimate: boolean
}

/* ── Defaults — everything OFF ─────────────────────────────────── */

export const PREF_DEFAULTS: PrefDraft = {
  rightClick: false,
  chat: false,
  backdrop: false,
  askTriz: false,
  clickMe: false,
  petEnabled: false,
  petScale: 0.5,
  petSpeed: 1,
  petAnimate: false,
}

/* ── Module-level singleton state ──────────────────────────────── */

const draft = ref<PrefDraft>({ ...PREF_DEFAULTS })
const savedSnapshot = ref<PrefDraft>({ ...PREF_DEFAULTS })
const loaded = ref(false)
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const hasChanges = computed(
  () => JSON.stringify(draft.value) !== JSON.stringify(savedSnapshot.value),
)

/* ── Composable ────────────────────────────────────────────────── */

export function usePreferences() {
  /** Load all settings from API + localStorage into draft + savedSnapshot. */
  async function loadFromApi(): Promise<void> {
    const [chat, backdrop, clickMe, askTriz] = await Promise.all([
      fetchCommunityChatEnabled(),
      fetchBackdropEnabled(),
      fetchClickMeEnabled(),
      fetchAskTrizEnabled(),
    ])

    // Boot pet config from API (updates the reactive singleton)
    await bootPetConfig()

    const snap: PrefDraft = {
      rightClick: isRightClickAllowed(),
      chat,
      backdrop,
      askTriz,
      clickMe,
      petEnabled: petConfig.globalEnabled,
      petScale: petConfig.scale,
      petSpeed: petConfig.speed,
      petAnimate: petConfig.animate,
    }

    draft.value = { ...snap }
    savedSnapshot.value = { ...snap }
    loaded.value = true
  }

  /** Persist the draft to localStorage + API. */
  async function save(): Promise<void> {
    if (saving.value) return
    saving.value = true
    error.value = ''

    try {
      // 1. Right-click → localStorage
      localStorage.setItem(
        RIGHT_CLICK_KEY,
        draft.value.rightClick ? 'allowed' : 'blocked',
      )

      // 2. Server-side settings → API (parallel)
      await Promise.all([
        setCommunityChatEnabled(draft.value.chat),
        setBackdropEnabled(draft.value.backdrop),
        setClickMeEnabled(draft.value.clickMe),
        setAskTrizEnabled(draft.value.askTriz),
      ])

      // 3. Backdrop change event → SiteBackdrop reacts instantly
      window.dispatchEvent(
        new CustomEvent('backdrop-change', {
          detail: { enabled: draft.value.backdrop },
        }),
      )

      // 4. Pet config → update reactive singleton + save to API
      // Admin ON only shows the toggle button; pet stays OFF until visitor toggles.
      petConfig.globalEnabled = draft.value.petEnabled
      petConfig.enabled = false
      petConfig.scale = draft.value.petScale
      petConfig.speed = draft.value.petSpeed
      petConfig.animate = draft.value.petAnimate
      await savePetConfigToApi()

      // 5. Mark as saved
      savedSnapshot.value = { ...draft.value }
      saved.value = true
      setTimeout(() => { saved.value = false }, 2500)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save preferences.'
    } finally {
      saving.value = false
    }
  }

  /** Reset the draft to all-OFF defaults (does NOT persist). */
  function restoreDefaults(): void {
    draft.value = { ...PREF_DEFAULTS }
  }

  return {
    draft,
    loaded,
    saving,
    saved,
    error,
    hasChanges,
    loadFromApi,
    save,
    restoreDefaults,
    PREF_DEFAULTS,
  }
}
