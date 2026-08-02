import { onMounted, onUnmounted, ref } from 'vue'

/**
 * useTypewriter — cycles through a list of roles with a typing /
 * erasing cursor effect (from the resume site's HeroSection).
 */
export function useTypewriter(roles: string[], startDelay = 500) {
  const displayed = ref('')
  const caretOn = ref(true)

  let roleIndex = 0
  let charIndex = 0
  let isDeleting = false
  let typeTimer: ReturnType<typeof setTimeout> | null = null
  let caretTimer: ReturnType<typeof setInterval> | null = null

  function typeCycle(): void {
    const current = roles[roleIndex]

    if (!isDeleting) {
      displayed.value = current.substring(0, charIndex + 1)
      charIndex++
      if (charIndex === current.length) {
        isDeleting = true
        typeTimer = setTimeout(typeCycle, 2000)
        return
      }
      typeTimer = setTimeout(typeCycle, 60)
    } else {
      displayed.value = current.substring(0, charIndex - 1)
      charIndex--
      if (charIndex === 0) {
        isDeleting = false
        roleIndex = (roleIndex + 1) % roles.length
        typeTimer = setTimeout(typeCycle, 400)
        return
      }
      typeTimer = setTimeout(typeCycle, 30)
    }
  }

  onMounted(() => {
    typeTimer = setTimeout(typeCycle, startDelay)
    caretTimer = setInterval(() => {
      caretOn.value = !caretOn.value
    }, 530)
  })

  onUnmounted(() => {
    if (typeTimer) clearTimeout(typeTimer)
    if (caretTimer) clearInterval(caretTimer)
  })

  return { displayed, caretOn }
}
