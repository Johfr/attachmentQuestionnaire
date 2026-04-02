import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firebaseFunctions } from '~/composables/firebase/init.js'

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
    const firebaseUser = firebaseFunctions.auth.currentUser
    if (!firebaseUser) {
      reset()
      return
    }

    isLoading.value = true
    try {
      // Equality-only filters — no orderBy, no composite index needed.
      // Sort client-side to find the most recent completed session.
      const q = query(
        collection(firebaseFunctions.db, 'questionnaireSessions'),
        where('uid', '==', firebaseUser.uid),
        where('questionnaireType', '==', 'attachment'),
        where('status', '==', 'completed'),
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        hasResult.value = false
        return
      }

      // Sort descending by completedAt (Firestore Timestamp has .seconds)
      const sorted = snapshot.docs.sort((a, b) => {
        const aSeconds: number = a.data()['completedAt']?.seconds ?? 0
        const bSeconds: number = b.data()['completedAt']?.seconds ?? 0
        return bSeconds - aSeconds
      })

      const data = sorted[0]!.data()
      globalProfile.value = data['result']?.globalProfile ?? null
      triggers.value = data['result']?.triggers ?? {}
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
