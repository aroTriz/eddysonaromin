<script setup lang="ts">
/**
 * /aromin — admin login. Username + password, then a 6-digit OTP sent to
 * aromintristan@gmail.com via Resend (free tier). Dark, mono, terminal-styled
 * to match the site's design language.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, User } from 'lucide-vue-next'

import { requestOtp, verifyOtp } from '@/composables/useAuth'
import StarsThree from '@/components/ui/StarsThree.vue'
import ThemeSwitch from '@/components/ui/ThemeSwitch.vue'

const router = useRouter()

const username = ref('')
const password = ref('')
const showPass = ref(false)
const error = ref('')
const busy = ref(false)

// OTP state
const showOtp = ref(false)
const otp = ref(['', '', '', '', '', ''])
const otpRefs = ref<(HTMLInputElement | null)[]>([])
const otpError = ref('')
const storedUser = ref('')
const otpTimer = ref(0)
const verifying = ref(false)
let timerInterval: ReturnType<typeof setInterval> | null = null

function startTimer(): void {
  otpTimer.value = 300 // 5 minutes
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    otpTimer.value--
    if (otpTimer.value <= 0 && timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }, 1000)
}

async function handleLogin(): Promise<void> {
  if (!username.value.trim() || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }
  error.value = ''
  busy.value = true
  const result = await requestOtp(username.value.trim(), password.value)
  busy.value = false

  if (!result.success) {
    error.value = result.error || 'Login failed'
    return
  }

  storedUser.value = username.value.trim()
  otp.value = ['', '', '', '', '', '']
  otpError.value = ''
  showOtp.value = true
  startTimer()
  setTimeout(() => otpRefs.value[0]?.focus(), 60)
}

function onOtpInput(i: number, e: Event): void {
  const val = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1)
  otp.value[i] = val
  otpError.value = ''
  if (val && i < 5) otpRefs.value[i + 1]?.focus()
}

function onOtpKeydown(i: number, e: KeyboardEvent): void {
  if (e.key === 'Backspace' && !otp.value[i] && i > 0) otpRefs.value[i - 1]?.focus()
  if (e.key === 'Enter') handleVerifyOtp()
}

function onOtpPaste(e: ClipboardEvent): void {
  e.preventDefault()
  const pasted = e.clipboardData?.getData('text')?.replace(/\D/g, '')
  if (pasted && pasted.length >= 6) {
    otp.value = pasted.slice(0, 6).split('')
    otpRefs.value[5]?.focus()
  }
}

async function handleVerifyOtp(): Promise<void> {
  const code = otp.value.join('')
  if (code.length !== 6) {
    otpError.value = 'Enter all 6 digits'
    return
  }
  verifying.value = true
  const ok = await verifyOtp(storedUser.value, code)
  verifying.value = false

  if (ok) {
    if (timerInterval) clearInterval(timerInterval)
    router.push('/aromin/dashboard')
  } else {
    otpError.value = 'Invalid or expired OTP'
  }
}

function formatTimer(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

/** Vue 3.5-style typed template ref callback for the OTP digit inputs. */
function otpRef(el: unknown, i: number): void {
  if (el instanceof HTMLInputElement) otpRefs.value[i] = el
}
</script>

