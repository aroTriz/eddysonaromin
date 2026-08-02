<script setup lang="ts">
/**
 * Contact — message form (POST /api/v1/contact) + contact info panel.
 * Shows loading / success / error states inline on submit.
 */
import { CheckCircle2, LoaderCircle, Mail, MapPin, Phone, Send } from 'lucide-vue-next'
import { ref } from 'vue'

import Reveal from '@/components/ui/Reveal.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { profile } from '@/data/profile'
import { submitContact } from '@/services/api'
import type { ContactPayload } from '@/types'

const form = ref<ContactPayload>({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const submitting = ref(false)
const success = ref(false)
const error = ref<string | null>(null)

async function onSubmit(): Promise<void> {
  if (submitting.value) return
  submitting.value = true
  error.value = null
  success.value = false
  try {
    await submitContact(form.value)
    success.value = true
    form.value = { name: '', email: '', subject: '', message: '' }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to send message.'
  } finally {
    submitting.value = false
  }
}

const contactInfo = [
  { label: '// email', value: profile.email, href: `mailto:${profile.email}`, icon: Mail },
  { label: '// phone', value: profile.phone, href: `tel:${profile.phone.replace(/\s/g, '')}`, icon: Phone },
  { label: '// location', value: profile.location, href: null, icon: MapPin },
]

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 font-mono text-[13.5px] text-ink placeholder:text-gray-500 focus:border-gray-400 focus:outline-none'
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
    <PageHeader
      :comment="`$ npx send-email --to ${profile.email}`"
      title="contact"
      description="Let's build something together — drop me a line."
    />

    <div class="mt-10 grid gap-6 md:grid-cols-5">
      <!-- ── Form ───────────────────────────────────────────── -->
      <Reveal :delay="1" class="rounded-xl border border-gray-200 bg-white p-6 md:col-span-3">
        <p class="terminal-comment mb-5 text-[12px]">message.sh</p>

        <form class="space-y-4" novalidate @submit.prevent="onSubmit">
          <div>
            <label for="name" class="mb-1 block font-mono text-[11.5px] text-gray-500">
              // your_name
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              placeholder="John Doe"
              :class="fieldClass"
              autocomplete="name"
            />
          </div>

          <div>
            <label for="email" class="mb-1 block font-mono text-[11.5px] text-gray-500">
              // your_email
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              placeholder="john@example.com"
              :class="fieldClass"
              autocomplete="email"
            />
          </div>

          <div>
            <label for="subject" class="mb-1 block font-mono text-[11.5px] text-gray-500">
              // subject
            </label>
            <input
              id="subject"
              v-model="form.subject"
              type="text"
              placeholder="Project Inquiry"
              :class="fieldClass"
            />
          </div>

          <div>
            <label for="message" class="mb-1 block font-mono text-[11.5px] text-gray-500">
              // message
            </label>
            <textarea
              id="message"
              v-model="form.message"
              required
              rows="5"
              placeholder="Tell me about your project..."
              :class="fieldClass"
            />
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 font-mono text-[13px] text-bg transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            <LoaderCircle v-if="submitting" class="h-4 w-4 animate-spin" :stroke-width="1.8" />
            <Send v-else class="h-4 w-4" :stroke-width="1.8" />
            {{ submitting ? 'sending...' : 'Send Message' }}
          </button>

          <p
            v-if="error"
            class="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700"
            role="alert"
          >
            {{ error }}
          </p>
          <p
            v-if="success"
            class="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-[13px] text-green-700"
            role="status"
          >
            <CheckCircle2 class="h-4 w-4" :stroke-width="1.8" />
            Message sent — I'll get back to you within 24 hours.
          </p>
        </form>
      </Reveal>

      <!-- ── Contact info ───────────────────────────────────── -->
      <Reveal :delay="2" class="rounded-xl border border-gray-200 bg-white p-6 md:col-span-2">
        <p class="terminal-comment mb-5 text-[12px]">contact.json</p>

        <dl class="space-y-4">
          <div
            v-for="item in contactInfo"
            :key="item.label"
            class="flex items-start gap-3"
          >
            <component
              :is="item.icon"
              class="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
              :stroke-width="1.6"
            />
            <div>
              <dt class="font-mono text-[11.5px] text-gray-500">{{ item.label }}</dt>
              <dd>
                <a
                  v-if="item.href"
                  :href="item.href"
                  class="break-all text-[13.5px] text-ink hover:text-gray-500"
                >
                  {{ item.value }}
                </a>
                <span v-else class="text-[13.5px] text-ink">{{ item.value }}</span>
              </dd>
            </div>
          </div>
        </dl>

        <div class="mt-6 border-t border-gray-100 pt-5">
          <p class="terminal-comment mb-3 text-[12px]">// find_me_on</p>
          <div class="flex flex-wrap gap-2">
            <a
              :href="profile.github"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-full border border-gray-200 px-3.5 py-1.5 font-mono text-[12.5px] text-gray-600 hover:border-gray-300 hover:text-ink"
            >
              GitHub
            </a>
            <a
              :href="profile.linkedin"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-full border border-gray-200 px-3.5 py-1.5 font-mono text-[12.5px] text-gray-600 hover:border-gray-300 hover:text-ink"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </Reveal>
    </div>

    <!-- ── Map (Google Maps embed — current location) ─────────── -->
    <Reveal :delay="3" class="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <iframe
        title="Eddyson's location on Google Maps"
        src="https://www.google.com/maps?q=Quezon+City,+Metro+Manila,+Philippines&output=embed"
        class="block h-[320px] w-full border-0"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen
      ></iframe>
    </Reveal>
  </div>
</template>
