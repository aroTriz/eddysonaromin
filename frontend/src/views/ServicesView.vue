<script setup lang="ts">
/**
 * Services — bryllim-style page header + services grid.
 * Placeholder-ready: services can be added here for the upcoming showcase.
 */
import { Code2, Database, MonitorSmartphone, Palette, PenTool, Search } from 'lucide-vue-next'

const services = [
  {
    icon: MonitorSmartphone,
    title: 'Web Development',
    desc: 'Responsive, modern websites and web apps built with Vue, Ionic, and Tailwind.',
  },
  {
    icon: Code2,
    title: 'Front-End Engineering',
    desc: 'Pixel-perfect UIs that match designs exactly, from design tokens to components.',
  },
  {
    icon: Database,
    title: 'Backend & APIs',
    desc: 'REST APIs with Laravel and clean database design with MySQL / SQLite.',
  },
  {
    icon: Search,
    title: 'Quality Assurance',
    desc: 'Test cases, bug tracking, regression testing, and documentation review.',
  },
  {
    icon: Palette,
    title: 'UI/UX & Design',
    desc: 'Figma wireframes, prototyping, and design systems that scale.',
  },
  {
    icon: PenTool,
    title: 'AI & Automation',
    desc: 'Exploring AI research and automation to ship smarter products.',
  },
]
</script>

<template>
  <div class="mx-auto w-full max-w-2xl px-6 py-14 sm:py-20">
    <!-- header -->
    <header class="mb-12">
      <p class="terminal-comment mb-3 text-[13px]">$ ls ./services/</p>
      <h1 class="font-pixel text-2xl leading-none">services</h1>
    </header>

    <p class="reveal mb-12 max-w-xl text-[15px] leading-relaxed text-gray-600">
      What I can build for you — from full websites to polished interfaces, clean APIs,
      and quality-assured delivery.
    </p>

    <!-- services grid -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div
        v-for="service in services"
        :key="service.title"
        class="reveal flex flex-col rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-[0_8px_22px_-16px_rgba(10,10,10,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(10,10,10,0.35)]"
      >
        <component :is="service.icon" class="h-6 w-6 text-gray-400" :stroke-width="1.6" />
        <h2 class="mt-3 text-[15px] font-semibold text-ink">{{ service.title }}</h2>
        <p class="mt-1.5 text-[13.5px] leading-relaxed text-gray-600">{{ service.desc }}</p>
      </div>
    </div>
  </div>
</template>
