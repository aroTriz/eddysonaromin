<script setup lang="ts">
/**
 * RecommendationDeck — bryllim-style spotlight card deck.
 * Three cards fanned (center / left / right); clicking a side card
 * swaps it to the center with a smooth spring transition.
 */
import { ref } from 'vue'

import { recommendations } from '@/data/profile'
import type { Recommendation } from '@/data/profile'

const order = ref<number[]>([0, 1, 2, 3, 4, 5].slice(0, recommendations.length))

const cards: Recommendation[] = recommendations

/** Center card is always order[1] (middle of the 3 visible). */
function slotClass(index: number): string {
  if (order.value.length < 3) return 'is-center'
  if (index === 1) return 'is-center'
  if (index === 0) return 'is-left'
  return 'is-right'
}

function activate(index: number): void {
  if (index === 1) return // already center
  if (order.value.length < 3) return

  const current = [...order.value]
  if (index === 0) {
    // rotate left → right (bring left card to center)
    const last = current.pop()
    if (last !== undefined) current.unshift(last)
  } else {
    // rotate right → left
    const first = current.shift()
    if (first !== undefined) current.push(first)
  }
  order.value = current
}
</script>

<template>
  <div class="deck" data-deck>
    <article
      v-for="(recIndex, i) in order"
      :key="cards[recIndex].initials"
      class="deck-card rounded-2xl border border-gray-200 bg-white p-5"
      :class="slotClass(i)"
      role="button"
      tabindex="0"
      :aria-label="`Show recommendation from ${cards[recIndex].author}`"
      @click="activate(i)"
      @keydown.enter="activate(i)"
      @keydown.space.prevent="activate(i)"
    >
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="rounded-full border border-gray-300 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gray-500">
          recommendation
        </span>
        <span class="rounded-full border border-gray-300 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gray-500">
          {{ cards[recIndex].initials }}
        </span>
      </div>

      <div class="mt-4 flex items-center gap-3.5">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 font-mono text-[13px] font-medium text-gray-600 shadow-sm">
          {{ cards[recIndex].initials }}
        </div>
        <h3 class="font-pixel text-base leading-tight text-ink">{{ cards[recIndex].author }}</h3>
      </div>

      <p class="mt-3 line-clamp-5 text-[13px] leading-relaxed text-gray-600">
        {{ cards[recIndex].quote }}
      </p>

      <div class="mt-4 border-t border-gray-100 pt-3">
        <div class="truncate font-mono text-[9px] uppercase tracking-wider text-gray-400">
          {{ cards[recIndex].role }}
        </div>
      </div>
    </article>
  </div>
</template>
