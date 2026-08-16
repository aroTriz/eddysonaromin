<script setup lang="ts">
/**
 * Private chat — visitors DM the site admin (Messenger-style, themed).
 *
 * Flows:
 *  - Not signed in → login / register card (email + password; register adds
 *    name + confirm password). The card is compact for login, wider for
 *    register (more fields).
 *  - Signed in → the conversation with the admin opens directly (find or
 *    create). Live via a Bearer-auth SSE stream with an 8s poll fallback.
 *    The admin replies from the /aromin area.
 * Opened from the sidebar "private chat" button.
 */
import { LogIn, LogOut, Send, UserPlus, X } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  fetchPrivateAdmin,
  fetchPrivateMessages,
  markPrivateRead,
  privateLogout,
  privateLogin,
  privateRegister,
  privateSession,
  privateStreamUrl,
  privateToken,
  setPrivateToken,
  startAdminConversation,
  sendPrivateMessage,
  type PrivateMessage,
  type PrivateUser,
} from '@/services/privateChatApi'

// ── UI state ──────────────────────────────────────────────────────
const open = ref(false)
const closing = ref(false)
const user = ref<PrivateUser | null>(null)
const admin = ref<{ id: number; name: string } | null>(null)
const convId = ref<number | null>(null)
const messages = ref<PrivateMessage[]>([])
const messagesLoading = ref(false)
const input = ref('')
const sendHint = ref('')
const messagesEl = ref<HTMLDivElement | null>(null)

// ── Auth ──────────────────────────────────────────────────────────
const mode = ref<'login' | 'register'>('login')
const authError = ref('')
const authBusy = ref(false)
const authName = ref('')
const authEmail = ref('')
const authPassword = ref('')
const authConfirm = ref('')

const MESSAGE_MAX = 2000
const KIND_URL = 'https://en.wikipedia.org/wiki/Netiquette'

const BAD_LOOSE = [
  'fuck', 'motherfuck', 'shit', 'bullshit', 'bitch', 'asshole', 'cunt',
  'faggot', 'nigger', 'nigga', 'dickhead', 'jackass', 'dumbass',
  'cocksuck', 'dipshit', 'putangina', 'putanginamo', 'tangina', 'taena',
  'tarantado', 'gago', 'gaga', 'ulol', 'kingina', 'kupal', 'pakshet',
  'pakyu', 'hinayupak', 'hindot', 'hindut', 'buwiset', 'bwisit',
  'putang ina', 'tang ina', 'walang hiya', 'hayop ka', 'gunggong',
]
const BAD_STRICT = [
  'ass', 'dick', 'cock', 'prick', 'slut', 'whore', 'twat', 'wank',
  'piss', 'bastard', 'pussy', 'puta', 'tanga', 'bobo', 'tite', 'titi',
  'puki', 'pekpek', 'jakol', 'leche', 'peste', 'lintik', 'ungas', 'inutil',
]

// Timers / stream handles
let convTimer: ReturnType<typeof setInterval> | null = null
let streamCtrl: AbortController | null = null
let readTimer: ReturnType<typeof setTimeout> | null = null
let hintTimer: ReturnType<typeof setTimeout> | null = null
let seenIds = new Set<number>()

/** Module-level cache — reopening renders instantly from memory. */
let cachedUser: PrivateUser | null = null

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

function isOffensive(text: string): boolean {
  const t = (text || '').toLowerCase()
  for (const w of BAD_LOOSE) if (t.includes(w)) return true
  for (const w of BAD_STRICT) {
    try {
      if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'u').test(t)) return true
    } catch {
      /* skip */
    }
  }
  return false
}

// ── Open / close ──────────────────────────────────────────────────
async function openChat(): Promise<void> {
  closing.value = false
  open.value = true
  document.documentElement.style.overflow = 'hidden'

  if (cachedUser) user.value = cachedUser

  await resolveSession()
  if (user.value) await initThread()
  void nextTick(() => document.getElementById('pc-auth-email')?.focus())
}

