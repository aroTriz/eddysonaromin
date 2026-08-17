<script setup lang="ts">
/**
 * AskOverlay ΓÇö EXACT replica of bryllim.com's "ask anything" modal (ΓîÿK / Alt+K).
 *
 * Flow:
 *  1. Type a question, press Enter.
 *  2. The typed query appears as a chat bubble; the input field hides.
 *  3. "thinking..." ΓåÆ "analyzing..." (shimmer).
 *  4. Plot twist: "before i answer" ΓÇö reveals EVERYTHING the browser shares:
 *     IP, location, ISP, coordinates, OS, cores, RAM, browser, language,
 *     timezone, time, connection type, referrer ΓÇö collected via ipwho.is.
 *  5. "as for your question" ΓåÆ "i don't want to waste tokens on that" ΓåÆ
 *     opens Google search for the query.
 */
import { onMounted, onUnmounted, ref } from 'vue'

const open = ref(false)
const isOpen = ref(false)
const input = ref('')
const busy = ref(false)
const caretVisible = ref(true)
const fieldVisible = ref(true)
const titleText = ref('What do you want me to do?')
const isShimmer = ref(false)
const bubbleOn = ref(false)
const bubbleText = ref('')

const titleEl = ref<HTMLElement | null>(null)
const textInput = ref<HTMLInputElement | null>(null)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge ' + ((ua.match(/Edg\/(\d+)/) || [])[1] || '')
  if (/OPR\//.test(ua)) return 'Opera ' + ((ua.match(/OPR\/(\d+)/) || [])[1] || '')
  if (/Firefox\//.test(ua)) return 'Firefox ' + ((ua.match(/Firefox\/(\d+)/) || [])[1] || '')
  if (/Chrome\//.test(ua)) return 'Chrome ' + ((ua.match(/Chrome\/(\d+)/) || [])[1] || '')
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari ' + ((ua.match(/Version\/(\d+)/) || [])[1] || '')
  return 'your browser'
}

function detectOS(ua: string): string {
  if (/Windows/.test(ua)) return 'Windows'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Linux/.test(ua)) return 'Linux'
  return 'your device'
}

interface Collected {
  ip: string
  city: string
  region: string
  country: string
  isp: string
  lat: number | null
  lon: number | null
  os: string
  browser: string
  screen: string
  cores: string
  ram: string
  lang: string
  tz: string
  time: string
  conn: string
  referrer: string
}

async function collectData(): Promise<Collected> {
  const ua = navigator.userAgent
  const data: Collected = {
    ip: '', city: '', region: '', country: '', isp: '',
    lat: null, lon: null,
    os: detectOS(ua),
    browser: detectBrowser(ua),
    screen: `${screen.width}├ù${screen.height}`,
    cores: String(navigator.hardwareConcurrency || '?'),
    ram: (navigator as unknown as { deviceMemory?: number }).deviceMemory
      ? `${(navigator as unknown as { deviceMemory: number }).deviceMemory}GB`
      : '',
    lang: navigator.language || 'ΓÇö',
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'ΓÇö',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    conn: (navigator as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType || '',
    referrer: '',
  }

  try {
    if (document.referrer) data.referrer = new URL(document.referrer).hostname
  } catch { /* ignore */ }

  // IP / location / ISP from ipwho.is (same source as the reference)
  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 3500)
    const res = await fetch('https://ipwho.is/', { signal: ctrl.signal })
    clearTimeout(to)
    const j = await res.json()
    if (j && j.success !== false) {
      data.ip = j.ip || ''
      data.city = j.city || ''
      data.region = j.region || ''
      data.country = j.country || ''
      data.isp = (j.connection && j.connection.isp) || j.org || ''
      data.lat = j.latitude ?? null
      data.lon = j.longitude ?? null
      if ((!data.tz || data.tz === 'ΓÇö') && j.timezone && j.timezone.id) data.tz = j.timezone.id
    }
  } catch { /* ignore */ }

  return data
}

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

  const dataPromise = collectData()

  await setTitle('thinking...', true)
  await sleep(1900)
  await setTitle('analyzing...', true)
  await sleep(1500)

  const data = await dataPromise

  // ΓöÇΓöÇ plot twist: interrupt and reveal their data ΓöÇΓöÇ
  bubbleOn.value = false
  isShimmer.value = false
  titleText.value = ''

  const loc = [data.city, data.region, data.country].filter(Boolean).join(', ')
  const msgs = [
    'before i answer',
    'here is what your browser already shared the moment you opened this site',
  ]
  if (loc) msgs.push('you are currently in ' + loc)
  if (data.ip) msgs.push('your public ip address is ' + data.ip)
  if (data.isp) msgs.push('you are connected through ' + data.isp)
  if (data.lat && data.lon) msgs.push(`your approximate coordinates are around ${(+data.lat).toFixed(2)}, ${(+data.lon).toFixed(2)}`)
  msgs.push(`you are on a ${data.os} device with ${data.cores} processor cores` + (data.ram ? ` and ${data.ram} of memory` : ''))
  msgs.push(`you are browsing with ${data.browser} set to ${data.lang}`)
  msgs.push(`your timezone is ${data.tz} and it is around ${data.time} where you are`)
  if (data.conn) msgs.push('you are on a ' + data.conn + ' connection')
  if (data.referrer) msgs.push('you arrived here from ' + data.referrer)
  msgs.push('none of this needed your permission')
  msgs.push('your browser shares it with every website you open, automatically')
  msgs.push('so be mindful of what you click, and who you trust online')

  for (const m of msgs) {
    await setTitle(m)
    await sleep(2500)
  }

  await setTitle('as for your question')
  await sleep(2000)
  await setTitle("Do it yourself")
  await sleep(2200)

  window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank', 'noopener')
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
  titleText.value = 'What do you want me to do?'
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

function onGlobalKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.altKey) && e.key.toLowerCase() === 'j') {
    e.preventDefault()
    openAsk()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  setInterval(() => {
    caretVisible.value = !caretVisible.value
  }, 530)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
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
      aria-label="Ask"
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

        <!-- typing field ΓÇö hidden after submit -->
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
