import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useQuestionnaireSessionsStore } from '~/stores/questionnaireSessions'

const TOTAL_TRIGGERS = 11
const TRIGGER_THRESHOLD = 0.33

const PROFILE_TO_ELEMENT: Record<string, string> = {
  globallySecure: 'mountain',
  anxious: 'water',
  dismissiveAvoidant: 'snow',
  fearfulAvoidant: 'storm',
  mixedProfile: 'ether',
}

export const useUserAttachmentProgressStore = defineStore('userAttachmentProgress', () => {
  const sessionsStore = useQuestionnaireSessionsStore()

  const globalProfile = ref<string | null>(null)
  const triggers = ref<Record<string, { score: number; level: string }>>({})
  const isLoading = ref(false)
  const hasResult = ref(false)

  const element = computed<string>(() => {
    if (!globalProfile.value) return 'ether'
    return PROFILE_TO_ELEMENT[globalProfile.value] ?? 'ether'
  })

  const level = computed<number>(() => {
    if (!hasResult.value) return 1
    const badCount = Object.values(triggers.value).filter(t => t.score > TRIGGER_THRESHOLD).length
    return Math.max(1, TOTAL_TRIGGERS - badCount)
  })

  const progress = computed<number>(() => {
    if (!hasResult.value) return 0
    return Math.round((level.value / TOTAL_TRIGGERS) * 100)
  })

  const reset = () => {
    globalProfile.value = null
    triggers.value = {}
    hasResult.value = false
  }

  const fetchLatestResult = async () => {
    isLoading.value = true
    try {
      await sessionsStore.loadSessions()
      const latestSession = sessionsStore.latestAttachmentSession

      if (!latestSession) {
        reset()
        return
      }

      globalProfile.value = latestSession.result?.globalProfile ?? null
      triggers.value = latestSession.result?.triggers ?? {}
      hasResult.value = true
    } catch (err) {
      hasResult.value = false
      console.error('[userAttachmentProgress] Fetch failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    globalProfile,
    element,
    level,
    progress,
    hasResult,
    isLoading,
    fetchLatestResult,
    reset,
  }
})