function closeChat(): void {
  if (!open.value || closing.value) return
  document.documentElement.style.overflow = ''
  stopStream()
  stopTimers()
  closing.value = true
  setTimeout(() => {
    open.value = false
    closing.value = false
  }, 380)
}

async function resolveSession(): Promise<void> {
  if (!privateToken()) {
    user.value = null
    return
  }
  try {
    // privateSession() resolves to { user, banned } | null in the current
    // API — unwrap the user for the overlay's legacy shape.
    const s = await privateSession()
    const u = s?.user ?? null
    user.value = u
    cachedUser = u
    if (!u) {
      admin.value = null
      convId.value = null
      messages.value = []
    }
  } catch {
    user.value = null
  }
}

// ── Thread (visitor ↔ admin) ──────────────────────────────────────
async function initThread(): Promise<void> {
  try {
    const a = await fetchPrivateAdmin()
    admin.value = a
    const conv = await startAdminConversation()
    convId.value = conv.id
    messages.value = []
    seenIds = new Set()
    await loadMessages(true)
    void markPrivateRead(conv.id).catch(() => {})
    startStream()
    startPoll()
    void nextTick(() => document.getElementById('pc-message-input')?.focus())
  } catch {
    /* transient — the poll retries */
  }
}

async function loadMessages(initial: boolean): Promise<void> {
  if (convId.value === null) return
  messagesLoading.value = true
  try {
    const lastId = messages.value.length ? messages.value[messages.value.length - 1].id : 0
    const fresh = await fetchPrivateMessages(convId.value, initial ? 0 : lastId)
    fresh.forEach(addMessage)
    if (initial) scrollBottom()
    else maybeScroll()
    if (!initial) markReadDebounced()
  } catch {
    /* transient — next tick retries */
  } finally {
    messagesLoading.value = false
  }
}

function startPoll(): void {
  if (convTimer) clearInterval(convTimer)
  convTimer = setInterval(() => void loadMessages(false), 8000)
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
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
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

// ── Auth actions ──────────────────────────────────────────────────
function switchMode(m: 'login' | 'register'): void {
  mode.value = m
  authError.value = ''
}

async function submitAuth(): Promise<void> {
  authError.value = ''
  const name = authName.value.trim()
  const email = authEmail.value.trim().toLowerCase()
  const pass = authPassword.value
  const confirm = authConfirm.value

  if (!email || !pass) {
    authError.value = 'enter your email and password'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    authError.value = 'that email doesn\u2019t look right'
    return
  }
  if (mode.value === 'register') {
    if (!name) {
      authError.value = 'pick a name to be known by'
      return
    }
    if (pass.length < 8) {
      authError.value = 'password needs at least 8 characters'
      return
    }
    if (pass !== confirm) {
      authError.value = 'passwords don\u2019t match'
      return
    }
  }

  authBusy.value = true
  try {
    const result =
      mode.value === 'register'
        ? await privateRegister({ name, email, password: pass, password_confirmation: confirm })
        : await privateLogin({ email, password: pass })

    setPrivateToken(result.token)
    user.value = result.user
    cachedUser = result.user
    authPassword.value = ''
    authConfirm.value = ''
    await initThread()
  } catch (err) {
    authError.value = err instanceof Error ? err.message : 'something went wrong'
  } finally {
    authBusy.value = false
  }
}

async function doLogout(): Promise<void> {
  const token = privateToken()
  stopStream()
  stopTimers()
  if (token) await privateLogout()
  setPrivateToken(null)
  user.value = null
  cachedUser = null
  admin.value = null
  convId.value = null
  messages.value = []
  seenIds = new Set()
  mode.value = 'login'
  authError.value = ''
}

// ── Send ──────────────────────────────────────────────────────────
async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  const val = input.value.trim()
  if (!val || convId.value === null) return

  if (isOffensive(val)) {
    input.value = ''
    setSendHint("let's keep it kind — opening a guide for you")
    window.open(KIND_URL, '_blank', 'noopener')
    return
  }
  if (val.length > MESSAGE_MAX) return

  input.value = ''
  try {
    const msg = await sendPrivateMessage(convId.value, val)
    addMessage(msg)
    scrollBottom()
  } catch (err) {
    const reason = (err as Error & { reason?: string }).reason
    if (reason === 'blocked') {
      setSendHint("let's keep it kind — opening a guide for you")
      window.open(KIND_URL, '_blank', 'noopener')
    } else {
      input.value = val // let them retry
    }
  }
}

