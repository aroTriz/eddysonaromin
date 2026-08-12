<script setup lang="ts">
/**
 * /aromin/private-chat — admin inbox for the visitor ↔ admin DMs.
 * Left: visitor threads (unread badges, last message). Right: the thread
 * where the admin replies. Live via a Bearer-auth SSE stream with a 3s
 * poll fallback; the thread list refreshes every 10s.
 *
 * Unread visitor messages are RED + bold (thread list badge, preview and
 * bubble) — the moment they're read the red + bold clears. Supports image
 * + file attachments and a visitor typing indicator.
 */
import {
  ArrowLeft,
  FileImage,
  MessageSquareDashed,
  Paperclip,
  Send,
  X,
} from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import AdminLayout from './AdminLayout.vue'
import ChatAttachment from '@/components/chat/ChatAttachment.vue'
import {
  fetchAdminPrivateConversations,
  fetchAdminPrivateMessages,
  fetchAdminTyping,
  markAdminPrivateRead,
  sendAdminPrivateMessage,
  sendAdminTyping,
  type AdminPrivateConversation,
  type AdminPrivateMessage,
  type ChatAttachment as Attachment,
} from '@/services/adminApi'
import { fileToAttachment } from '@/utils/attachments'

const conversations = ref<AdminPrivateConversation[]>([])
const loading = ref(true)
const error = ref('')
const mobileView = ref<'list' | 'chat'>('list')

const active = ref<AdminPrivateConversation | null>(null)
const messages = ref<AdminPrivateMessage[]>([])
const messagesLoading = ref(false)
const reply = ref('')
const replyBusy = ref(false)
const replyError = ref('')
const threadError = ref('')
const messagesEl = ref<HTMLDivElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFile = ref<Attachment | null>(null)

// Typing
const typingUsers = ref<{ id: number; name: string }[]>([])
const typingNow = ref(false)
let typingInputActive = false
let typingBeatAt = 0
let lastInputAt = 0

let listTimer: ReturnType<typeof setInterval> | null = null
let convTimer: ReturnType<typeof setInterval> | null = null
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

