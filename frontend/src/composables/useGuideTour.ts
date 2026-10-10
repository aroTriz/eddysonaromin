import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

/**
 * useGuideTour — port of bryllim.com's guided-tour arrow ("guideCursor").
 * A cursor arrow glides between [data-guide] targets on a spring with
 * human-like motion (bowed paths, overshoot + correct, idle tremor) while a
 * name tag types each step's message. Desktop + fine-pointer +
 * no-preference only; once per session (or with ?tour); pauses while any
 * dialog/overlay is open; replay prompt afterwards.
 */

declare global {
  interface Window {
    profileGaze?: { look(x: number, y: number): void; release(): void }
  }
}

export interface GuideTourRefs {
  root: Ref<HTMLElement | null>
  tag: Ref<HTMLElement | null>
  nameEl: Ref<HTMLElement | null>
  clip: Ref<HTMLElement | null>
  inner: Ref<HTMLElement | null>
  measure: Ref<HTMLElement | null>
  caret: Ref<HTMLElement | null>
  prompt: Ref<HTMLElement | null>
}

interface TourPoint {
  x: number
  y: number
}

interface TourStep {
  els?: () => Element[]
  at?: 'above' | 'below'
  free?: boolean
  text: string
}

interface GlideMove {
  from: TourPoint
  to: () => TourPoint
  t0: number
  dur: number
  skew: number
  nx: number
  ny: number
  b1: number
  b2: number
  done: () => void
}

interface CharBox {
  right: number
  top: number
  bottom: number
}

interface TextLayout {
  parts: string[]
  chars: HTMLSpanElement[]
  boxes: CharBox[]
  width: number
  height: number
}

const SPRING = 190
const DAMPING = 2 * Math.sqrt(SPRING) * 0.82

const DESKTOP_QUERY =
  '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

const store = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      /* private mode — tour simply won't persist */
    }
  },
}

