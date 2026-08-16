<script setup lang="ts">
/**
 * Community chat — bryllim.com-style message wall.
 * Phases: "name" (say who you are) → "message" (chat). Polls every 8s,
 * remembers returning visitors, filters profanity/links, enforces an 8s
 * send cooldown, and shows live presence via dicebear avatars + device +
 * location. Opened from the sidebar "community chat" button.
 */
import { LoaderCircle, MessageSquareOff } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  fetchChatIdentity,
  fetchChatMessages,
  fetchCommunityChatEnabled,
  postChatMessage,
  saveChatIdentity,
  type ChatMessage,
} from '@/services/chatApi'

// ── UI state ──────────────────────────────────────────────────────
const open = ref(false)
const closing = ref(false)
const phase = ref<'name' | 'message'>('name')
const messages = ref<ChatMessage[]>([])
const totalCount = ref(0)
const input = ref('')
const promptText = ref("What's your name?")
const hintTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const messagesEl = ref<HTMLDivElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const sendDisabled = ref(false)
/** False when the admin turned the chat off (Preferences) — shows the
 *  "community chat has been turned off" notice instead of the wall. */
const chatEnabled = ref(true)

// ── Identity / presence ───────────────────────────────────────────
let clientId = ''
let chatName = ''
let myDevice = ''
let myLocation = ''
let myIp = ''
let identityPromise: Promise<void> | null = null

let pollTimer: ReturnType<typeof setInterval> | null = null
let timeTimer: ReturnType<typeof setInterval> | null = null
let lastSent = 0
let streamSource: EventSource | null = null
/** Seen message ids — dedupes SSE reconnects against the poll/initial load. */
const seenIds = new Set<number>()

/** Module-level cache — reopening the chat renders instantly from memory,
 *  then refreshes via the initial load + SSE stream. */
let cachedList: { messages: ChatMessage[]; total: number } | null = null
let cacheAt = 0
const CACHE_TTL = 30_000

function readCache(): { messages: ChatMessage[]; total: number } | null {
  if (cachedList && Date.now() - cacheAt < CACHE_TTL) return cachedList
  return null
}
function writeCache(list: { messages: ChatMessage[]; total: number }): void {
  cachedList = list
  cacheAt = Date.now()
}

const MAX_VISIBLE = 60
const SEND_COOLDOWN = 8000
const KIND_URL = 'https://en.wikipedia.org/wiki/Netiquette'

const LINK_TLDS = [
  'com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'info',
  'biz', 'link', 'site', 'online', 'store', 'shop', 'page', 'live',
  'tech', 'cloud', 'click', 'me', 'ly', 'gg', 'gl', 'be', 'to', 'tv',
  'fm', 'sh', 'cc', 'ws', 'ph', 'uk', 'ca', 'au', 'de', 'jp', 'eu',
  'edu', 'gov', 'top', 'vip', 'pro', 'fun', 'icu',
]