function dayLabel(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// -- List -----------------------------------------------------------
async function loadList(force = false): Promise<void> {
  if (!force && loading.value) return
  loading.value = true
  error.value = ''
  try {
    conversations.value = await fetchAdminPrivateConversations()
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

// -- Thread ---------------------------------------------------------
async function openThread(conv: AdminPrivateConversation): Promise<void> {
  active.value = conv
  messages.value = []
  seenIds = new Set()
  mobileView.value = 'chat'
  replyError.value = ''
  threadError.value = ''
  void loadMessages(conv.id, true)
  void refreshTyping()
  startConvTimer()
}

function backToList(): void {
  stopConvTimer()
  active.value = null
  messages.value = []
  typingUsers.value = []
  typingNow.value = false
  pendingFile.value = null
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
      threadError.value = ''
      markReadDebounced(convId)
    } else {
      maybeScroll()
      markReadDebounced(convId)
    }
  } catch (err) {
    if (initial) {
      threadError.value = err instanceof Error ? err.message : "couldn't load messages"
    }
  } finally {
    messagesLoading.value = false
  }
}

function startConvTimer(): void {
  if (convTimer) clearInterval(convTimer)
  // 2s poll — live by design; never blocks the single-threaded Windows
  // dev server the way an open SSE stream would.
  convTimer = setInterval(() => {
    if (active.value) {
      void loadMessages(active.value.id, false)
      void refreshTyping()
      maybeKeepTypingAlive()
    }
  }, 2000)
}

/** Keep the "typing" heartbeat alive while text sits in the box. */
function maybeKeepTypingAlive(): void {
  const hasText = reply.value.trim().length > 0
  if (hasText && Date.now() - lastInputAt < 60_000) {
    if (Date.now() - typingBeatAt >= 2500) {
      typingBeatAt = Date.now()
      void sendTyping(true)
    }
  } else if (!hasText && typingInputActive) {
    stopTyping()
  }
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

function markReadDebounced(convId: number): void {
  if (readTimer) clearTimeout(readTimer)
  readTimer = setTimeout(() => {
    void markAdminPrivateRead(convId)
      .then(() => {
        // Mark local visitor messages read → red + bold styling clears.
        const stamp = new Date().toISOString()
        const visitorId = active.value?.visitor.id
        messages.value = messages.value.map((m) =>
          m.sender_id === visitorId && !m.read_at ? { ...m, read_at: stamp } : m,
        )
        const idx = conversations.value.findIndex((c) => c.id === convId)
        if (idx !== -1 && conversations.value[idx].unread > 0) {
          conversations.value[idx] = { ...conversations.value[idx], unread: 0 }
        }
      })
      .catch(() => {})
  }, 400)
}

function retryThread(): void {
  const id = active.value?.id
  if (id) void loadMessages(id, true)
}

// -- Reply (text + attachment) --------------------------------------
async function onPickFile(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  replyError.value = ''
  try {
    pendingFile.value = await fileToAttachment(file)
  } catch (err) {
    replyError.value = err instanceof Error ? err.message : "couldn't read that file"
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

function clearPending(): void {
  pendingFile.value = null
}

async function sendReply(e: Event): Promise<void> {
  e.preventDefault()
  const val = reply.value.trim()
  const attachment = pendingFile.value
  if ((!val && !attachment) || !active.value || replyBusy.value) return
  stopTyping()
  reply.value = ''
  pendingFile.value = null
  replyError.value = ''
  replyBusy.value = true
  try {
    const msg = await sendAdminPrivateMessage(active.value.id, val, attachment)
    addMessage(msg)
    scrollBottom()
  } catch (err) {
    reply.value = val
    pendingFile.value = attachment
    replyError.value = err instanceof Error ? err.message : "couldn't send — try again"
  } finally {
    replyBusy.value = false
  }
}

  // -- Typing (admin ↔ visitor heartbeat) -----------------------------
function onReplyInput(): void {
  lastInputAt = Date.now()
  const hasText = reply.value.trim().length > 0
  if (hasText && !typingInputActive) {
    typingInputActive = true
    typingBeatAt = Date.now()
    void sendTyping(true)
    return
  }
  if (hasText && Date.now() - typingBeatAt > 2500) {
    typingBeatAt = Date.now()
    void sendTyping(true)
  }
}

function stopTyping(): void {
  if (typingInputActive) {
    typingInputActive = false
    void sendTyping(false)
  }
}

async function sendTyping(typing: boolean): Promise<void> {
  const id = active.value?.id
  if (!id) return
  try {
    await sendAdminTyping(id, typing)
  } catch {
    /* best effort */
  }
}

async function refreshTyping(): Promise<void> {
  const conv = active.value
  if (!conv) return
  try {
    const users = await fetchAdminTyping(conv.id)
    // Only the visitor's typing matters here — the admin's own heartbeats
    // exist for the visitor's indicator.
    typingUsers.value = users.filter((u) => u.id === conv.visitor.id)
    typingNow.value = typingUsers.value.length > 0
  } catch {
    /* best effort */
  }
}

// -- Live: 2s poll (messages + typing) ------------------------------
// Live updates flow through startConvTimer() above — no SSE: an open
// Server-Sent Events stream blocks every other request on the Windows
// single-threaded PHP dev server, which made the chat feel like it
// needed a refresh. Polling every 2s feels just as live and never blocks.

onMounted(() => {
  void loadList(true)
  startListTimer()
})

onBeforeUnmount(() => {
  stopConvTimer()
  stopTyping()
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
    <div class="flex h-[min(640px,calc(100dvh-14rem))] min-h-[420px] overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-300 dark:bg-gray-100">
      <!-- -- Thread list -- -->
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
            no visitor conversations yet.<br />the first DM will show up here
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
                <p class="truncate font-mono text-[12px] text-ink" :class="c.unread > 0 ? 'font-bold' : 'font-semibold'">
                  {{ c.visitor.name }}
                </p>
                <span class="shrink-0 font-mono text-[9.5px] text-gray-400">
                  {{ c.last_message ? timeAgo(c.last_message.created_at) : '' }}
                </span>
              </div>
              <p class="truncate font-mono text-[10px] text-gray-400">{{ c.visitor.email }}</p>
              <div class="mt-0.5 flex items-center justify-between gap-2">
                <p class="truncate font-mono text-[11px]" :class="c.unread > 0 ? 'font-bold text-red-600' : 'text-gray-500'">
                  <template v-if="c.last_message">
                    <span v-if="c.last_message.sender_id !== c.visitor.id" class="text-gray-400">you: </span>
                    <template v-if="c.last_message.attachment">
                      {{ c.last_message.attachment.kind === 'image' ? '[image] ' : '[file] ' }}
                    </template>{{ c.last_message.message }}
                  </template>
                  <template v-else>no messages yet</template>
                </p>
                <span
                  v-if="c.unread > 0"
                  class="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 font-mono text-[10px] font-bold leading-none text-white"
                >
                  {{ c.unread > 99 ? '99+' : c.unread }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <!-- -- Thread window -- -->
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
              <p class="truncate font-mono text-[10px]">
                <span v-if="typingNow" class="text-red-600">{{ typingUsers.map((u) => u.name).join(', ') }} is typing…</span>
                <span v-else class="text-gray-400">{{ active.visitor.email }}</span>
              </p>
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
            <div v-else-if="threadError" class="m-auto max-w-[280px] text-center">
              <p class="font-mono text-[11.5px] leading-relaxed text-red-500">// {{ threadError }}</p>
              <button
                type="button"
                class="mt-2.5 rounded-md border border-gray-200 px-3.5 py-1.5 font-mono text-[11px] text-ink transition-colors hover:bg-gray-100 dark:border-gray-300 dark:hover:bg-gray-200"
                @click="retryThread"
              >
                try again
              </button>
            </div>
            <div v-else-if="messages.length === 0" class="m-auto text-center">
              <p class="font-pixel text-[15px] text-gray-400">no messages yet</p>
              <p class="mt-1 font-mono text-[11px] text-gray-400">say hi back — start the conversation</p>
            </div>

            <!-- visitor messages LEFT (unread = red + bold), admin RIGHT -->
            <template v-for="(m, i) in messages" :key="m.id">
              <div
                v-if="i === 0 || dayLabel(m.created_at) !== dayLabel(messages[i - 1].created_at)"
                class="my-2 self-center rounded-full border border-gray-200 bg-white px-3 py-1 font-mono text-[9.5px] text-gray-400 dark:border-gray-300 dark:bg-gray-100"
              >
                {{ dayLabel(m.created_at) }}
              </div>
              <div class="flex w-full" :class="m.sender_id === active.visitor.id ? 'justify-start' : 'justify-end'">
                <div
                  class="flex max-w-[78%] flex-col sm:max-w-[68%]"
                  :class="m.sender_id === active.visitor.id ? 'items-start' : 'items-end'"
                >
                  <div
                    class="flex max-w-full flex-col gap-1.5 px-3.5 py-2 font-sans text-[13.5px] leading-relaxed"
                    :class="m.sender_id === active.visitor.id
                      ? [
                          'rounded-2xl rounded-bl-md border border-gray-200 bg-white text-ink dark:border-gray-300 dark:bg-gray-200',
                          !m.read_at ? 'font-bold text-red-600' : '',
                        ]
                      : 'rounded-2xl rounded-br-md bg-ink text-bg'"
                  >
                    <ChatAttachment
                      v-if="m.attachment"
                      :attachment="m.attachment"
                      :dark="m.sender_id !== active.visitor.id"
                    />
                    <p v-if="m.message" class="whitespace-pre-wrap break-words">
                      {{ m.message }}
                    </p>
                  </div>
                  <span class="mt-1 px-1 font-mono text-[9.5px] text-gray-400">
                    {{ clock(m.created_at) }}<template v-if="m.sender_id === active.visitor.id && !m.read_at"> · <span class="text-red-500">unread</span></template>
                  </span>
                </div>
              </div>
            </template>

            <!-- visitor typing indicator -->
            <div v-if="typingNow" class="flex w-full justify-start">
              <div class="flex items-center gap-2 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3.5 py-2.5 dark:border-gray-300 dark:bg-gray-200">
                <span class="typing-dots"><i></i><i></i><i></i></span>
                <span class="font-mono text-[10.5px] text-gray-400">
                  {{ typingUsers.map((u) => u.name).join(', ') }} is typing…
                </span>
              </div>
            </div>
          </div>

          <!-- reply bar -->
          <div class="border-t border-gray-200 px-4 py-3 dark:border-gray-300">
            <p v-if="replyError" class="mb-2 px-1 font-mono text-[10.5px] leading-relaxed text-red-500">
              // {{ replyError }}
            </p>

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
                <span class="text-gray-400">· {{ (pendingFile.size / 1024).toFixed(1) }} KB</span>
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

            <form class="flex items-center gap-2.5" @submit="sendReply">
              <input
                ref="fileInput"
                type="file"
                class="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.xls,.xlsx,.ppt,.pptx"
                @change="onPickFile"
              />
              <button
                type="button"
                class="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:text-ink dark:border-gray-300"
                aria-label="Attach a file or image"
                title="Attach a file or image (max 2.5MB)"
                @click="fileInput?.click()"
              >
                <Paperclip class="h-4 w-4" :stroke-width="1.7" />
              </button>
              <input
                v-model="reply"
                type="text"
                maxlength="2000"
                autocomplete="off"
                placeholder="reply as the admin…"
                class="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 font-mono text-[16px] text-ink outline-none transition-colors focus:border-gray-400 dark:border-gray-300"
                @input="onReplyInput"
                @blur="stopTyping"
              />
              <button
                type="submit"
                :disabled="(!reply.trim() && !pendingFile) || replyBusy"
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-bg transition-opacity hover:opacity-80 disabled:opacity-30"
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
