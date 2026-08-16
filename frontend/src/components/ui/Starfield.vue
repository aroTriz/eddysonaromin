<template>
  <canvas ref="canvasRef" class="starfield" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
/**
 * Starfield — animated canvas starfield with twinkle, parallax, milky-way
 * nebula and shooting stars. Renders ONLY in dark mode (matches the
 * resume reference). Canvas 2D — no external dependencies.
 */
import { onMounted, onUnmounted, ref } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId: number | null = null
let stars: Star[] = []
let milkyDust: Dust[] = []
let shootingStars: ShootingStar[] = []
let mouse = { x: 0.5, y: 0.5 }
let w = 0
let h = 0
let dpr = 1
let isLowEnd = false

interface Star {
  x: number
  y: number
  baseX: number
  baseY: number
  r: number
  alpha: number
  twinkleSpeed: number
  phase: number
  layer: number
  hue: number
  milky: boolean
}

interface Dust {
  x: number
  y: number
  baseX: number
  baseY: number
  r: number
  alpha: number
  hue: number
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  trail: number
}

function isDark(): boolean {
  return document.documentElement.classList.contains('dark')
}

function milkyDistance(x: number, y: number, cw: number, ch: number): number {
  const cx = x / cw
  const cy = y / ch
  const curve = 0.12 * Math.sin(cx * Math.PI * 1.5)
  return Math.abs(cy - (0.35 + cx * 0.4 + curve))
}

function generateStars(cw: number, ch: number): { stars: Star[]; dust: Dust[] } {
  const starList: Star[] = []
  const dustList: Dust[] = []
  const area = cw * ch
  const isMobile = cw < 768
  const density = isMobile ? 0.5 : 1

  // Background stars
  const bgCount = Math.floor((area / 700) * density)
  for (let i = 0; i < bgCount; i++) {
    const layer = Math.random() < 0.4 ? 0 : Math.random() < 0.6 ? 1 : 2
    const sizeScale = layer === 0 ? 0.3 : layer === 1 ? 0.7 : 1
    starList.push({
      x: Math.random() * cw,
      y: Math.random() * ch,
      baseX: 0,
      baseY: 0,
      r: (0.2 + Math.random() * 2.2) * sizeScale * (isMobile ? 1.5 : 1),
      alpha: 0.1 + Math.random() * 0.7,
      twinkleSpeed: 0.002 + Math.random() * 0.018,
      phase: Math.random() * Math.PI * 2,
      layer,
      hue: 0,
      milky: milkyDistance(Math.random() * cw, Math.random() * ch, cw, ch) < 0.15,
    })
  }

  // Milky Way cluster
  const mwCount = Math.floor((area / 350) * density)
  for (let i = 0; i < mwCount; i++) {
    let x: number
    let y: number
    let mDist: number
    let attempts = 0
    do {
      x = Math.random() * cw
      y = Math.random() * ch
      mDist = milkyDistance(x, y, cw, ch)
      attempts++
    } while (mDist > 0.22 && attempts < 50)
    const weight = Math.max(0, 1 - mDist * 6)
    if (Math.random() > weight * 0.8) continue
    const hueRand = Math.random()
    starList.push({
      x,
      y,
      baseX: 0,
      baseY: 0,
      r: (0.1 + Math.random() * 1.2) * (isMobile ? 1.5 : 1),
      alpha: 0.15 + Math.random() * 0.5,
      twinkleSpeed: 0.003 + Math.random() * 0.012,
      phase: Math.random() * Math.PI * 2,
      layer: 1,
      hue: hueRand < 0.4 ? 1 : hueRand < 0.7 ? 2 : 0,
      milky: true,
    })
  }

  // Nebula dust — every gradient per frame costs, so keep the field modest
  // and skip the near-invisible ones entirely (alpha range is 0.01–0.05).
  const dustCount = Math.floor((area / 2600) * density)
  for (let i = 0; i < dustCount; i++) {
    let x: number
    let y: number
    let mDist: number
    let att = 0
    do {
      x = Math.random() * cw
      y = Math.random() * ch
      mDist = milkyDistance(x, y, cw, ch)
      att++
    } while (mDist > 0.18 && att < 30)
    if (mDist > 0.18) continue
    const alpha = 0.012 + Math.random() * 0.04
    if (alpha < 0.02) continue
    dustList.push({
      x,
      y,
      baseX: x,
      baseY: y,
      r: (8 + Math.random() * 25) * (isMobile ? 1.2 : 1),
      alpha,
      hue: Math.random() < 0.5 ? 1 : 2,
    })
  }

  return { stars: starList, dust: dustList }
}

