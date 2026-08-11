<script setup lang="ts">
/**
 * /aromin/private-chat — admin inbox for the visitor ↔ admin DMs.
 * Left: visitor threads (unread badges, last message). Right: the thread
 * where the admin replies. Live via a Bearer-auth SSE stream with an 8s
 * poll fallback; the thread list refreshes every 10s.
 */
import { ArrowLeft, MessageSquareDashed, Send } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import { getToken } from '@/composables/useAuth'
import {
  adminPrivateStreamUrl,
  fetchAdminPrivateConversations,
  fetchAdminPrivateMessages,
  markAdminPrivateRead,
  sendAdminPrivateMessage,
  type AdminPrivateConversation,
  type AdminPrivateMessage,
} from '@/services/adminApi'

const conversations = ref<AdminPrivateConversation[]>([])
const loading = ref(true)
const error = ref('')
const mobileView = ref<'list' | 'chat'>('list')

const active = ref<AdminPrivateConversation | null>(null)
const messages = ref<AdminPrivateMessage[]>([])
const messagesLoading = ref(false)
const reply = ref('')
const replyBusy = ref(false)
const messagesEl = ref<HTMLDivElement | null>(null)

let listTimer: ReturnType<typeof setInterval> | null = null
let convTimer: ReturnType<typeof setInterval> | null = null
let streamCtrl: AbortController | null = null
let readTimer: ReturnType<typeof setTimeout> | null = null
let seenIds = new Set<number>()