function setSendHint(text: string): void {
  sendHint.value = text
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    sendHint.value = ''
  }, 2400)
}

// ── Live stream (SSE via fetch — Bearer header friendly) ──────────
function startStream(): void {
  stopStream()
  const id = convId.value
  if (id === null || !user.value) return
  const token = privateToken()
  const lastId = messages.value.length ? messages.value[messages.value.length - 1].id : 0
  if (!token) return

  const ctrl = new AbortController()
  streamCtrl = ctrl

  void (async () => {
    try {
      const res = await fetch(privateStreamUrl(id, lastId), {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: ctrl.signal,
        cache: 'no-store',
      })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const raw = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          for (const line of raw.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const m = JSON.parse(line.slice(6)) as PrivateMessage
                if (m && m.id) {
                  addMessage(m)
                  if (m.sender_id !== user.value?.id) markReadDebounced()
                  maybeScroll()
                }
              } catch {
                /* skip malformed frame */
              }
            }
          }
        }
      }
    } catch {
      /* stream dropped — the 8s poll continues */
    }
  })()
}

function stopStream(): void {
  if (streamCtrl) {
    streamCtrl.abort()
    streamCtrl = null
  }
}

// ── Keyboard / lifecycle ──────────────────────────────────────────
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && open.value) closeChat()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = ''
  stopStream()
  stopTimers()
  if (readTimer) clearTimeout(readTimer)
  if (hintTimer) clearTimeout(hintTimer)
})