<template>
  <main class="aromin-login">
    <!-- starfield behind the whole admin login -->
    <StarsThree />

    <!-- subtle halftone texture -->
    <div class="halftone halftone-wide mask-tr pointer-events-none absolute right-0 top-0 z-[1] h-[70vh] w-[65vw] opacity-[0.13]"></div>
    <div class="halftone mask-bl pointer-events-none absolute bottom-0 left-0 z-[1] h-[60vh] w-[55vw] opacity-[0.1]"></div>

    <div class="relative z-10 flex w-full max-w-[400px] flex-col">
      <div class="mb-6 flex items-center justify-between">
        <RouterLink
          to="/"
          class="inline-flex items-center gap-2 font-mono text-[12px] text-gray-500 hover:text-ink"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          back to site
        </RouterLink>
        <ThemeSwitch />
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-8">
        <div class="mb-6">
          <p class="font-pixel text-[clamp(1.4rem,4vw,1.8rem)] leading-tight text-ink">
            &lt; Aromin /&gt;
          </p>
          <p class="mt-1 font-mono text-[11px] text-gray-500">
            // admin — authenticated access only
          </p>
        </div>

        <form class="flex flex-col gap-5" @submit.prevent="handleLogin">
          <div class="flex flex-col gap-2">
            <label class="font-mono text-[11px] text-gray-500" for="aromin-user">// username</label>
            <div class="relative">
              <User class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" :stroke-width="1.7" />
              <input
                id="aromin-user"
                v-model="username"
                type="text"
                autocomplete="username"
                class="w-full rounded-md border border-gray-200 bg-white py-2.5 pl-9 pr-3 font-mono text-[13px] text-ink outline-none transition-colors focus:border-gray-400"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label class="font-mono text-[11px] text-gray-500" for="aromin-pass">// password</label>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" :stroke-width="1.7" />
              <input
                id="aromin-pass"
                v-model="password"
                :type="showPass ? 'text' : 'password'"
                autocomplete="current-password"
                class="w-full rounded-md border border-gray-200 bg-white py-2.5 pl-9 pr-10 font-mono text-[13px] text-ink outline-none transition-colors focus:border-gray-400"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-ink"
                :aria-label="showPass ? 'Hide password' : 'Show password'"
                @click="showPass = !showPass"
              >
                <EyeOff v-if="showPass" class="h-4 w-4" :stroke-width="1.7" />
                <Eye v-else class="h-4 w-4" :stroke-width="1.7" />
              </button>
            </div>
          </div>

          <p v-if="error" class="font-mono text-[11px] text-red-500">// {{ error }}</p>

          <button
            type="submit"
            class="inline-flex items-center justify-center gap-2 rounded-md bg-ink py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
            :disabled="busy"
          >
            <LogIn class="h-4 w-4" :stroke-width="1.7" />
            {{ busy ? 'signing in...' : 'sign in' }}
          </button>
        </form>
      </div>
    </div>

    <!-- OTP modal -->
    <Teleport to="body">
      <div
        v-if="showOtp"
        class="fixed inset-0 z-[100] flex items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        aria-label="OTP verification"
        @click.self="showOtp = false"
      >
        <!-- blurred backdrop — pure blur, no dark overlay -->
        <div
          class="absolute inset-0 bg-transparent backdrop-blur-xl transition-opacity duration-300"
        ></div>
        <!-- starfield behind the modal card (same as dark-mode site) -->
        <StarsThree />
        <div class="relative z-10 w-full max-w-[380px] rounded-xl border border-gray-200 bg-white p-8">
          <div class="mb-5 text-center">
            <p class="font-pixel text-[clamp(1.2rem,3.5vw,1.5rem)] text-ink">&lt; OTP /&gt;</p>
            <p class="mt-1 font-mono text-[11px] text-gray-500">
              // enter the 6-digit code from your email
            </p>
          </div>

          <div class="otp-inputs mb-4 flex justify-center gap-2" @paste="onOtpPaste">
            <input
              v-for="(_, i) in 6"
              :key="i"
              :ref="(el) => otpRef(el, i)"
              v-model="otp[i]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              autocomplete="one-time-code"
              class="h-11 w-10 rounded-md border border-gray-200 bg-white text-center font-mono text-[18px] text-ink outline-none transition-colors focus:border-gray-400"
              aria-label="OTP digit"
              @input="onOtpInput(i, $event)"
              @keydown="onOtpKeydown(i, $event)"
            />
          </div>

          <p v-if="otpError" class="mb-2 text-center font-mono text-[11px] text-red-500">
            // {{ otpError }}
          </p>

          <p class="mb-5 text-center font-mono text-[11px] text-gray-500">
            <template v-if="otpTimer > 0">// expires in {{ formatTimer(otpTimer) }}</template>
            <template v-else>// code expired</template>
          </p>

          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-md border border-gray-200 py-2.5 font-mono text-[13px] text-gray-500 transition-colors hover:text-ink"
              @click="showOtp = false"
            >
              ← back
            </button>
            <button
              type="button"
              class="flex-1 rounded-md bg-ink py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
              :disabled="otp.join('').length !== 6 || verifying"
              @click="handleVerifyOtp"
            >
              {{ verifying ? 'verifying...' : 'verify' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.aromin-login {
  position: relative;
  display: flex;
  min-height: 100dvh;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  /* transparent — the StarsThree canvas (z 0) provides the background */
  background: transparent;
}
</style>
