<template>
  <canvas ref="canvasRef" class="stars-three"></canvas>
</template>

<script setup lang="ts">
/**
 * StarsThree — rotating 3D starfield background (ported from the previous
 * Resume project, using the project's local `three` dependency instead of
 * the CDN import). Fixed, pointer-events-none; sits behind overlays.
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId: number | null = null
let renderer: THREE.WebGLRenderer | null = null
let geometry: THREE.BufferGeometry | null = null
let material: THREE.PointsMaterial | null = null
let points: THREE.Points | null = null
let resizeHandler: (() => void) | null = null

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 1.5

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Stars — 3000 points in a sphere.
  const count = 3000
  const positions = new Float32Array(count * 3)
  const radius = 2
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = Math.cbrt(Math.random()) * radius
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r
    positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r
    positions[i * 3 + 2] = Math.cos(phi) * r
  }

  geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.003,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true,
    depthWrite: false,
  })

  points = new THREE.Points(geometry, material)
  points.rotation.x = Math.PI / 4
  scene.add(points)

  const loop = (): void => {
    if (points) {
      points.rotation.x -= 0.0001
      points.rotation.y -= 0.0002
    }
    renderer?.render(scene, camera)
    animId = requestAnimationFrame(loop)
  }
  animId = requestAnimationFrame(loop)

  resizeHandler = (): void => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer?.setSize(w, h)
  }
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  geometry?.dispose()
  material?.dispose()
  renderer?.dispose()
})
</script>

<style scoped>
.stars-three {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100%;
  min-height: 100vh;
  /* z 0 — paints above element backgrounds but below content (z-10+). */
  z-index: 0;
  pointer-events: none;
  display: block;
}
</style>