defineExpose({ openChat })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      :class="['fixed inset-0 z-[115] flex items-center justify-center p-4 sm:p-6', closing ? 'is-closing' : '']"
      role="dialog"
      aria-modal="true"
      aria-label="Private chat"
    >
      <!-- Blur backdrop — click to close -->
      <div
        class="absolute inset-0 bg-transparent backdrop-blur-xl transition-opacity duration-300"
        :class="closing ? 'opacity-0' : 'opacity-100'"
        @click="closeChat"
      ></div>

      <!-- ══════════ AUTH GATE — standalone card; login compact, register wider ══════════ -->
      <div
        v-if="!user"
        class="pc-auth-card relative z-[1] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 dark:border-gray-300 dark:bg-gray-100 sm:max-h-[calc(100dvh-3rem)]"
        :class="[
          mode === 'register' ? 'max-w-[470px] p-6 sm:p-9' : 'max-w-[390px] p-6 sm:p-8',
          closing ? 'translate-y-2.5 opacity-0 scale-[0.99]' : 'translate-y-0 opacity-100 scale-100',
        ]"
      >
        <div class="mb-5 flex items-start justify-between">
          <div>
            <p class="font-pixel text-[clamp(1.3rem,4vw,1.7rem)] leading-tight text-ink">
              private messages<span class="text-gray-400">.</span>
            </p>
            <p class="mt-1 font-mono text-[11px] text-gray-500">
              // chat with the admin — sign in to continue
            </p>
          </div>
          <button
            type="button"
            class="rounded p-1.5 text-gray-400 transition-colors hover:text-ink"
            aria-label="Close private chat"
            @click="closeChat"
          >
            <X class="h-4 w-4" :stroke-width="1.7" />
          </button>
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
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 font-mono text-[13px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
              placeholder="What should we call you?"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="pc-auth-email">// email</label>
            <input
              id="pc-auth-email"
              v-model="authEmail"
              type="email"
              autocomplete="email"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 font-mono text-[13px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
              placeholder="you@example.com"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="pc-auth-pass">// password</label>
            <input
              id="pc-auth-pass"
              v-model="authPassword"
              type="password"
              :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 font-mono text-[13px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
              :placeholder="mode === 'register' ? 'Min 8 characters' : 'Your password'"
            />
          </div>

          <div v-if="mode === 'register'" class="flex flex-col gap-1.5">
            <label class="font-mono text-[11px] text-gray-500" for="pc-auth-confirm">// confirm password</label>
            <input
              id="pc-auth-confirm"
              v-model="authConfirm"
              type="password"
              autocomplete="new-password"
              class="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 font-mono text-[13px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
              placeholder="Repeat your password"
            />
          </div>

          <p v-if="authError" class="font-mono text-[11px] text-red-500">// {{ authError }}</p>

          <button
            type="submit"
            class="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-ink py-2.5 font-mono text-[13px] font-semibold text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
            :disabled="authBusy"
          >
            <LogIn v-if="mode === 'login'" class="h-4 w-4" :stroke-width="1.7" />
            <UserPlus v-else class="h-4 w-4" :stroke-width="1.7" />
            {{ authBusy ? 'one moment…' : mode === 'login' ? 'log in' : 'create account' }}
          </button>
        </form>

        <p class="mt-5 text-center font-mono text-[10.5px] leading-relaxed text-gray-400">
          your messages go straight to the admin —<br />
          only the two of you can read them.
        </p>
      </div>

      <!-- ══════════ CHAT — visitor ↔ admin thread ══════════ -->
      <div
        v-else
        class="pc-panel relative z-[1] flex h-full w-full flex-col overflow-hidden bg-white transition-all duration-500 dark:bg-gray-100 sm:h-[min(640px,calc(100dvh-3rem))] sm:max-w-[640px] sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl dark:sm:border-gray-300"
        :class="closing ? 'translate-y-2.5 opacity-0 scale-[0.99]' : 'translate-y-0 opacity-100 scale-100'"
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
            <p class="font-mono text-[10px] text-gray-400">// 1-on-1 · private</p>
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
          <div v-if="messagesLoading && messages.length === 0" class="m-auto font-mono text-[12px] text-gray-400">
            // loading messages…
          </div>
          <div v-else-if="messages.length === 0" class="m-auto text-center">
            <p class="font-pixel text-[15px] text-gray-400">no messages yet</p>
            <p class="mt-1 font-mono text-[11px] text-gray-400">say hi — the admin will get back to you ✦</p>
          </div>

          <template v-for="m in messages" :key="m.id">
            <div class="flex w-full" :class="m.sender_id === user.id ? 'justify-end' : 'justify-start'">
              <div
                class="flex max-w-[78%] flex-col sm:max-w-[68%]"
                :class="m.sender_id === user.id ? 'items-end' : 'items-start'"
              >
                <div
                  class="whitespace-pre-wrap break-words px-3.5 py-2 font-sans text-[13.5px] leading-relaxed"
                  :class="m.sender_id === user.id
                    ? 'rounded-2xl rounded-br-md bg-ink text-bg'
                    : 'rounded-2xl rounded-bl-md border border-gray-200 bg-white text-ink dark:border-gray-300 dark:bg-gray-200'"
                >
                  {{ m.message }}
                </div>
                <span class="mt-1 px-1 font-mono text-[9.5px] text-gray-400">{{ clock(m.created_at) }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- input bar -->
        <div class="border-t border-gray-200 px-4 py-3 dark:border-gray-300">
          <form class="flex items-center gap-2.5" @submit="onSubmit">
            <input
              id="pc-message-input"
              v-model="input"
              type="text"
              :maxlength="MESSAGE_MAX"
              autocomplete="off"
              autocorrect="off"
              placeholder="Message the admin…"
              class="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 font-mono text-[13px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
            />
            <button
              type="submit"
              :disabled="!input.trim()"
              class="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-ink text-bg transition-opacity hover:opacity-80 disabled:opacity-30"
              aria-label="Send message"
            >
              <Send class="h-4 w-4" :stroke-width="1.8" />
            </button>
          </form>
          <p v-if="sendHint" class="mt-2 px-1 font-mono text-[10.5px] text-gray-400">{{ sendHint }}</p>
        </div>
      </div>
    </div>
  </Teleport>
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
</style>
