<script setup lang="ts">
/**
 * Shop — bryllim-exact: banner (pixel "shop" + description) + grid of
 * product cards (4:3 image, Free badge, category, title).
 */
import { ArrowUpRight } from 'lucide-vue-next'

import Reveal from '@/components/ui/Reveal.vue'

interface ShopItem {
  title: string
  category: string
  price: string
  href: string
  monogram: string
}

const items: ShopItem[] = [
  {
    title: 'Developer Resume Template',
    category: 'Template',
    price: 'Free',
    href: '#',
    monogram: 'CV',
  },
]
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
    <!-- header -->
    <header class="mb-12">
      <p class="terminal-comment mb-3 text-[13px]">$ ls ./shop/</p>
      <h1 class="font-pixel text-2xl leading-none">shop</h1>
      <p class="mt-12 max-w-xl text-[15px] leading-relaxed text-gray-600">
        Explore my collection of digital products I've designed and built, ready for instant download.
      </p>
    </header>

    <!-- product grid (bryllim-exact cards) -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Reveal
        v-for="(item, i) in items"
        :key="item.title"
        :delay="i % 3"
        class="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_12px_34px_-16px_rgba(0,0,0,0.22)]"
      >
        <a :href="item.href" class="flex flex-1 flex-col">
          <div class="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-gray-100 to-white">
            <span class="font-pixel text-4xl text-gray-300 transition-colors group-hover:text-gray-400">
              {{ item.monogram }}
            </span>
            <span
              class="absolute right-2.5 top-2.5 rounded-full border border-gray-300 bg-white/90 px-2 py-0.5 font-mono text-[10px] text-ink"
            >
              {{ item.price }}
            </span>
          </div>
          <div class="flex flex-1 flex-col p-3.5">
            <span class="font-mono text-[10px] uppercase tracking-wider text-gray-400">
              {{ item.category }}
            </span>
            <span class="mt-1 text-[15px] font-semibold tracking-tight text-ink">
              {{ item.title }}
            </span>
            <span
              class="mt-2 inline-flex items-center gap-1 font-mono text-[11.5px] text-gray-500 transition-colors group-hover:text-ink"
            >
              view <ArrowUpRight class="h-3 w-3" :stroke-width="1.8" />
            </span>
          </div>
        </a>
      </Reveal>
    </div>
  </div>
</template>
