<script setup lang="ts">
/**
 * /private-chat â€” the visitor's 1-on-1 chat with the admin, as a full-page
 * app view: centered max-w-5xl column, the page itself never scrolls (the
 * route locks <html> overflow; the message list scrolls internally), and the
 * chat fills the viewport like a real messenger. Sign in/register inline
 * (centered card); live via SSE + 3s poll; supports attachments (images +
 * files) and a typing indicator.
 * Bubbles: the visitor's messages on the right, the admin's on the left.
 */
import {
  Ban,
  Eye,
  EyeOff,
  FileImage,
  LogIn,
  LogOut,
  Paperclip,
  Send,
  UserPlus,
  X,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import ChatAttachment from '@/components/chat/ChatAttachment.vue'
import {
  fetchPrivateAdmin,
  fetchPrivateMessages,
  fetchPrivateTyping,
  markPrivateRead,
  privateLogin,
  privateLogout,
  privateRegister,
  privateSession,
  privateToken,
  sendPrivateMessage,
  sendPrivateTyping,
  setPrivateToken,
  startAdminConversation,
  type ChatAttachment as Attachment,
  type PrivateMessage,
  type PrivateUser,
} from '@/services/privateChatApi'
import { fileToAttachment } from '@/utils/attachments'

const MESSAGE_MAX = 2000
const TYPING_BEAT_MS = 2500
const TYPING_IDLE_MS = 3000

// â”€â”€ Session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const user = ref<PrivateUser | null>(null)
const admin = ref<{ id: number; name: string } | null>(null)
const convId = ref<number | null>(null)
const messages = ref<PrivateMessage[]>([])
// The "// loading messagesâ€¦" hint is DELAY-GATED: it only appears when a
// fetch actually takes >200ms (big conversations / slow server). Tiny
// threads resolve before the gate and never flash a spinner.
const slowLoad = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | null = null
const threadError = ref('')
const chatError = ref('')
const messagesEl = ref<HTMLDivElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFile = ref<Attachment | null>(null)
const sending = ref(false)

// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const mode = ref<'login' | 'register'>('login')
const authError = ref('')
const authFieldErrors = ref<Record<string, string>>({})
const authBusy = ref(false)
const authName = ref('')
const authEmail = ref('')
const authPassword = ref('')
const authConfirm = ref('')
const showPass = ref(false)
const showConfirm = ref(false)

// True when the session check failed with a transient error (network / 5xx)
// â€” the visitor is still logged in, so we show a retry instead of the login
// gate and NEVER clear the stored token (that only happens on a real 401).
const sessionError = ref(false)

// True when the account is on the blacklist (auto-banned for vulgar
// language, or blacklisted by the admin) — shows the banned panel.
const bannedState = ref(false)

// â”€â”€ Typing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const typingUsers = ref<{ id: number; name: string }[]>([])
let typingInputActive = false
let typingBeatAt = 0
let typingIdleTimer: ReturnType<typeof setTimeout> | null = null

const typingNow = computed(() => typingUsers.value.length > 0)
const typingLabel = computed(() => {
  if (typingUsers.value.length === 0) return ''
  const names = typingUsers.value.map((u) => u.name)
  return names.length === 1 ? `${names[0]} is typing` : `${names.join(', ')} are typing`
})

// Timers
let convTimer: ReturnType<typeof setInterval> | null = null
let readTimer: ReturnType<typeof setTimeout> | null = null
let seenIds = new Set<number>()

function avatarUrl(name: string): string {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    name || 'anon',
  )}&radius=50&backgroundColor=f1f1f1`
}

function clock(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// â”€â”€ Boot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function boot(): Promise<void> {
  if (privateToken()) {
    try {
      const s = await privateSession()
      if (s) {
        sessionError.value = false
        if (s.banned) {
          bannedState.value = true
          return
        }
        user.value = s.user
        await initThread()
        return
      }
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 401) {
        // Definitive rejection â€” the token is dead. Clear it and show the
        // auth gate.
        setPrivateToken(null)
      } else {
        // Transport / server hiccup â€” the visitor is still logged in. Keep
        // the token and let them retry instead of bouncing them to login.
        sessionError.value = true
        return
      }
    }
  }
  await nextTick()
  document.getElementById('pc-auth-email')?.focus()
}

async function retrySession(): Promise<void> {
  sessionError.value = false
  await boot()
}

// â”€â”€ Thread â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function initThread(): Promise<void> {
  threadError.value = ''
  chatError.value = ''
  try {
    // Independent calls run in PARALLEL so the thread opens in one round
    // trip less â€” the PHP dev server answers faster when we don't queue
    // requests behind each other.
    const [a, conv] = await Promise.all([fetchPrivateAdmin(), startAdminConversation()])
    admin.value = a
    convId.value = conv.id
    messages.value = []
    seenIds = new Set()
    await loadMessages(true)
    void markPrivateRead(conv.id).catch(() => {})
    void refreshTyping()
    startPoll()
    await nextTick()
    document.getElementById('pc-message-input')?.focus()
  } catch (err) {
    const status = (err as Error & { status?: number }).status
    if (status === 401) {
      setPrivateToken(null)
      user.value = null
      admin.value = null
      convId.value = null
      messages.value = []
      authError.value = 'session expired â€” sign in again'
    } else {
      threadError.value = err instanceof Error ? err.message : "couldn't open the thread"
    }
  }
}

async function loadMessages(initial: boolean): Promise<void> {
  if (convId.value === null) return
  // Arm the delayed loading hint â€” cleared in `finally`. Fast loads (tiny
  // threads) resolve before the 200ms gate fires, so nothing ever flashes.
  slowTimer = setTimeout(() => {
    slowLoad.value = true
  }, 200)
  try {
    const lastId = messages.value.length ? messages.value[messages.value.length - 1].id : 0
    const fresh = await fetchPrivateMessages(convId.value, initial ? 0 : lastId)
    fresh.forEach(addMessage)
    if (initial) {
      scrollBottom()
      threadError.value = ''
    } else {
      maybeScroll()
    }
    if (!initial) markReadDebounced()
  } catch (err) {
    if (initial) {
      threadError.value = err instanceof Error ? err.message : "couldn't load messages"
    }
  } finally {
    if (slowTimer) clearTimeout(slowTimer)
    slowTimer = null
    slowLoad.value = false
  }
}

function startPoll(): void {
  if (convTimer) clearInterval(convTimer)
  // 2s poll â€” live by design (fast, and it never blocks the single-threaded
  // Windows dev server the way an open SSE stream would).
  convTimer = setInterval(() => {
    void loadMessages(false)
    void refreshTyping()
    maybeKeepTypingAlive()
  }, 2000)
}

/** Keep the "typing" heartbeat alive while text sits in the box. */
function maybeKeepTypingAlive(): void {
  // Refresh the server heartbeat only while genuinely typing — the idle
  // timer in onInput() clears the indicator ~3s after the last keystroke,
  // so "typing…" never lingers once the visitor actually stops.
  if (typingInputActive && Date.now() - typingBeatAt >= TYPING_BEAT_MS) {
    typingBeatAt = Date.now()
    void sendTyping(true)
  }
}

function stopTimers(): void {
  if (convTimer) {
    clearInterval(convTimer)
    convTimer = null
  }
}

function addMessage(m: PrivateMessage): void {
  if (seenIds.has(m.id)) return
  seenIds.add(m.id)
  messages.value.push(m)
}

function maybeScroll(): void {
  const el = messagesEl.value
  if (!el) return
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140
  if (nearBottom) scrollBottom()
}

function scrollBottom(): void {
  const el = messagesEl.value
  if (el) {
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }
}

function markReadDebounced(): void {
  if (convId.value === null) return
  if (readTimer) clearTimeout(readTimer)
  readTimer = setTimeout(() => {
    void markPrivateRead(convId.value!).catch(() => {})
  }, 400)
}

// â”€â”€ Auth actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function switchMode(m: 'login' | 'register'): void {
  mode.value = m
  authError.value = ''
  authFieldErrors.value = {}
}

async function submitAuth(): Promise<void> {
  authError.value = ''
  authFieldErrors.value = {}
  const name = authName.value.trim()
  const email = authEmail.value.trim().toLowerCase()
  const pass = authPassword.value
  const confirm = authConfirm.value

  const fieldErrors: Record<string, string> = {}
  if (!email) fieldErrors.email = 'Please enter your email address'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Please include an '@' in the email address"
  }
  if (!pass) fieldErrors.password = 'Please enter your password'
  if (mode.value === 'register') {
    if (!name) fieldErrors.name = 'Pick a name to be known by'
    if (pass && pass.length < 8) fieldErrors.password = 'Password needs at least 8 characters'
    if (pass && confirm && pass !== confirm) fieldErrors.confirm = "Passwords don't match"
  }
  if (Object.keys(fieldErrors).length > 0) {
    authFieldErrors.value = fieldErrors
    return
  }

  authBusy.value = true
  try {
    const result =
      mode.value === 'register'
        ? await privateRegister({ name, email, password: pass, password_confirmation: confirm })
        : await privateLogin({ email, password: pass })

    setPrivateToken(result.token)
    user.value = result.user
    authPassword.value = ''
    authConfirm.value = ''
    await initThread()
  } catch (err) {
    const e = err as Error & { errors?: Record<string, string> }
    if (e.errors && Object.keys(e.errors).length > 0) {
      const mapped: Record<string, string> = {}
      for (const [k, v] of Object.entries(e.errors)) {
        mapped[k === 'password_confirmation' ? 'confirm' : k] = v
      }
      authFieldErrors.value = mapped
      authError.value = ''
    } else {
      authError.value = e instanceof Error ? e.message : 'Something went wrong'
    }
  } finally {
    authBusy.value = false
  }
}

async function doLogout(): Promise<void> {
  stopTimers()
  void sendTyping(false)
  if (privateToken()) await privateLogout()
  setPrivateToken(null)
  user.value = null
  admin.value = null
  convId.value = null
  messages.value = []
  seenIds = new Set()
  pendingFile.value = null
  mode.value = 'login'
  authError.value = ''
  sessionError.value = false
}

// â”€â”€ Typing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function onInput(): void {
  const hasText = input.value.trim().length > 0
  if (!hasText) {
    stopTyping()
    return
  }
  // Restart the idle countdown — TYPING_IDLE_MS without a keystroke clears
  // the indicator, so "typing…" shows if and only if the visitor is really
  // typing right now.
  if (typingIdleTimer) clearTimeout(typingIdleTimer)
  typingIdleTimer = setTimeout(() => {
    typingIdleTimer = null
    stopTyping()
  }, TYPING_IDLE_MS)
  if (!typingInputActive) {
    typingInputActive = true
    typingBeatAt = Date.now()
    void sendTyping(true)
    return
  }
  if (Date.now() - typingBeatAt > TYPING_BEAT_MS) {
    typingBeatAt = Date.now()
    void sendTyping(true)
  }
}

function stopTyping(): void {
  if (typingIdleTimer) {
    clearTimeout(typingIdleTimer)
    typingIdleTimer = null
  }
  if (typingInputActive) {
    typingInputActive = false
    void sendTyping(false)
  }
}

async function sendTyping(typing: boolean): Promise<void> {
  if (convId.value === null) return
  try {
    await sendPrivateTyping(convId.value, typing)
  } catch {
    /* best effort */
  }
}

async function refreshTyping(): Promise<void> {
  if (convId.value === null) return
  try {
    typingUsers.value = (await fetchPrivateTyping(convId.value)).filter((u) => u.id !== user.value?.id)
  } catch {
    /* best effort */
  }
}

// â”€â”€ Attachments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function onPickFile(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  chatError.value = ''
  try {
    pendingFile.value = await fileToAttachment(file)
  } catch (err) {
    chatError.value = err instanceof Error ? err.message : "couldn't read that file"
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

function clearPending(): void {
  pendingFile.value = null
}

// â”€â”€ Send â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const input = ref('')

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  if (convId.value === null || sending.value) return
  const val = input.value.trim()
  const attachment = pendingFile.value
  if (!val && !attachment) return

  stopTyping()
  sending.value = true
  chatError.value = ''
  input.value = ''
  pendingFile.value = null
  try {
    const msg = await sendPrivateMessage(convId.value, val, attachment)
    addMessage(msg)
    scrollBottom()
  } catch (err) {
    input.value = val
    pendingFile.value = attachment
    if ((err as Error & { reason?: string }).reason === 'banned') {
      // The account got blacklisted (e.g. an earlier vulgar message) while
      // the chat was open — flip to the banned panel.
      bannedState.value = true
      stopTimers()
      return
    }
    chatError.value = err instanceof Error ? err.message : "couldn't send â€” try again"
  } finally {
    sending.value = false
  }
}

// â”€â”€ Live: 2s poll (messages + typing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The live updates flow through startPoll() above â€” no SSE: an open
// Server-Sent Events stream blocks every other request on the Windows
// single-threaded PHP dev server, which made the chat feel like it
// needed a refresh. Polling every 2s feels just as live and never blocks.

onMounted(() => {
  void boot()
  // Lock the page: this view must never scroll â€” only the chat panel's
  // message list scrolls (it is its own overflow container). Same pattern
  // the mobile menu uses.
  document.documentElement.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  stopTimers()
  if (readTimer) clearTimeout(readTimer)
  if (slowTimer) clearTimeout(slowTimer)
  stopTyping()
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <!-- Full-height app view: page never scrolls (overflow locked on <html>),
       the chat panel / message list scrolls internally. Mobile subtracts the
       sticky top bar height; desktop (no in-flow header) uses full dvh. -->
  <div
    class="mx-auto flex h-[calc(100dvh-3rem)] w-full max-w-5xl flex-col overflow-hidden px-6 py-4 lg:h-dvh lg:px-10 lg:py-8"
  >
    <!-- â”€â”€ Banned — account is on the blacklist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <div
      v-if="bannedState"
      class="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto"
    >
      <div
        class="mx-auto my-auto w-full max-w-[390px] rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm sm:p-8"
      >
        <Ban class="mx-auto h-7 w-7 text-red-500" :stroke-width="1.5" />
        <p class="mt-3 font-pixel text-[clamp(1.2rem,3vw,1.5rem)] leading-tight text-ink">
          This account has been banned<span class="text-gray-400">.</span>
        </p>
        <p class="mt-2 font-mono text-[11px] leading-relaxed text-gray-500">
          // vulgar language isn&rsquo;t allowed here —<br />
          // you&rsquo;ve been added to the blacklist.
        </p>
        <p class="mt-2 font-mono text-[10.5px] leading-relaxed text-gray-400">
          // contact the admin if you think this is a mistake
        </p>
      </div>
    </div>

    <!-- â”€â”€ Session check failed (transient) â€” token kept, offer retry â”€â”€ -->
    <div
      v-else-if="sessionError"
      class="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto"
    >
      <div
        class="mx-auto my-auto w-full max-w-[390px] rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8"
      >
        <p class="font-pixel text-[clamp(1.2rem,3vw,1.5rem)] leading-tight text-ink">
          session check<span class="text-gray-400">.</span>
        </p>
        <p class="mt-2 font-mono text-[11px] leading-relaxed text-gray-500">
          // couldn't verify your session â€” the connection blipped.<br />
          // you're still signed in, no need to log in again.
        </p>
        <button
          type="button"
          class="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80"
          @click="retrySession"
        >
          Try again
        </button>
      </div>
    </div>

    <!-- â”€â”€ Auth gate (login / register) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <div v-else-if="!user" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div
        class="mx-auto my-auto w-full max-w-[390px] rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        :class="mode === 'register' ? 'sm:max-w-[470px]' : ''"
      >
      <div class="mb-5">
        <p class="font-pixel text-[clamp(1.3rem,4vw,1.7rem)] leading-tight text-ink">
          private messages<span class="text-gray-400">.</span>
        </p>
        <p class="mt-1 font-mono text-[11px] text-gray-500">
          // chat with the admin â€” sign in to continue
        </p>
      </div>

      <!-- mode toggle -->
      <div class="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-300">
        <button
          type="button"
          class="rounded-md py-1.5 font-mono text-[12px] transition-colors"
          :class="mode === 'login'
            ? 'bg-ink font-semibold text-bg'
            : 'text-gray-500 hover:text-ink'"
          @click="switchMode('login')"
        >
          log in
        </button>
        <button
          type="button"
          class="rounded-md py-1.5 font-mono text-[12px] transition-colors"
          :class="mode === 'register'
            ? 'bg-ink font-semibold text-bg'
            : 'text-gray-500 hover:text-ink'"
          @click="switchMode('register')"
        >
          register
        </button>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="submitAuth">
        <div v-if="mode === 'register'" class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="pc-name">// name</label>
          <input
            id="pc-name"
            v-model="authName"
            type="text"
            maxlength="40"
            autocomplete="nickname"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
            :class="authFieldErrors.name ? 'border-red-400 focus:border-red-500' : ''"
            placeholder="What should we call you?"
            @input="authFieldErrors.name = ''"
          />
          <p v-if="authFieldErrors.name" class="font-mono text-[10.5px] text-red-500">// {{ authFieldErrors.name }}</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="pc-auth-email">// email</label>
          <input
            id="pc-auth-email"
            v-model="authEmail"
            type="email"
            autocomplete="email"
            class="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
            :class="authFieldErrors.email ? 'border-red-400 focus:border-red-500' : ''"
            placeholder="you@example.com"
            @input="authFieldErrors.email = ''"
          />
          <p v-if="authFieldErrors.email" class="font-mono text-[10.5px] text-red-500">// {{ authFieldErrors.email }}</p>
        </div>

        <!-- password (eye toggle) -->
        <div class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="pc-auth-pass">// password</label>
          <div class="relative">
            <input
              id="pc-auth-pass"
              v-model="authPassword"
              :type="showPass ? 'text' : 'password'"
              :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
              class="w-full rounded-md border border-gray-200 bg-white py-2.5 pl-3 pr-10 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
              :class="authFieldErrors.password ? 'border-red-400 focus:border-red-500' : ''"
              :placeholder="mode === 'register' ? 'Min. 8 characters' : 'Your password'"
              @input="authFieldErrors.password = ''"
            />
            <button
              type="button"
              class="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-ink"
              :aria-label="showPass ? 'Hide password' : 'Show password'"
              @click="showPass = !showPass"
            >
              <EyeOff v-if="showPass" class="h-4 w-4" :stroke-width="1.7" />
              <Eye v-else class="h-4 w-4" :stroke-width="1.7" />
            </button>
          </div>
          <p v-if="authFieldErrors.password" class="font-mono text-[10.5px] text-red-500">// {{ authFieldErrors.password }}</p>
        </div>

        <div v-if="mode === 'register'" class="flex flex-col gap-1.5">
          <label class="font-mono text-[11px] text-gray-500" for="pc-auth-confirm">// confirm password</label>
          <div class="relative">
            <input
              id="pc-auth-confirm"
              v-model="authConfirm"
              :type="showConfirm ? 'text' : 'password'"
              autocomplete="new-password"
              class="w-full rounded-md border border-gray-200 bg-white py-2.5 pl-3 pr-10 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
              :class="authFieldErrors.confirm ? 'border-red-400 focus:border-red-500' : ''"
              placeholder="Repeat your password"
              @input="authFieldErrors.confirm = ''"
            />
            <button
              type="button"
              class="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-ink"
              :aria-label="showConfirm ? 'Hide password' : 'Show password'"
              @click="showConfirm = !showConfirm"
            >
              <EyeOff v-if="showConfirm" class="h-4 w-4" :stroke-width="1.7" />
              <Eye v-else class="h-4 w-4" :stroke-width="1.7" />
            </button>
          </div>
          <p v-if="authFieldErrors.confirm" class="font-mono text-[10.5px] text-red-500">// {{ authFieldErrors.confirm }}</p>
        </div>

        <p v-if="authError" class="font-mono text-[11px] text-red-500">// {{ authError }}</p>

        <button
          type="submit"
          class="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-ink py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
          :disabled="authBusy"
        >
          <LogIn v-if="mode === 'login'" class="h-4 w-4" :stroke-width="1.7" />
          <UserPlus v-else class="h-4 w-4" :stroke-width="1.7" />
          {{ authBusy ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create account' }}
        </button>
      </form>

      <p class="mt-5 text-center font-mono text-[10.5px] leading-relaxed text-gray-400">
        Your messages go straight to the admin —<br />
        only the two of you can read them.
      </p>
      </div>
    </div>

    <!-- â”€â”€ Chat panel â€” fills the viewport column, scrolls internally â”€â”€ -->
    <div
      v-else
      class="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-300 dark:bg-gray-100"
    >
      <!-- chat header -->
      <div class="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-300">
        <img
          class="h-9 w-9 shrink-0 rounded-full bg-gray-100"
          :src="avatarUrl(admin?.name ?? 'admin')"
          :alt="`${admin?.name ?? 'admin'} avatar`"
          loading="lazy"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate font-mono text-[13px] font-semibold text-ink">
            {{ admin?.name ?? 'admin' }}
          </p>
          <p class="truncate font-mono text-[10px] text-gray-400">
            <span v-if="typingNow" class="text-ink">{{ typingLabel }}â€¦</span>
            <span v-else>// 1-on-1 Â· private</span>
          </p>
        </div>
        <button
          type="button"
          class="rounded p-1.5 text-gray-400 transition-colors hover:text-ink"
          aria-label="Sign out"
          title="Sign out"
          @click="doLogout"
        >
          <LogOut class="h-4 w-4" :stroke-width="1.7" />
        </button>
      </div>

      <!-- messages -->
      <div
        ref="messagesEl"
        class="chat-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto bg-gray-50 px-4 py-4 dark:bg-gray-200/20"
      >
        <div v-if="slowLoad && messages.length === 0" class="m-auto font-mono text-[12px] text-gray-400">
          // loading messagesâ€¦
        </div>
        <div v-else-if="threadError" class="m-auto max-w-[280px] text-center">
          <p class="font-mono text-[11.5px] leading-relaxed text-red-500">// {{ threadError }}</p>
          <button
            type="button"
            class="mt-2.5 rounded-md border border-gray-200 px-3.5 py-1.5 font-mono text-[11px] text-ink transition-colors hover:bg-gray-100 dark:border-gray-300 dark:hover:bg-gray-200"
            @click="initThread"
          >
            try again
          </button>
        </div>
        <div v-else-if="messages.length === 0" class="m-auto text-center">
          <p class="font-pixel text-[15px] text-gray-400">No messages yet</p>
          <p class="mt-1 font-mono text-[11px] text-gray-400">say hi â€” the admin will get back to you</p>
        </div>

        <template v-for="(m, i) in messages" :key="m.id">
          <!-- day divider -->
          <div
            v-if="i === 0 || dayLabel(m.created_at) !== dayLabel(messages[i - 1].created_at)"
            class="my-2 self-center rounded-full border border-gray-200 bg-white px-3 py-1 font-mono text-[9.5px] text-gray-400 dark:border-gray-300 dark:bg-gray-100"
          >
            {{ dayLabel(m.created_at) }}
          </div>
          <div class="flex w-full" :class="m.sender_id === user.id ? 'justify-end' : 'justify-start'">
            <div
              class="flex max-w-[80%] flex-col sm:max-w-[70%]"
              :class="m.sender_id === user.id ? 'items-end' : 'items-start'"
            >
              <div
                class="flex max-w-full flex-col gap-1.5 px-3.5 py-2"
                :class="m.sender_id === user.id
                  ? 'rounded-2xl rounded-br-md bg-ink text-bg'
                  : 'rounded-2xl rounded-bl-md border border-gray-200 bg-white text-ink dark:border-gray-300 dark:bg-gray-200'"
              >
                <ChatAttachment
                  v-if="m.attachment"
                  :attachment="m.attachment"
                  :dark="m.sender_id === user.id"
                />
                <p v-if="m.message" class="whitespace-pre-wrap break-words font-sans text-[13.5px] leading-relaxed">
                  {{ m.message }}
                </p>
              </div>
              <span class="mt-1 px-1 font-mono text-[9.5px] text-gray-400">{{ clock(m.created_at) }}</span>
            </div>
          </div>
        </template>

        <!-- typing indicator -->
        <div v-if="typingNow" class="flex w-full justify-start">
          <div class="flex items-center gap-2 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3.5 py-2.5 dark:border-gray-300 dark:bg-gray-200">
            <span class="typing-dots"><i></i><i></i><i></i></span>
            <span class="font-mono text-[10.5px] text-gray-400">{{ typingLabel }}â€¦</span>
          </div>
        </div>
      </div>

      <!-- input bar -->
      <div class="border-t border-gray-200 px-4 py-3 dark:border-gray-300">
        <p v-if="chatError" class="mb-2 px-1 font-mono text-[10.5px] leading-relaxed text-red-500">
          // {{ chatError }}
        </p>

        <!-- pending attachment preview -->
        <div
          v-if="pendingFile"
          class="mb-2 flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-300 dark:bg-gray-200/40"
        >
          <img
            v-if="pendingFile.kind === 'image'"
            :src="pendingFile.data"
            :alt="pendingFile.name"
            class="h-10 w-10 rounded object-cover"
          />
          <FileImage v-else class="h-5 w-5 shrink-0 text-gray-400" :stroke-width="1.7" />
          <span class="min-w-0 flex-1 truncate font-mono text-[11px] text-gray-600 dark:text-gray-400">
            {{ pendingFile.name }}
            <span class="text-gray-400">Â· {{ (pendingFile.size / 1024).toFixed(1) }} KB</span>
          </span>
          <button
            type="button"
            class="rounded p-1 text-gray-400 transition-colors hover:text-ink"
            aria-label="Remove attachment"
            @click="clearPending"
          >
            <X class="h-4 w-4" :stroke-width="1.7" />
          </button>
        </div>

        <form class="flex items-center gap-2.5" @submit="onSubmit">
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.xls,.xlsx,.ppt,.pptx"
            @change="onPickFile"
          />
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink dark:border-gray-300"
            aria-label="Attach a file or image"
            title="Attach a file or image (max 2.5MB)"
            @click="fileInput?.click()"
          >
            <Paperclip class="h-4 w-4" :stroke-width="1.7" />
          </button>
          <input
            id="pc-message-input"
            v-model="input"
            type="text"
            :maxlength="MESSAGE_MAX"
            autocomplete="off"
            autocorrect="off"
            placeholder="Message the admin…"
            class="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
            @input="onInput"
            @blur="stopTyping"
          />
          <button
            type="submit"
            :disabled="(!input.trim() && !pendingFile) || sending"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-bg transition-opacity hover:opacity-80 disabled:opacity-30"
            aria-label="Send message"
          >
            <Send class="h-4 w-4" :stroke-width="1.8" />
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--g300)) transparent;
}
.chat-scroll::-webkit-scrollbar {
  width: 6px;
}
.chat-scroll::-webkit-scrollbar-thumb {
  background: rgb(var(--g300));
  border-radius: 3px;
}
.chat-scroll::-webkit-scrollbar-track {
  background: transparent;
}

/* typing dots */
.typing-dots {
  display: inline-flex;
  gap: 3px;
}
.typing-dots i {
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background: rgb(var(--g400));
  animation: typing-bounce 1.2s infinite ease-in-out;
}
.typing-dots i:nth-child(2) {
  animation-delay: 0.15s;
}
.typing-dots i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-3px);
    opacity: 1;
  }
}
</style>
