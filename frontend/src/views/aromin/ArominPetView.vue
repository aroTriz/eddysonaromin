<script setup lang="ts">
/**
 * /aromin/pet — SalaryCat configuration page.
 *
 * The pet's settings live in the BACKEND API (site_settings.pet_settings),
 * so they apply to every visitor. The navbar "pet" toggle (⌘P / Alt+P) is a
 * per-browser quick switch; this page is the global config.
 */
import { Check, LoaderCircle, PawPrint, Save } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import {
  PET_SCALE_OPTIONS,
  PET_SPEED_OPTIONS,
  bootPetConfig,
  petConfig,
  savePetConfigToApi,
} from '@/composables/usePetConfig'

const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const petStatusLabel = computed(() =>
  petConfig.enabled
    ? 'on — the cat roams the public pages (draggable, click to wave)'
    : 'off — visitors don\'t see the cat',
)

// Editing mutates the shared reactive config (the site updates instantly);
// "save" persists it to the API.
const petScale = computed({
  get: () => petConfig.scale,
  set: (v: number) => {
    petConfig.scale = v
    saved.value = false
  },
})
const petSpeed = computed({
  get: () => petConfig.speed,
  set: (v: number) => {
    petConfig.speed = v
    saved.value = false
  },
})
const petAnimate = computed({
  get: () => petConfig.animate,
  set: (v: boolean) => {
    petConfig.animate = v
    saved.value = false
  },
})

function toggleEnabled(): void {
  petConfig.enabled = !petConfig.enabled
  saved.value = false
}

onMounted(async () => {
  // Fetch the latest global config from the API (another tab may have saved).
  await bootPetConfig()
  loading.value = false
})

async function save(): Promise<void> {
  if (saving.value) return
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    await savePetConfigToApi()
    saved.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save pet settings.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AdminLayout active="aromin-pet">
    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="mb-8">
      <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
        pet settings<span class="text-gray-400">.</span>
      </h1>
      <p class="mt-1.5 font-mono text-[12px] text-gray-500">
        // configure the salary cat that roams the site
      </p>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- ── Pet config ─────────────────────────────────────────── -->
    <div v-if="loading" class="h-64 skeleton rounded-xl border border-gray-200 bg-gray-50"></div>

    <section v-else class="rounded-xl border border-gray-200 bg-white p-6">
      <div class="flex items-start justify-between gap-6">
        <div class="min-w-0">
          <div class="flex items-center gap-3">
            <PawPrint class="h-4 w-4 shrink-0 text-gray-400" :stroke-width="1.7" />
            <h2 class="font-mono text-[13px] font-semibold text-ink">Salary Cat</h2>
            <!-- live sprite preview scaled to the chosen size -->
            <img
              src="/pets/salary-cat.webp"
              alt="Salary Cat preview"
              class="rounded-md border border-gray-200 bg-gray-50 object-cover"
              :style="{
                width: `${192 * petConfig.scale}px`,
                height: `${208 * petConfig.scale}px`,
                objectPosition: '0 0',
                imageRendering: 'pixelated',
              }"
            />
          </div>
          <p class="mt-3 max-w-md text-[13px] leading-relaxed text-gray-500">
            The little cat that roams the site&rsquo;s public pages. Visitors can
            drag it around (it falls back down with gravity) and click it to wave.
            Changes here are global — every visitor sees them.
          </p>
          <p class="mt-3 font-mono text-[11px] text-gray-400">
            // {{ petStatusLabel }}
          </p>
          <p class="mt-1.5 font-mono text-[10.5px] text-gray-400">
            // navbar toggle (⌘P / Alt+P) is per-browser only — this page is the global config
          </p>
        </div>

        <!-- Enable switch -->
        <button
          type="button"
          role="switch"
          :aria-checked="petConfig.enabled"
          :aria-label="petConfig.enabled ? 'Hide salary cat' : 'Show salary cat'"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200"
          :class="[
            petConfig.enabled
              ? 'border-gray-400 bg-transparent dark:border-gray-400 dark:bg-transparent'
              : 'border-gray-300 bg-gray-200 dark:border-gray-500 dark:bg-gray-700',
          ]"
          @click="toggleEnabled"
        >
          <span
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 shadow-sm transition-transform duration-200"
            :class="petConfig.enabled ? 'translate-x-[1.5rem]' : 'translate-x-0.5'"
          >
            <Check
              v-if="petConfig.enabled"
              class="h-3 w-3 text-white"
              :stroke-width="3"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>

      <!-- Size / speed / animations -->
      <div class="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="pet-scale">size</label>
          <select
            id="pet-scale"
            v-model="petScale"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
          >
            <option v-for="o in PET_SCALE_OPTIONS" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="pet-speed">walk speed</label>
          <select
            id="pet-speed"
            v-model="petSpeed"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
          >
            <option v-for="o in PET_SPEED_OPTIONS" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="pet-animate">animations</label>
          <select
            id="pet-animate"
            v-model="petAnimate"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400"
          >
            <option :value="true">on</option>
            <option :value="false">off</option>
          </select>
        </div>
      </div>

      <!-- Save -->
      <div class="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          <LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" :stroke-width="1.7" />
          <Save v-else class="h-4 w-4" :stroke-width="1.7" />
          {{ saving ? 'Saving...' : 'Save settings' }}
        </button>
        <p v-if="saved" class="font-mono text-[11px] text-green-600" role="status">
          // saved — applies to the whole site
        </p>
      </div>
    </section>

    <div class="mt-8 flex items-center gap-2 font-mono text-[10.5px] text-gray-400">
      <PawPrint class="h-3.5 w-3.5" :stroke-width="1.7" />
      drag the cat on the site · click it to wave · ⌘P / Alt+P toggles it per browser
    </div>
  </AdminLayout>
</template>
