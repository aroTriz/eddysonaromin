<script setup lang="ts">
/**
 * ImageCropModal â€” crop an uploaded image before adding it to the device
 * showcase. Uses Cropper.js v1 with the device-appropriate aspect ratio:
 *  - phone  â†’ 9:16 (portrait)
 *  - laptop â†’ 16:9 (landscape)
 *
 * Emits the cropped Blob on confirm, null on cancel.
 */
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { X } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  /** Source image URL (blob: or data: URL from FileReader). */
  src: string
  /** Device type drives the crop aspect ratio. */
  device: 'laptop' | 'phone' | 'avatar' | 'square'
}>()

const emit = defineEmits<{
  (e: 'confirm', blob: Blob): void
  (e: 'cancel'): void
}>()

const imgRef = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null

/** Reactive â€” phone 9:16 portrait, laptop 16:9 landscape; sakto sa web crop */
const aspectRatio = computed(() => {
  if (props.device === 'phone') return 9 / 19.5
  if (props.device === 'avatar' || props.device === 'square') return 1
  return 16 / 9
})

function initCropper(): void {
  if (!imgRef.value) return
  destroyCropper()
  cropper = new Cropper(imgRef.value, {
    aspectRatio: aspectRatio.value,
    viewMode: 1,
    guides: true,
    background: false,
    autoCropArea: 1, // default crop = buong image na naka-fit sa aspect (sakto sa web)
    responsive: true,
    zoomable: true,
    movable: true,
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
      // Wait for the DOM to render the image, then init with correct device aspect
      setTimeout(initCropper, 150)
    } else {
      destroyCropper()
    }
  },
)

// Kapag nag-switch ng device (phone â†” laptop) habang bukas yung modal,
// palitan agad yung aspect nang hindi na need i-reopen
watch(
  () => props.device,
  (newDevice) => {
    let newRatio = 16 / 9
    if (newDevice === 'phone') newRatio = 9 / 19.5
    else if (newDevice === 'avatar' || newDevice === 'square') newRatio = 1
    if (cropper) {
      cropper.setAspectRatio(newRatio)
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
            // crop â€” {{ device === 'phone' ? 'portrait (9:16)' : device === 'avatar' || device === 'square' ? 'square (1:1)' : 'landscape (16:9)' }}
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


