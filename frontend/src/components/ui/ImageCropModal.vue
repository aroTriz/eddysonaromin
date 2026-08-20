<script setup lang="ts">
/**
 * ImageCropModal — crop an uploaded image before adding it to the device
 * showcase. Uses Cropper.js v1 with the device-appropriate aspect ratio:
 *  - phone  → 9:16 (portrait)
 *  - laptop → 16:9 (landscape)
 *
 * Emits the cropped Blob on confirm, null on cancel.
 */
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { X } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  /** Source image URL (blob: or data: URL from FileReader). */
  src: string
  /** Device type drives the crop aspect ratio. */
  device: 'laptop' | 'phone'
}>()

const emit = defineEmits<{
  (e: 'confirm', blob: Blob): void
  (e: 'cancel'): void
}>()

const imgRef = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null

const aspectRatio = props.device === 'phone' ? 9 / 16 : 16 / 9

function initCropper(): void {
  if (!imgRef.value) return
  destroyCropper()
  cropper = new Cropper(imgRef.value, {
    aspectRatio,
    viewMode: 1,
    guides: true,
    background: false,
    autoCropArea: 1,
    responsive: true,
  })
}

function destroyCropper(): void {
  if (cropper) {
    cropper.destroy()
    cropper = null
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      // Wait for the DOM to render the image, then init
      setTimeout(initCropper, 150)
    } else {
      destroyCropper()
    }
  },
)

onMounted(() => {
  if (props.open) setTimeout(initCropper, 150)
})

onBeforeUnmount(() => destroyCropper())

function confirm(): void {
  if (!cropper) return
  const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality: 'high' })
  canvas.toBlob(
    (blob: Blob | null) => {
      if (blob) emit('confirm', blob)
    },
    'image/png',
    0.92,
  )
}

function cancel(): void {
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
    >
      <div class="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <p class="font-mono text-[12px] text-gray-500">
            // crop — {{ device === 'phone' ? 'portrait (9:16)' : 'landscape (16:9)' }}
          </p>
          <button
            type="button"
            class="rounded p-1 text-gray-400 hover:text-ink"
            @click="cancel"
          >
            <X class="h-4 w-4" :stroke-width="1.7" />
          </button>
        </div>

        <!-- Cropper viewport -->
        <div class="flex-1 overflow-auto bg-gray-100 p-4">
          <img
            ref="imgRef"
            :src="src"
            class="max-h-[60vh] w-full"
            alt="Image to crop"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            class="rounded-md border border-gray-200 px-4 py-2 font-mono text-[12px] text-gray-500 transition-colors hover:text-ink"
            @click="cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-ink px-4 py-2 font-mono text-[12px] font-semibold text-bg transition-opacity hover:opacity-80"
            @click="confirm"
          >
            Use cropped image
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