function avatarUrl(name: string): string {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    name || 'anon',
  )}&radius=50&backgroundColor=f1f1f1`
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (isNaN(then)) return ''
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (s < 10) return 'now'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function clock(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// ── List ───────────────────────────────────────────────────────────
async function loadList(force = false): Promise<void> {
  if (!force && loading.value) return
  loading.value = true
  error.value = ''
  try {
    conversations.value = await fetchAdminPrivateConversations()
    // Keep the open thread fresh (unread/preview).
    if (active.value) {
      const fresh = conversations.value.find((c) => c.id === active.value!.id)
      if (fresh) active.value = fresh
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load conversations'
  } finally {
    loading.value = false
  }
}

function startListTimer(): void {
  if (listTimer) clearInterval(listTimer)
  listTimer = setInterval(() => void loadList(false), 10_000)
}

// ── Thread ─────────────────────────────────────────────────────────
async function openThread(conv: AdminPrivateConversation): Promise<void> {
  active.value = conv
  messages.value = []
  seenIds = new Set()
  mobileView.value = 'chat'
  void loadMessages(conv.id, true)
  startStream()
  startConvTimer()
}

function backToList(): void {
  stopStream()
  stopConvTimer()
  active.value = null
  messages.value = []
  mobileView.value = 'list'
  void loadList(true)
}

async function loadMessages(convId: number, initial: boolean): Promise<void> {
  messagesLoading.value = true
  try {
    const lastId = messages.value.length ? messages.value[messages.value.length - 1].id : 0
    const fresh = await fetchAdminPrivateMessages(convId, initial ? 0 : lastId)
    fresh.forEach(addMessage)
    if (initial) {
      scrollBottom()
      markReadDebounced(convId)
    } else {
      maybeScroll()
      markReadDebounced(convId)
    }
  } catch {
    /* transient — poll retries */
  } finally {
    messagesLoading.value = false
  }
}

function startConvTimer(): void {
  if (convTimer) clearInterval(convTimer)
  convTimer = setInterval(() => {
    if (active.value) void loadMessages(active.value.id, false)
  }, 8000)
}

function stopConvTimer(): void {
  if (convTimer) {
    clearInterval(convTimer)
    convTimer = null
  }
}

function addMessage(m: AdminPrivateMessage): void {
  if (seenIds.has(m.id)) return
  seenIds.add(m.id)
  messages.value.push(m)
  const conv = active.value
  if (conv) {
    const idx = conversations.value.findIndex((c) => c.id === conv.id)
    if (idx !== -1) {
      conversations.value[idx] = {
        ...conversations.value[idx],
        last_message: m,
        unread: m.sender_id === conv.visitor.id ? 0 : conversations.value[idx].unread,
      }
    }
  }
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

function markReadDebounced(convId: number): void {
  if (readTimer) clearTimeout(readTimer)
  readTimer = setTimeout(() => {
    void markAdminPrivateRead(convId)
      .then(() => {
        const idx = conversations.value.findIndex((c) => c.id === convId)
        if (idx !== -1 && conversations.value[idx].unread > 0) {
          conversations.value[idx] = { ...conversations.value[idx], unread: 0 }
        }
      })
      .catch(() => {
        /* best effort */
      })
  }, 400)
}

// ── Reply ──────────────────────────────────────────────────────────
async function sendReply(e: Event): Promise<void> {
  e.preventDefault()
  const val = reply.value.trim()
  if (!val || !active.value || replyBusy.value) return
  reply.value = ''
  replyBusy.value = true
  try {
    const msg = await sendAdminPrivateMessage(active.value.id, val)
    addMessage(msg)
    scrollBottom()
  } catch {
    reply.value = val // let them retry
  } finally {
    replyBusy.value = false
  }
}

// ── Live stream ────────────────────────────────────────────────────
function startStream(): void {
  stopStream()
  const conv = active.value
  if (!conv) return
  const token = getToken()
  const lastId = messages.value.length ? messages.value[messages.value.length - 1].id : 0
  if (!token) return

  const ctrl = new AbortController()
  streamCtrl = ctrl

  void (async () => {
    try {
      const res = await fetch(adminPrivateStreamUrl(conv.id, lastId), {
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
                const m = JSON.parse(line.slice(6)) as AdminPrivateMessage
                if (m && m.id) {
                  addMessage(m)
                  if (active.value && m.sender_id === active.value.visitor.id) markReadDebounced(active.value.id)
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

onMounted(() => {
  void loadList(true)
  startListTimer()
})

onBeforeUnmount(() => {
  stopStream()
  stopConvTimer()
  if (listTimer) clearInterval(listTimer)
  if (readTimer) clearTimeout(readTimer)
})
</script>

<template>
  <AdminLayout active="aromin-private-chat" wide>
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 class="font-pixel text-[clamp(1.6rem,4.5vw,2.2rem)] leading-tight text-ink">
          private messages<span class="text-gray-400">.</span>
        </h1>
        <p class="mt-1.5 font-mono text-[12px] text-gray-500">
          // visitor DMs — reply as the admin
        </p>
      </div>
    </div>

    <p v-if="error" class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-[12px] text-red-600">
      // {{ error }}
    </p>

    <!-- Two-pane inbox: threads (left) + thread (right) -->
    <div class="flex h-[min(600px,calc(100dvh-14rem))] min-h-[380px] overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-300 dark:bg-gray-100">
      <!-- ── Thread list ── -->
      <aside
        :class="[
          'flex w-full flex-col border-gray-200 dark:border-gray-300 sm:w-[300px] sm:shrink-0 sm:border-r',
          mobileView === 'chat' ? 'hidden sm:flex' : 'flex',
        ]"
      >
        <div class="flex items-center gap-2 border-b border-gray-200 px-4 py-3 font-mono text-[11px] text-gray-500 dark:border-gray-300">
          <MessageSquareDashed class="h-3.5 w-3.5" :stroke-width="1.7" />
          <span>// threads ({{ conversations.length }})</span>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <div v-if="loading && conversations.length === 0" class="space-y-2 p-3">
            <div v-for="i in 4" :key="i" class="h-14 animate-pulse rounded-lg border border-gray-200 bg-gray-50"></div>
          </div>
          <p v-else-if="conversations.length === 0" class="px-4 py-10 text-center font-mono text-[11px] leading-relaxed text-gray-400">
            no visitor conversations yet.<br />the first DM will show up here ✦
          </p>
          <button
            v-for="c in conversations"
            :key="c.id"
            type="button"
            class="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-3 text-left transition-colors last:border-b-0 dark:border-gray-200/50"
            :class="active && active.id === c.id
              ? 'bg-gray-100 dark:bg-gray-200'
              : 'hover:bg-gray-50 dark:hover:bg-gray-200/50'"
            @click="openThread(c)"
          >
            <img class="h-9 w-9 shrink-0 rounded-full bg-gray-100" :src="avatarUrl(c.visitor.name)" :alt="`${c.visitor.name} avatar`" loading="lazy" />
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <p class="truncate font-mono text-[12px] font-semibold text-ink">{{ c.visitor.name }}</p>
                <span class="shrink-0 font-mono text-[9.5px] text-gray-400">
                  {{ c.last_message ? timeAgo(c.last_message.created_at) : '' }}
                </span>
              </div>
              <p class="truncate font-mono text-[10px] text-gray-400">{{ c.visitor.email }}</p>
              <div class="mt-0.5 flex items-center justify-between gap-2">
                <p class="truncate font-mono text-[11px] text-gray-500">
                  <template v-if="c.last_message">
                    <span v-if="c.last_message.sender_id !== c.visitor.id" class="text-gray-400">you: </span>{{ c.last_message.message }}
                  </template>
                  <template v-else>no messages yet</template>
                </p>
                <span
                  v-if="c.unread > 0"
                  class="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-ink px-1.5 font-mono text-[10px] font-bold leading-none text-bg"
                >
                  {{ c.unread > 99 ? '99+' : c.unread }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <!-- ── Thread window ── -->
      <section :class="['min-w-0 flex-1 flex-col', mobileView === 'chat' ? 'flex' : 'hidden sm:flex']">
        <!-- empty state -->
        <div v-if="!active" class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 text-gray-300 dark:border-gray-300">
            <Send class="h-5 w-5" :stroke-width="1.5" />
          </div>
          <p class="font-pixel text-[15px] text-gray-400">pick a conversation</p>
          <p class="max-w-[260px] font-mono text-[11px] leading-relaxed text-gray-400">
            choose a visitor thread on the left to read and reply.
          </p>
        </div>

        <template v-else>
          <!-- thread header -->
          <div class="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-300">
            <button
              type="button"
              class="rounded p-1 text-gray-400 transition-colors hover:text-ink sm:hidden"
              aria-label="Back to conversations"
              @click="backToList"
            >
              <ArrowLeft class="h-4.5 w-4.5" :stroke-width="1.7" />
            </button>
            <img class="h-9 w-9 shrink-0 rounded-full bg-gray-100" :src="avatarUrl(active.visitor.name)" :alt="`${active.visitor.name} avatar`" loading="lazy" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-mono text-[13px] font-semibold text-ink">{{ active.visitor.name }}</p>
              <p class="truncate font-mono text-[10px] text-gray-400">{{ active.visitor.email }}</p>
            </div>
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
              <p class="mt-1 font-mono text-[11px] text-gray-400">say hi back — start the conversation ✦</p>
            </div>

            <template v-for="m in messages" :key="m.id">
              <div class="flex w-full" :class="m.sender_id === active.visitor.id ? 'justify-start' : 'justify-end'">
                <div
                  class="flex max-w-[78%] flex-col sm:max-w-[68%]"
                  :class="m.sender_id === active.visitor.id ? 'items-start' : 'items-end'"
                >
                  <div
                    class="whitespace-pre-wrap break-words px-3.5 py-2 font-sans text-[13.5px] leading-relaxed"
                    :class="m.sender_id === active.visitor.id
                      ? 'rounded-2xl rounded-bl-md border border-gray-200 bg-white text-ink dark:border-gray-300 dark:bg-gray-200'
                      : 'rounded-2xl rounded-br-md bg-ink text-bg'"
                  >
                    {{ m.message }}
                  </div>
                  <span class="mt-1 px-1 font-mono text-[9.5px] text-gray-400">{{ clock(m.created_at) }}</span>
                </div>
              </div>
            </template>
          </div>

          <!-- reply bar -->
          <div class="border-t border-gray-200 px-4 py-3 dark:border-gray-300">
            <form class="flex items-center gap-2.5" @submit="sendReply">
              <input
                v-model="reply"
                type="text"
                maxlength="2000"
                autocomplete="off"
                placeholder="reply as the admin…"
                class="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 font-mono text-[13px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
              />
              <button
                type="submit"
                :disabled="!reply.trim() || replyBusy"
                class="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-ink text-bg transition-opacity hover:opacity-80 disabled:opacity-30"
                aria-label="Send reply"
              >
                <Send class="h-4 w-4" :stroke-width="1.8" />
              </button>
            </form>
          </div>
        </template>
      </section>
    </div>
  </AdminLayout>
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