// ── Helpers ───────────────────────────────────────────────────────
function avatarUrl(name: string): string {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    name || 'anon',
  )}&radius=50&backgroundColor=f1f1f1`
}

function deviceIcon(label: string): string {
  if (label === 'iPhone' || label === 'Android') {
    return '<svg viewBox="0 0 24 24" fill="none" class="inline-block h-3 w-3"><rect x="7" y="2.5" width="10" height="19" rx="2.2" stroke="currentColor" stroke-width="1.6"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  }
  if (label === 'iPad' || label === 'Android tablet') {
    return '<svg viewBox="0 0 24 24" fill="none" class="inline-block h-3 w-3"><rect x="4" y="2.5" width="16" height="19" rx="2.2" stroke="currentColor" stroke-width="1.6"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  }
  return '<svg viewBox="0 0 24 24" fill="none" class="inline-block h-3 w-3"><rect x="4" y="5" width="16" height="11" rx="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M2 19.5h20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
}

function detectDevice(): string {
  const ua = navigator.userAgent || ''
  const touch = navigator.maxTouchPoints || 0
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1)) return 'iPad'
  if (/iPhone|iPod/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android' : 'Android tablet'
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/CrOS/.test(ua)) return 'Chromebook'
  if (/Linux/.test(ua)) return 'Linux'
  return 'device'
}

async function collectLocation(): Promise<void> {
  if (myLocation && myIp) return
  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 3500)
    const r = await fetch('https://ipwho.is/', { signal: ctrl.signal })
    clearTimeout(to)
    const d = (await r.json()) as {
      success?: boolean
      ip?: string
      city?: string
      country_code?: string
      country?: string
    }
    if (d && d.success !== false) {
      // Real public IP — stored for the admin dashboard only.
      if (d.ip) myIp = d.ip
      myLocation = [d.city, d.country_code].filter(Boolean).join(', ') || d.country || ''
    }
  } catch {
    /* location is optional */
  }
}

function timeAgo(iso: string): string {
  const then = iso ? new Date(iso).getTime() : NaN
  if (isNaN(then)) return ''
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

function containsLink(text: string): boolean {
  const t = (text || '').toLowerCase()
  if (/https?:\/\//.test(t)) return true
  if (/(?:^|[^a-z0-9])www\.[a-z0-9]/.test(t)) return true
  try {
    return new RegExp(`[a-z0-9][a-z0-9-]*\\.(?:${LINK_TLDS.join('|')})\\b`).test(t)
  } catch {
    return false
  }
}

function setPrompt(text: string, revertTo = 'message'): void {
  if (hintTimer.value) clearTimeout(hintTimer.value)
  promptText.value = text
  hintTimer.value = setTimeout(() => {
    promptText.value = revertTo === 'name' ? "What's your name?" : `Chatting as ${chatName}`
  }, 2400)
}

function showMessagePrompt(): void {
  promptText.value = `Chatting as ${chatName}`
}

function setPhase(p: 'name' | 'message'): void {
  phase.value = p
  input.value = ''
  if (p === 'name') {
    promptText.value = "What's your name?"
  } else {
    showMessagePrompt()
  }
  void nextTick(() => inputEl.value?.focus())
}

// ── Message rendering ─────────────────────────────────────────────
function updateFades(): void {
  const el = messagesEl.value
  if (!el) return
  const canScroll = el.scrollHeight - el.clientHeight > 4
  el.classList.toggle('chat-fade-top', canScroll && el.scrollTop > 4)
  el.classList.toggle('chat-fade-bottom', canScroll && el.scrollHeight - el.scrollTop - el.clientHeight > 4)
}

function scrollBottom(): void {
  const el = messagesEl.value
  if (el) el.scrollTop = el.scrollHeight
}

function smoothScrollBottom(maxMs = 1500): void {
  const el = messagesEl.value
  if (!el) return
  const startT = performance.now()
  let settled = 0
  const step = (now: number): void => {
    const target = Math.max(0, el.scrollHeight - el.clientHeight)
    const dist = target - el.scrollTop
    if (dist > 0.5) {
      el.scrollTop += dist * 0.2
      settled = 0
    } else {
      el.scrollTop = target
      settled++
    }
    updateFades()
    if (settled < 3 && now - startT < maxMs) {
      requestAnimationFrame(step)
    } else {
      el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight)
      updateFades()
    }
  }
  requestAnimationFrame(step)
}

function trimMessages(): void {
  if (messages.value.length > MAX_VISIBLE) {
    messages.value = messages.value.slice(-MAX_VISIBLE)
  }
  updateFades()
}

function updateTimes(): void {
  // Vue re-renders the time labels reactively — no manual DOM needed.
}

function addMessage(m: ChatMessage): void {
  if (seenIds.has(m.id)) return
  seenIds.add(m.id)
  messages.value.push(m)
}

// ── Load / send ───────────────────────────────────────────────────
async function load(initial: boolean): Promise<void> {
  try {
    const lastId = messages.value.length
      ? messages.value[messages.value.length - 1].id
      : 0
    const data = await fetchChatMessages(initial ? 0 : lastId)

    if (initial) {
      if (typeof data.total === 'number') totalCount.value = data.total
      // Cache the full list so the next open is instant.
      writeCache({ messages: data.messages, total: data.total })
    }

    if (data.messages.length === 0) return

    const fresh = data.messages.filter((m) => !seenIds.has(m.id))
    fresh.forEach((m) => addMessage(m))
    if (!initial) totalCount.value += fresh.length

    trimMessages()
    if (initial) scrollBottom()
    else if (messagesEl.value) {
      const el = messagesEl.value
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90
      if (nearBottom) smoothScrollBottom()
    }
    updateFades()
  } catch {
    /* transient poll failure — next tick retries */
  }
}

function startCooldown(): void {
  lastSent = Date.now()
  sendDisabled.value = true
  setTimeout(() => {
    sendDisabled.value = false
  }, SEND_COOLDOWN)
}

// ── Live stream (SSE) — instant updates, poll kept as fallback ────
function startStream(): void {
  stopStream()
  const lastId = messages.value.length ? messages.value[messages.value.length - 1].id : 0
  const source = new EventSource(`/api/v1/chat/stream?after=${lastId}`)
  streamSource = source
  source.addEventListener('message', (e: MessageEvent<string>) => {
    try {
      const m = JSON.parse(e.data) as ChatMessage
      if (!m || !m.id) return
      // Already counted (sent by me, or picked up by the 8s poll first) —
      // skip entirely, otherwise the counter drifts above the real total.
      if (seenIds.has(m.id)) return
      addMessage(m)
      totalCount.value += 1
      trimMessages()
      const el = messagesEl.value
      if (el) {
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90
        if (nearBottom) smoothScrollBottom()
      }
      updateFades()
    } catch {
      /* ignore malformed frames */
    }
  })
}

function stopStream(): void {
  if (streamSource) {
    streamSource.close()
    streamSource = null
  }
}

async function rememberChatName(name: string): Promise<void> {
  try {
    await saveChatIdentity(clientId, name)
  } catch {
    /* identity is best-effort */
  }
}

async function loadRememberedIdentity(): Promise<void> {
  if (identityPromise) return identityPromise
  identityPromise = (async () => {
    if (!clientId || chatName) return
    try {
      const name = await fetchChatIdentity(clientId)
      if (name && !chatName) {
        chatName = name
        try {
          localStorage.setItem('chatName', chatName)
        } catch {
          /* ignore */
        }
        if (open.value) setPhase('message')
      }
    } catch {
      /* ignore */
    }
  })()
  return identityPromise
}

async function resolveClientId(): Promise<string> {
  if (clientId) return clientId
  try {
    clientId = localStorage.getItem('visitorId') || ''
    if (!clientId) {
      clientId = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2)
      localStorage.setItem('visitorId', clientId)
    }
  } catch {
    clientId = Date.now().toString(36) + Math.random().toString(36).slice(2)
  }
  return clientId
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  const val = input.value.trim()
  if (!val) return

  if (phase.value === 'name') {
    if (containsLink(val)) {
      setPrompt("name can't contain a link")
      return
    }
    chatName = val
    try {
      localStorage.setItem('chatName', chatName)
    } catch {
      /* ignore */
    }
    setPhase('message')
    void rememberChatName(chatName)
    return
  }

  if (containsLink(val) || containsLink(chatName)) {
    setPrompt("links aren't allowed in chat")
    return
  }
  if (Date.now() - lastSent < SEND_COOLDOWN) {
    setPrompt('easy — give it a sec…')
    return
  }

  input.value = ''
  try {
    const msg = await postChatMessage({
      name: chatName,
      message: val,
      client_id: clientId,
      location: myLocation,
      ip: myIp,
      device: myDevice,
    })
    addMessage(msg)
    totalCount.value += 1
    trimMessages()
    startCooldown()
    smoothScrollBottom()
    updateFades()
    inputEl.value?.focus()
  } catch (err) {
    const reason = (err as Error & { reason?: string }).reason
    if (reason === 'link') setPrompt("links aren't allowed in chat")
    else if (reason === 'cooldown') setPrompt('easy — give it a sec…')
    else if (reason === 'blocked') {
      setPrompt("let's keep it kind — opening a guide for you")
      window.open(KIND_URL, '_blank', 'noopener')
    } else if (reason === 'disabled') {
      // Admin turned the chat off while it was open — flip to the notice.
      chatEnabled.value = false
      stopStream()
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      if (timeTimer) {
        clearInterval(timeTimer)
        timeTimer = null
      }
    } else {
      input.value = val // let them retry
    }
  }
}

// ── Open / close ──────────────────────────────────────────────────
function openChat(): void {
  closing.value = false
  open.value = true
  document.documentElement.style.overflow = 'hidden'
  myDevice = detectDevice()

  // The admin can turn the chat off from Preferences — check first so a
  // disabled chat renders the notice instead of the wall + input.
  void fetchCommunityChatEnabled().then((ok) => {
    chatEnabled.value = ok
    if (!ok) return

    // Render a cached snapshot instantly, then refresh with the live fetch.
    const cache = readCache()
    if (cache && messages.value.length === 0) {
      for (const m of cache.messages) addMessage(m)
      totalCount.value = cache.total
    }

    void resolveClientId().then(() => {
      void loadRememberedIdentity()
    })
    void collectLocation()
    void load(messages.value.length === 0)
    // The PHP built-in dev server pins one worker per open SSE stream and
    // WEDGES (every request hangs, incl. the API) once streams stack up. The
    // 8s poll below is a complete fallback, so skip the stream locally.
    // Production (Cloudflare Pages Functions) handles SSE fine — keep it there.
    if (!import.meta.env.DEV) startStream()
    setPhase(chatName ? 'message' : 'name')
    void nextTick(() => inputEl.value?.focus())
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(() => void load(false), 8000)
    if (timeTimer) clearInterval(timeTimer)
    timeTimer = setInterval(() => updateTimes(), 20000)
  })
}

function closeChat(): void {
  if (!open.value || closing.value) return
  document.documentElement.style.overflow = ''
  stopStream()
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (timeTimer) {
    clearInterval(timeTimer)
    timeTimer = null
  }
  closing.value = true
  setTimeout(() => {
    open.value = false
    closing.value = false
  }, 380)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && open.value) closeChat()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  if (messagesEl.value) messagesEl.value.addEventListener('scroll', updateFades, { passive: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = ''
  stopStream()
  if (pollTimer) clearInterval(pollTimer)
  if (timeTimer) clearInterval(timeTimer)
  if (hintTimer.value) clearTimeout(hintTimer.value)
})

defineExpose({ openChat })

// ── Template data helpers ─────────────────────────────────────────
function deviceSvg(label: string | null): string {
  return deviceIcon(label || '')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      :class="['fixed inset-0 z-[110] flex items-center justify-start p-6', closing ? 'is-closing' : '']"
      role="dialog"
      aria-modal="true"
      aria-label="Community chat"
    >
      <div
        class="absolute inset-0 bg-transparent backdrop-blur-xl transition-opacity duration-300"
        :class="closing ? 'opacity-0' : 'opacity-100'"
        @click="closeChat"
      ></div>

      <div
        class="chat-panel relative z-[1] flex w-full max-w-[640px] flex-col pl-[clamp(1.5rem,9vw,8rem)] pr-4 transition-all duration-500"
        :class="closing ? 'translate-y-2.5 opacity-0' : 'translate-y-0 opacity-100'"
      >
        <p class="mb-4 font-pixel text-[clamp(1.6rem,4vw,2.2rem)] leading-[1.1] text-ink lowercase">
          community chat
        </p>

        <!-- presence count -->
        <div v-if="chatEnabled" class="mb-2 flex items-center gap-1.5 pl-1 font-mono text-[11px] text-gray-400">
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 5.5h16v10H10l-4.5 4v-4H4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
          </svg>
          <span v-if="totalCount > 0">{{ totalCount }} {{ totalCount === 1 ? 'message' : 'messages' }}</span>
        </div>

        <!-- messages -->
        <div
          v-if="chatEnabled"
          ref="messagesEl"
          class="chat-scroll flex max-h-[min(340px,50vh)] min-h-[120px] flex-col gap-3 overflow-y-auto pr-2"
        >
          <div v-if="messages.length === 0" class="my-auto font-mono text-[14px] text-gray-400">
            No messages yet — say hi ✦
          </div>

          <div
            v-for="m in messages"
            :key="m.id"
            class="chat-item flex max-w-[92%] items-end gap-2"
          >
            <img
              class="mb-0.5 ml-1 h-7 w-7 shrink-0 rounded-full bg-gray-100 shadow-[0_0_0_1px_rgba(10,10,10,0.08)]"
              :src="avatarUrl(m.name)"
              :alt="`${m.name} avatar`"
              loading="lazy"
            />
            <div class="flex min-w-0 flex-col gap-0.5">
              <div class="flex flex-wrap items-center gap-1.5 pl-1 font-mono text-[11px] text-gray-500">
                <span class="font-semibold text-gray-600">{{ m.name }}</span>
                <span v-if="m.device" class="text-gray-400" v-html="deviceSvg(m.device)"></span>
                <span class="text-gray-300">·</span>
                <span class="text-[9.5px] text-gray-400">{{ timeAgo(m.created_at) }}</span>
              </div>
              <div
                class="whitespace-pre-wrap break-words rounded-[15px] rounded-bl-[5px] bg-gray-200 px-3 py-2 font-sans text-[13px] leading-[1.55] text-ink dark:bg-gray-200"
              >
                {{ m.message }}
              </div>
            </div>
          </div>
        </div>

        <!-- turned off — admin disabled the chat from Preferences -->
        <div
          v-else
          class="flex min-h-[120px] max-h-[min(340px,50vh)] flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-gray-200 px-6 py-8 text-center"
        >
          <MessageSquareOff class="h-6 w-6 text-gray-300" :stroke-width="1.5" />
          <p class="font-pixel text-[15px] text-gray-400">Community chat has been turned off</p>
          <p class="font-mono text-[11px] leading-relaxed text-gray-400">
            New messages are paused — check back soon
          </p>
        </div>

        <!-- input -->
        <form v-if="chatEnabled" class="mt-7 flex max-w-[92%] flex-col gap-2.5" @submit="onSubmit">
          <p class="font-mono text-[12.5px] text-gray-500">
            {{ phase === 'name' ? "What's your name?" : `Chatting as ` }}
            <b v-if="phase === 'message'" class="text-ink">{{ chatName }}</b>
          </p>
          <div class="flex items-center gap-3">
            <input
              ref="inputEl"
              v-model="input"
              type="text"
              :placeholder="phase === 'name' ? 'Your name' : 'Say something…'"
              :maxlength="phase === 'name' ? 40 : 500"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              class="min-w-0 flex-1 border-none bg-transparent p-1 font-mono text-[16px] text-ink outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              :disabled="sendDisabled"
              class="flex-none p-1 font-mono text-[12px] text-gray-500 transition-colors hover:text-ink disabled:opacity-35"
            >
              <LoaderCircle
                v-if="sendDisabled"
                class="inline-block h-3.5 w-3.5 animate-spin align-middle"
                :stroke-width="1.8"
              />
              <span v-else>{{ phase === 'name' ? 'Next →' : 'Send →' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* fade masks when the message list overflows */
.chat-scroll {
  scrollbar-width: none;
}
.chat-scroll::-webkit-scrollbar {
  display: none;
}
.chat-scroll.chat-fade-top:not(.chat-fade-bottom) {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 30px);
  mask-image: linear-gradient(to bottom, transparent 0, #000 30px);
}
.chat-scroll.chat-fade-bottom:not(.chat-fade-top) {
  -webkit-mask-image: linear-gradient(to top, transparent 0, #000 30px);
  mask-image: linear-gradient(to top, transparent 0, #000 30px);
}
.chat-scroll.chat-fade-top.chat-fade-bottom {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 30px, #000 calc(100% - 30px), transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 30px, #000 calc(100% - 30px), transparent 100%);
}
</style>
