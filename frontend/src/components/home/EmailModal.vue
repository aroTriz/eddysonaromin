<script setup lang="ts">
/**
 * EmailModal — bryllim-style "say hello" modal.
 * Triggered from the hero's "email" link. Contains the email with
 * a Copy button (with flash feedback) and an "Open mail app" button.
 */
import { Check, Copy, X } from 'lucide-vue-next'
import { ref } from 'vue'

import { profile } from '@/data/profile'

const open = ref(false)
const copied = ref(false)

/** Opens Gmail's compose window directly, addressed to the profile email. */
const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}`

let copyTimer: ReturnType<typeof setTimeout> | undefined

function openModal(): void {
  open.value = true
  document.documentElement.style.overflow = 'hidden'
}

function closeModal(): void {
  open.value = false
  copied.value = false
  document.documentElement.style.overflow = ''
}

async function copyEmail(): Promise<void> {
  try {
    await navigator.clipboard.writeText(profile.email)
  } catch {
    // fallback for older browsers
    const ta = document.createElement('textarea')
    ta.value = profile.email
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
  }, 1500)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeModal()
}

defineExpose({ openModal })
</script>

<template>
  <!-- Trigger is the "email" link in the hero socials (wired externally).
       This component renders the modal + handles the copy logic. -->

  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Get in touch"
      @keydown="onKeydown"
    >
      <!-- blurred backdrop — pure blur, no dark overlay -->
      <div
        class="absolute inset-0 bg-transparent backdrop-blur-md"
        @click="closeModal"
      ></div>

      <!-- email panel — themed surface (white in light, dark in dark) -->
      <div
        class="relative w-full max-w-sm scale-100 rounded-2xl border border-gray-200 bg-white p-7 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.35)] transition-all duration-200"
      >
        <button
          type="button"
          class="absolute right-4 top-4 text-gray-400 hover:text-ink"
          aria-label="Close"
          @click="closeModal"
        >
          <X class="h-4 w-4" :stroke-width="1.5" />
        </button>

        <p class="font-mono text-[11px] uppercase tracking-wider text-gray-400">Get in touch</p>
        <h2 class="mt-3 font-pixel text-xl leading-none">say hello</h2>
        <p class="mt-3 text-[14px] leading-relaxed text-gray-600">
          For work, collabs, or just to say hi — drop me a line.
        </p>

        <div class="mt-5 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1.5">
          <span class="flex-1 truncate px-2 font-mono text-[13px] text-ink">{{ profile.email }}</span>
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-800"
            @click="copyEmail"
          >
            <Check v-if="copied" class="h-3.5 w-3.5" :stroke-width="2" />
            <Copy v-else class="h-3.5 w-3.5" :stroke-width="2" />
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
        </div>

        <a
          :href="gmailComposeUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-ink hover:border-ink"
        >
          Open mail app
        </a>
      </div>
    </div>
  </Teleport>
</template>