function draw(ctx: CanvasRenderingContext2D, time: number, scrollY: number): void {
  ctx.clearRect(0, 0, w, h)
  if (!isDark()) return

  const px = (mouse.x - 0.5) * 2
  const py = (mouse.y - 0.5) * 2

  // Milky Way nebula glow
  for (const d of milkyDust) {
    const sx = d.baseX + px * 4
    const sy = d.baseY + py * 4 + scrollY * 0.02
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, d.r)
    if (d.hue === 1) {
      grad.addColorStop(0, `rgba(180, 140, 220, ${d.alpha})`)
      grad.addColorStop(1, 'rgba(180, 140, 220, 0)')
    } else {
      grad.addColorStop(0, `rgba(140, 180, 230, ${d.alpha})`)
      grad.addColorStop(1, 'rgba(140, 180, 230, 0)')
    }
    ctx.fillStyle = grad
    ctx.fillRect(sx - d.r, sy - d.r, d.r * 2, d.r * 2)
  }

  // Stars
  for (const star of stars) {
    const parallax = (star.layer + 1) * 0.12
    const sx = star.x + px * parallax * 18
    const sy = star.y + py * parallax * 18 + scrollY * 0.05
    if (sx < -20 || sx > w / dpr + 20 || sy < -20 || sy > h / dpr + 20) continue

    const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.phase)
    const alpha = star.alpha * twinkle

    let color: string
    if (star.hue === 1) color = `rgba(255, 230, 200, ${alpha})`
    else if (star.hue === 2) color = `rgba(200, 220, 255, ${alpha})`
    else color = `rgba(255, 255, 255, ${alpha})`

    ctx.fillStyle = color
    if (star.r <= 1) {
      // Sub-pixel dots — a rect is pixel-identical to an arc at this size but
      // far cheaper to rasterize (thousands of arcs per frame were the main
      // canvas cost; ~80% of the star field is r <= 1).
      ctx.fillRect(sx - star.r, sy - star.r, star.r * 2, star.r * 2)
    } else {
      ctx.beginPath()
      ctx.arc(sx, sy, star.r, 0, Math.PI * 2)
      ctx.fill()
    }

    if (star.r > 1.5 && twinkle > 0.6) {
      ctx.beginPath()
      ctx.arc(sx, sy, star.r * 2.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.05 * twinkle})`
      ctx.fill()
    }
  }

  // Shooting stars
  if (Math.random() < 0.02) {
    shootingStars.push({
      x: (Math.random() * w) / dpr,
      y: (Math.random() * (h / dpr)) * 0.3,
      vx: Math.cos(Math.PI / 2 + (Math.random() - 0.5) * 1.0) * (5 + Math.random() * 8),
      vy: Math.sin(Math.PI / 2 + (Math.random() - 0.5) * 1.0) * (5 + Math.random() * 8),
      life: 0,
      maxLife: 30 + Math.random() * 40,
      trail: 6 + Math.random() * 10,
    })
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i]
    s.x += s.vx
    s.y += s.vy
    s.life++
    if (s.life > s.maxLife || s.x < -50 || s.x > w / dpr + 50 || s.y < -50 || s.y > h / dpr + 50) {
      shootingStars.splice(i, 1)
      continue
    }
    const progress = s.life / s.maxLife
    const alpha = (1 - progress) * 0.9
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.lineTo(s.x - s.vx * s.trail, s.y - s.vy * s.trail)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(s.x, s.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fill()
  }
}

onMounted(() => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false
  const frameSkip = isLowEnd ? 2 : 1
  let scrollY = 0
  let frameCount = 0

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, isLowEnd ? 1 : 2)
    w = canvas!.width = window.innerWidth * dpr
    h = canvas!.height = window.innerHeight * dpr
    canvas!.style.width = `${window.innerWidth}px`
    canvas!.style.height = `${window.innerHeight}px`
    const gen = generateStars(window.innerWidth, window.innerHeight)
    stars = gen.stars
    milkyDust = gen.dust
  }
  resize()

  function loop(time: number): void {
    frameCount++
    // Dark mode only — in light mode skip ALL canvas work (the canvas is
    // blank anyway; not even a clearRect is needed since nothing was drawn).
    if (isDark() && frameCount % frameSkip === 0) {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(ctx!, time / 1000, scrollY)
    }
    animId = requestAnimationFrame(loop)
  }

  const startDelay = setTimeout(() => {
    animId = requestAnimationFrame(loop)
  }, 100)

  const onScroll = (): void => {
    scrollY = window.scrollY || window.pageYOffset
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', resize)
  const onMouse = (e: MouseEvent): void => {
    mouse.x = e.clientX / window.innerWidth
    mouse.y = e.clientY / window.innerHeight
  }
  window.addEventListener('mousemove', onMouse, { passive: true })

  // NOTE: no MutationObserver on <html> — the draw loop reads the `dark`
  // class live every frame, so a theme flip needs zero regeneration of the
  // star field (the old observer re-built ~10k stars mid-transition).

  onUnmounted(() => {
    clearTimeout(startDelay)
    if (animId) cancelAnimationFrame(animId)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMouse)
    window.removeEventListener('scroll', onScroll)
  })
})
</script>

<style scoped>
.starfield {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
