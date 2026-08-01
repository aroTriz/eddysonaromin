<script setup lang="ts">
/**
 * BlogPost — slug-driven post page. Renders markdown-ish content from the
 * API into styled HTML with safe, simple formatting (no external deps).
 */
import { ArrowLeft, CalendarDays } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import AsyncState from '@/components/ui/AsyncState.vue'
import TechTag from '@/components/ui/TechTag.vue'
import { fetchBlogPost } from '@/services/api'
import type { BlogPost } from '@/types'

const route = useRoute()
const post = ref<BlogPost | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    post.value = await fetchBlogPost(route.params.slug as string)
  } catch (err) {
    error.value =
      err instanceof Error && err.message.includes('404')
        ? 'Post not found.'
        : 'Failed to load this post.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await load()
  if (post.value) {
    document.title = `${post.value.title} — Eddyson Aromin`
  }
})

/**
 * Lightweight markdown renderer for the post body. Handles the subset used
 * in seeded posts: # h1, ## h2, ### h3, paragraphs, lists, code fences,
 * inline `code` and **bold**. Renders via escaped HTML to stay safe.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function renderMarkdown(source: string): string {
  const lines = source.split('\n')
  const html: string[] = []
  let inList = false
  let inCode = false
  let codeBuffer: string[] = []

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')

    // Code fences
    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`)
        codeBuffer = []
        inCode = false
      } else {
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeBuffer.push(line)
      continue
    }

    // Headings
    const h1 = line.match(/^# (.+)$/)
    const h2 = line.match(/^## (.+)$/)
    const h3 = line.match(/^### (.+)$/)
    if (h1) {
      html.push(`<h1>${inline(h1[1])}</h1>`)
      continue
    }
    if (h2) {
      html.push(`<h2>${inline(h2[1])}</h2>`)
      continue
    }
    if (h3) {
      html.push(`<h3>${inline(h3[1])}</h3>`)
      continue
    }

    // Lists
    const listItem = line.match(/^[-*] (.+)$/)
    const numbered = line.match(/^\d+\. (.+)$/)
    if (listItem || numbered) {
      if (!inList) {
        html.push(listItem ? '<ul>' : '<ol>')
        inList = true
      }
      html.push(`<li>${inline((listItem ?? numbered)?.[1] ?? '')}</li>`)
      continue
    }
    if (inList) {
      html.push(listItem ? '</ul>' : '</ol>')
      inList = false
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(line)) {
      html.push('<hr />')
      continue
    }

    // Paragraph
    if (line === '') continue
    html.push(`<p>${inline(line)}</p>`)
  }

  if (inList) html.push('</ul>')
  if (inCode) html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`)

  return html.join('\n')
}

const bodyHtml = computed(() => (post.value ? renderMarkdown(post.value.content) : ''))

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
    <RouterLink
      to="/blog"
      class="inline-flex items-center gap-1.5 font-mono text-[13px] text-gray-400 hover:text-ink"
    >
      <ArrowLeft class="h-4 w-4" :stroke-width="1.8" />
      back to blog
    </RouterLink>

    <AsyncState :loading="loading" :error="error" :on-retry="load">
      <template v-if="post">
        <article class="mt-6">
          <header>
            <div class="flex items-center gap-2 font-mono text-[12.5px] text-gray-400">
              <CalendarDays class="h-3.5 w-3.5" :stroke-width="1.6" />
              {{ formatDate(post.published_at) }}
            </div>
            <h1 class="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tightest md:text-[2.5rem]">
              {{ post.title }}
            </h1>
            <p class="mt-4 text-[15px] leading-relaxed text-gray-500">{{ post.excerpt }}</p>
            <div v-if="post.tags?.length" class="mt-4 flex flex-wrap gap-2">
              <TechTag v-for="tag in post.tags" :key="tag" :label="tag" />
            </div>
          </header>

          <div
            class="prose-local mt-10 text-[15px] text-gray-700"
            v-html="bodyHtml"
          />
        </article>
      </template>
    </AsyncState>
  </div>
</template>