export function useGuideTour(refs: GuideTourRefs): {
  replay: () => void
  dismiss: () => void
} {
  let running = false
  let raf = 0
  let desktop: MediaQueryList | null = null

  // Engine state (created on mount once the elements exist).
  let root: HTMLElement | null = null
  let tag: HTMLElement | null = null
  let clip: HTMLElement | null = null
  let inner: HTMLElement | null = null
  let measure: HTMLElement | null = null
  let caret: HTMLElement | null = null
  let prompt: HTMLElement | null = null
  let sidebar: Element | null = null

  const goal: TourPoint = { x: 0, y: 0 }
  const shown: TourPoint & { vx: number; vy: number } = { x: 0, y: 0, vx: 0, vy: 0 }
  const waiters: { at: number; done: () => void }[] = []
  let clock = 0
  let last = 0
  let away = false
  let move: GlideMove | null = null
  let rest: (() => TourPoint) | null = null
  let hovered: Element | null = null
  let typing = false
  let tremor = 1
  let entryTimer: ReturnType<typeof setTimeout> | null = null

  const hooks = (key: string): Element[] =>
    Array.from(document.querySelectorAll(`[data-guide="${key}"]`))
  const within = (key: string, selector: string): Element[] =>
    hooks(key).flatMap((el) => Array.from(el.querySelectorAll(selector)))
  const clamp = (v: number, min: number, max: number): number =>
    Math.min(Math.max(v, min), max)
  const rand = (min: number, max: number): number => min + Math.random() * (max - min)

  // The tour, in order. Steps whose targets are off screen are skipped;
  // `free` ones fall back to open space.
  const steps: TourStep[] = [
    { els: () => hooks('name'), at: 'above', free: true, text: "Hi! I'm Eddyson, welcome to my website! :)" },
    { els: () => within('socials', 'a'), at: 'below', text: 'Here are my social links.' },
    { els: () => hooks('stats'), at: 'below', text: 'My journey in numbers — projects, tech, and experience.' },
    { els: () => hooks('nav-blog'), text: 'I write about dev and engineering here.' },
    { els: () => hooks('nav-projects'), text: "Things I've built — apps, games, and AI tools." },
    { els: () => hooks('nav-shop'), text: 'Digital goodies up for grabs.' },
    { els: () => hooks('nav-services'), text: 'Need something built? Start here.' },
    { els: () => hooks('nav-story'), text: 'And the full story: experience, stack, and more.' },
    { els: () => hooks('chat'), text: 'Say hi in the community chat. Other visitors hang out here!' },
    { els: () => hooks('private-chat'), text: 'Or send me a private message here.' },
    { els: () => hooks('email'), text: "Here's my email." },
    { free: true, text: "That's the tour. Scroll around and enjoy your stay!" },
  ]

  function isAway(): boolean {
    return (
      !desktop?.matches ||
      document.querySelector('[role="dialog"]') !== null
    )
  }

  function frame(now: number): void {
    if (!running || !root) return
    const dt = Math.min(now - last, 50)
    last = now
    const nowAway = isAway()
    if (nowAway !== away) {
      away = nowAway
      root.classList.toggle('is-away', away)
    }
    if (!away) {
      clock += dt
      if (move) {
        const p = Math.min((clock - move.t0) / move.dur, 1)
        const u = Math.pow(p, move.skew) // quick launch, long settle
        const e = u * u * u * (u * (u * 6 - 15) + 10) // minimum-jerk: how a hand actually moves
        const to = move.to()
        // bowed (sometimes S-shaped) path
        const side = 3 * (1 - e) * (1 - e) * e * move.b1 + 3 * (1 - e) * e * e * move.b2
        goal.x = move.from.x + (to.x - move.from.x) * e + move.nx * side
        goal.y = move.from.y + (to.y - move.from.y) * e + move.ny * side
        if (p === 1) {
          const { done } = move
          rest = move.to
          move = null
          done()
        }
      } else if (rest) {
        const to = rest() // stay pinned to the target while the page scrolls
        goal.x = to.x
        goal.y = to.y
      }

      const hops = Math.ceil(dt / 12)
      const h = dt / hops / 1000
      for (let i = 0; i < hops; i++) {
        shown.vx += (SPRING * (goal.x - shown.x) - DAMPING * shown.vx) * h
        shown.vy += (SPRING * (goal.y - shown.y) - DAMPING * shown.vy) * h
        shown.x += shown.vx * h
        shown.y += shown.vy * h
      }

      // A resting hand is never perfectly still, but it does let go of the mouse to type.
      tremor += ((typing ? 0 : 1) - tremor) * Math.min(dt / 280, 1)
      const x =
        shown.x +
        (Math.sin(clock / 830 + 1.3) * 1.5 + Math.sin(clock / 310 + 4.1) * 0.6 + Math.sin(clock / 127) * 0.22) * tremor
      const y =
        shown.y +
        (Math.cos(clock / 1010 + 0.4) * 1.3 + Math.sin(clock / 370 + 2.2) * 0.55 + Math.cos(clock / 141 + 5) * 0.2) * tremor
      root.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`
      window.profileGaze?.look(x, y)
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].at <= clock) waiters.splice(i, 1)[0].done()
      }
    }
    raf = requestAnimationFrame(frame)
  }

  const sleep = (ms: number): Promise<void> =>
    new Promise((done) => waiters.push({ at: clock + ms, done }))

  // One continuous stroke to a (live) point, along a path that never bends the same way twice.
  function glide(to: () => TourPoint, dur: number): Promise<void> {
    return new Promise((done) => {
      const from = { x: goal.x, y: goal.y }
      const target = to()
      const dx = target.x - from.x
      const dy = target.y - from.y
      const dist = Math.hypot(dx, dy) || 1
      const b1 = Math.min(dist * rand(0.08, 0.28), 64) * (Math.random() < 0.5 ? -1 : 1)
      const b2 = Math.random() < 0.3 ? -b1 * rand(0.3, 0.8) : b1 * rand(0.4, 1.1)
      move = { from, to, t0: clock, dur, skew: rand(0.72, 0.94), nx: -dy / dist, ny: dx / dist, b1, b2, done }
    })
  }

  // A human reach: lands a few pixels off each time, and on longer trips
  // over- or undershoots before a small corrective nudge.
  async function moveTo(to: () => TourPoint, opts: { direct?: boolean; dur?: number } = {}): Promise<void> {
    const off = { x: rand(-2.5, 2.5), y: rand(-1.5, 1.5) }
    const aim = opts.direct
      ? to
      : (): TourPoint => {
          const t = to()
          return { x: t.x + off.x, y: t.y + off.y }
        }
    const target = aim()
    const dx = target.x - goal.x
    const dy = target.y - goal.y
    const dist = Math.hypot(dx, dy) || 1
    const dur = (opts.dur ?? clamp(210 + Math.sqrt(dist) * 25, 330, 1000)) * rand(0.88, 1.15)
    const roll = Math.random()
    if (opts.direct || dist < 160 || roll > 0.65) return glide(aim, dur)

    const miss = clamp(dist * rand(0.025, 0.06), 5, 22) * (roll < 0.4 ? 1 : -1)
    const drift = rand(-0.5, 0.5) * miss
    const ox = (dx / dist) * miss - (dy / dist) * drift
    const oy = (dy / dist) * miss + (dx / dist) * drift
    await glide(() => {
      const t = aim()
      return { x: t.x + ox, y: t.y + oy }
    }, dur)
    await sleep(rand(40, 110))
    await glide(aim, rand(140, 230))
  }

  function visible(el: Element): boolean {
    const r = el.getBoundingClientRect()
    if (!r.width || r.top < 0 || r.bottom > window.innerHeight) return false
    const scroller = el.closest('.overflow-y-auto')
    if (!scroller) return true
    const s = scroller.getBoundingClientRect()
    return r.top >= s.top && r.bottom <= s.bottom
  }

  function anchor(el: Element, at?: 'above' | 'below'): () => TourPoint {
    return () => {
      const r = el.getBoundingClientRect()
      if (at === 'above') return { x: r.left + 6, y: r.top - 24 }
      if (at === 'below') return { x: r.left + r.width / 2, y: r.bottom + 2 }
      return { x: r.right + 5, y: r.top + r.height / 2 }
    }
  }

  function openSpace(fx: number, fy: number): () => TourPoint {
    const left = sidebar ? sidebar.getBoundingClientRect().right : 0
    const point = { x: left + (window.innerWidth - left) * fx, y: window.innerHeight * fy }
    return () => point
  }

  function setHover(el: Element | null): void {
    if (hovered) hovered.classList.remove('gc-hover')
    hovered = el
    if (hovered) hovered.classList.add('gc-hover')
  }

  // Lay the whole message out up front (hidden) so the bubble can grow with
  // the typing without words jumping between lines.
  function compose(text: string): TextLayout | null {
    if (!measure) return null
    const parts = Array.from(text)
    const chars = parts.map((part) => {
      const span = document.createElement('span')
      span.className = 'gc-ch'
      span.textContent = part
      return span
    })
    measure.replaceChildren(...chars)
    const boxes = chars.map((span) => ({
      right: span.offsetLeft + span.offsetWidth,
      top: span.offsetTop,
      bottom: span.offsetTop + span.offsetHeight,
    }))
    // round the width up: a fraction of a pixel short and the last word wraps differently
    return {
      parts,
      chars,
      boxes,
      width: Math.ceil(measure.getBoundingClientRect().width),
      height: measure.offsetHeight,
    }
  }

  // Flip the bubble above / left of the arrow when it would run off the viewport.
  function place(point: TourPoint, layout: TextLayout, prefer?: 'above' | 'below'): void {
    if (!root || !refs.nameEl.value) return
    const w = Math.max(refs.nameEl.value.offsetWidth, layout.width) + 22
    const h = refs.nameEl.value.offsetHeight + layout.height + 10
    const fitsBelow = point.y + 19 + h + 10 <= window.innerHeight
    const fitsAbove = point.y - h - 10 >= 0
    root.classList.toggle('is-up', fitsAbove && (prefer === 'above' || !fitsBelow))
    root.classList.toggle('is-left', point.x + 16 + w + 10 > window.innerWidth)
  }

  async function type(layout: TextLayout): Promise<void> {
    if (!inner || !caret || !tag || !clip) return
    const clipEl = clip
    inner.style.width = `${layout.width}px`
    inner.replaceChildren(...layout.chars, caret)
    tag.classList.add('is-talking', 'is-typing')
    typing = true
    const pace = rand(0.85, 1.25) // everyone types some sentences faster than others
    let width = 0
    for (let i = 0; i < layout.chars.length; i++) {
      const box = layout.boxes[i]
      const part = layout.parts[i]
      layout.chars[i].classList.add('is-on')
      width = Math.max(width, box.right)
      clipEl.style.width = `${Math.ceil(width) + 2}px`
      clipEl.style.height = `${box.bottom}px`
      caret.style.transform = `translate(${box.right}px,${box.top}px)`
      let wait = rand(7, 20) * pace
      if (/[.!?]/.test(part)) wait = rand(80, 150)
      else if (/[,:]/.test(part)) wait = rand(45, 90)
      else if (part === ' ' && Math.random() < 0.12) wait += rand(60, 150) // thinking of the next word
      else if (Math.random() < 0.07) wait += rand(30, 80) // a small stumble
      await sleep(wait)
    }
    typing = false
    tag.classList.remove('is-typing')
  }

  function hush(): void {
    if (!clip || !tag) return
    clip.style.width = '0px'
    clip.style.height = '0px'
    tag.classList.remove('is-talking', 'is-typing')
  }

  async function say(step: TourStep): Promise<void> {
    const els = step.els ? step.els().filter(visible) : []
    if (els.length === 0 && !step.free) return
    const points = els.length > 0
      ? els.map((el) => anchor(el, step.at))
      : [openSpace(rand(0.44, 0.56), rand(0.4, 0.5))]
    const layout = compose(step.text)
    if (!layout) return
    hush()
    place(points[0](), layout, els.length > 0 ? step.at : undefined)
    setHover(els[0] ?? null)
    await moveTo(points[0])
    await sleep(rand(60, 140))
    await type(layout)
    if (points.length > 1) {
      await sleep(rand(550, 800)) // let the line land before moving on
      for (let i = 1; i < points.length; i++) {
        // sweep across the rest of the group
        await sleep(rand(90, 190))
        setHover(els[i])
        await moveTo(points[i], { dur: rand(240, 340) })
      }
      await sleep(rand(550, 750))
    } else {
      await sleep((850 + layout.chars.length * 20) * rand(0.95, 1.15))
    }
    setHover(null)
  }

  function showPrompt(): void {
    if (store.get('guideTourPrompt') !== 'off') prompt?.classList.add('is-on')
  }

  async function run(): Promise<void> {
    if (!root) return
    await sleep(500)
    root.classList.add('is-here')
    store.set('guideTourSeen', '1')
    for (const step of steps) await say(step)

    // Tour over: wander off the edge of the screen.
    hush()
    await sleep(rand(300, 500))
    const exit = { x: window.innerWidth + 90, y: window.innerHeight * rand(0.18, 0.42) }
    await moveTo(() => exit, { direct: true })
    root.classList.remove('is-here')
    await sleep(500)
    running = false
    window.profileGaze?.release()
    showPrompt()
  }

  // The guide comes in from off the right edge.
  function start(): void {
    if (running || !root) return
    running = true
    prompt?.classList.remove('is-on')
    move = null
    rest = null
    goal.x = shown.x = window.innerWidth + 40
    goal.y = shown.y = window.innerHeight * rand(0.5, 0.7)
    shown.vx = 0
    shown.vy = 0
    root.classList.remove('is-up', 'is-left')
    root.style.transform = `translate3d(${goal.x}px,${goal.y}px,0)`
    raf = requestAnimationFrame((now) => {
      last = now
      frame(now)
    })
    void run()
  }

  function replay(): void {
    prompt?.classList.remove('is-on')
    start()
  }

  function dismiss(): void {
    prompt?.classList.remove('is-on')
    store.set('guideTourPrompt', 'off')
  }

  function clearEntryTimer(): void {
    if (entryTimer !== null) {
      clearTimeout(entryTimer)
      entryTimer = null
    }
  }

  /** Hard stop: cancel motion, typing, hover and hide the cursor. */
  function stopTour(): void {
    clearEntryTimer()
    running = false
    cancelAnimationFrame(raf)
    move = null
    rest = null
    waiters.length = 0
    typing = false
    tremor = 1
    setHover(null)
    hush()
    root?.classList.remove('is-here', 'is-away', 'is-up', 'is-left')
    away = false
    window.profileGaze?.release()
  }

  /**
   * Autoplay shortly after entry so the hero + sidebar have settled
   * (fonts, reveal entrances) and anchors measure final positions.
   * Skipped when a dialog is already open.
   */
  function scheduleStart(delay: number): void {
    clearEntryTimer()
    if (running) return
    entryTimer = setTimeout(() => {
      entryTimer = null
      if (running) return
      if (!desktop?.matches) return
      if (document.querySelector('[role="dialog"]') !== null) return
      start()
    }, delay)
  }

  onMounted(() => {
    desktop = window.matchMedia(DESKTOP_QUERY)
    if (!desktop.matches) return
    root = refs.root.value
    tag = refs.tag.value
    clip = refs.clip.value
    inner = refs.inner.value
    measure = refs.measure.value
    caret = refs.caret.value
    prompt = refs.prompt.value
    if (!root || !tag || !clip || !inner || !measure || !caret || !prompt) return
    sidebar = document.querySelector('[data-guide="sidebar"]')
    const route = useRoute()
    // Home always autoplays on entry; other pages autoplay until first seen.
    // ?tour forces a replay anywhere.
    if (new URLSearchParams(location.search).has('tour')) scheduleStart(400)
    else if (route.path === '/') scheduleStart(700)
    else if (store.get('guideTourSeen') !== '1') scheduleStart(400)
    else showPrompt()
    watch(
      () => route.path,
      (path) => {
        stopTour()
        if (path === '/') scheduleStart(700)
        else if (store.get('guideTourSeen') !== '1') scheduleStart(400)
      },
    )
  })

  onUnmounted(() => {
    stopTour()
    setHover(null)
  })

  return { replay, dismiss }
}
