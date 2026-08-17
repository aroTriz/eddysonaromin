<script setup lang="ts">
/**
 * AskTrizOverlay — same design as Command (AskAnything overlay) but
 * answers questions using the AI API instead of revealing browser info.
 *
 * Flow:
 *  1. Type a question, press Enter.
 *  2. The typed query appears as a chat bubble; the input field hides.
 *  3. "thinking..." → "analyzing..." (shimmer).
 *  4. Calls /api/v1/ask → AI answer.
 *  5. Displays the answer line by line using setTitle().
 */
import { onMounted, onUnmounted, ref } from 'vue'

const open = ref(false)
const isOpen = ref(false)
const input = ref('')
const busy = ref(false)
const caretVisible = ref(true)
const fieldVisible = ref(true)
const titleText = ref('Ask me anything')
const isShimmer = ref(false)
const bubbleOn = ref(false)
const bubbleText = ref('')

const titleEl = ref<HTMLElement | null>(null)
const textInput = ref<HTMLInputElement | null>(null)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function setTitle(text: string, pulse = false): Promise<void> {
  if (!titleEl.value) return
  titleEl.value.style.transition = 'opacity .25s ease, transform .3s cubic-bezier(.16,1,.3,1)'
  titleEl.value.style.opacity = '0'
  titleEl.value.style.transform = 'translateY(6px)'
  await sleep(240)
  titleText.value = text
  isShimmer.value = pulse
  titleEl.value.style.opacity = '1'
  titleEl.value.style.transform = 'none'
  if (!pulse) await sleep(300)
}

async function submit(): Promise<void> {
  const query = input.value.trim()
  if (!query || busy.value) return
  busy.value = true

  // typed query becomes a chat bubble; hide the input field
  bubbleText.value = query
  bubbleOn.value = true
  fieldVisible.value = false

  await setTitle('thinking...', true)
  await sleep(1900)
  await setTitle('analyzing...', true)
  await sleep(1500)

  // Call the AI endpoint
  let answer = ''
  try {
    const res = await fetch('/api/v1/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ question: query }),
    })
    const data = await res.json() as { answer?: string; error?: string }
    answer = data.answer ?? data.error ?? 'Sorry, no response.'
  } catch {
    answer = "Sorry, I'm having trouble reaching the AI right now."
  }

  // Clear bubble, show answer line by line
  bubbleOn.value = false
  isShimmer.value = false
  titleText.value = ''

  const lines = answer.split('\n').filter((l) => l.trim())
  if (lines.length === 0) lines.push(answer || 'No response received.')

  for (const line of lines) {
    await setTitle(line)
    await sleep(2500)
  }

  await sleep(1000)
  close()
}

function openAsk(): void {
  open.value = true
  isOpen.value = false
  busy.value = false
  input.value = ''
  fieldVisible.value = true
  bubbleOn.value = false
  bubbleText.value = ''
  isShimmer.value = false
  titleText.value = 'Ask me anything'
  document.documentElement.style.overflow = 'hidden'
  requestAnimationFrame(() => {
    isOpen.value = true
    setTimeout(() => textInput.value?.focus(), 60)
  })
}

function close(): void {
  isOpen.value = false
  document.documentElement.style.overflow = ''
  textInput.value?.blur()
  setTimeout(() => {
    open.value = false
    busy.value = false
  }, 250)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  // ⌘K keyboard shortcut is handled by AppShell.vue (respects askTrizEnabled toggle)
  setInterval(() => {
    caretVisible.value = !caretVisible.value
  }, 530)
})

onUnmounted(() => {
  document.documentElement.style.overflow = ''
})

defineExpose({ openAsk })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-start p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ask Triz.ai"
      @keydown="onKeydown"
    >
      <!-- blurred backdrop — pure blur, no dark overlay -->
      <div
        class="absolute inset-0 bg-transparent backdrop-blur-xl transition-opacity duration-300"
        :class="isOpen ? 'opacity-100' : 'opacity-0'"
        @click="close"
      ></div>

      <!-- content -->
      <div
        class="relative z-10 flex w-full max-w-[760px] flex-col items-start gap-6 pl-0 text-left transition-all duration-300 sm:pl-[9vw]"
        :class="isOpen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'"
        @click="textInput?.focus()"
      >
        <!-- chat bubble with the typed query -->
        <div
          class="ask-bubble"
          :class="{ 'is-on': bubbleOn }"
        >
          {{ bubbleText }}
        </div>

        <!-- title (cycles through messages) -->
        <h2
          ref="titleEl"
          class="font-pixel text-[clamp(1.9rem,5.5vw,3.4rem)] leading-tight text-ink"
          :class="{ 'ask-title-small text-[clamp(1.25rem,3.4vw,1.95rem)]': fieldVisible === false || isShimmer }"
        >
          {{ titleText }}
        </h2>

        <!-- typing field — hidden after submit -->
        <div
          v-show="fieldVisible && !busy"
          class="flex items-center font-mono text-[clamp(1.05rem,3vw,1.5rem)] text-gray-500"
        >
          <span class="whitespace-pre-wrap break-words">{{ input }}</span>
          <span
            class="ml-1 inline-block h-[1.2em] w-[2px] bg-gray-500"
            :style="{ opacity: caretVisible ? 1 : 0 }"
          ></span>
        </div>

        <input
          ref="textInput"
          v-model="input"
          class="absolute h-px w-px border-0 p-0 text-[16px] opacity-0"
          type="text"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          aria-label="Type your question"
          @keydown.enter.prevent="submit"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ask-bubble {
  display: none;
  position: relative;
  margin-left: 11px;
  max-width: min(85vw, 600px);
  background: rgb(var(--g200));
  color: rgb(var(--ink));
  font-family: var(--font-mono);
  font-size: clamp(0.95rem, 2.6vw, 1.2rem);
  line-height: 1.45;
  padding: 10px 15px;
  border-radius: 14px;
  border-top-left-radius: 5px;
  word-break: break-word;
}
.ask-bubble.is-on {
  display: block;
  animation: bubble-in 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes bubble-in {
  from {
    opacity: 0;
    transform: translateY(3px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
