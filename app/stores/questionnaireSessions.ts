import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firebaseFunctions } from '~/composables/firebase/init.js'
import { useAuthStore } from '~/stores/auth'
import type { QuestionnaireSession } from '~/types/questionnaireSessions'

const getTimestampMs = (value: unknown): number => {
  if (!value || typeof value !== 'object') return 0

  const candidate = value as { toMillis?: () => number; seconds?: number }
  if (typeof candidate.toMillis === 'function') {
    return candidate.toMillis()
  }

  if (typeof candidate.seconds === 'number') {
    return candidate.seconds * 1000
  }

  return 0
}

export const useQuestionnaireSessionsStore = defineStore('questionnaireSessions', () => {
  const authStore = useAuthStore()

  const sessions = ref<QuestionnaireSession[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const loadedForUid = ref<string | null>(null)
  const loadedAt = ref<string | null>(null)

  const sortedSessions = computed<QuestionnaireSession[]>(() => {
    return [...sessions.value].sort((a, b) => {
      const timeA = getTimestampMs(a.completedAt) || getTimestampMs(a.updatedAt) || getTimestampMs(a.createdAt)
      const timeB = getTimestampMs(b.completedAt) || getTimestampMs(b.updatedAt) || getTimestampMs(b.createdAt)
      return timeB - timeA
    })
  })

  const attachmentSessions = computed(() => {
    return sortedSessions.value.filter(
      session => session.questionnaireType === 'attachment' && session.status === 'completed',
    )
  })

  const latestAttachmentSession = computed(() => {
    return attachmentSessions.value[0] || null
  })

  const clearError = () => {
    error.value = null
  }

  const reset = () => {
    sessions.value = []
    isLoading.value = false
    error.value = null
    loadedForUid.value = null
    loadedAt.value = null
  }

  const loadSessions = async (force = false) => {
    const uid = authStore.user?.id
    if (!uid) {
      reset()
      return []
    }

    if (!force && loadedForUid.value === uid && sessions.value.length > 0) {
      return sortedSessions.value
    }

    isLoading.value = true
    clearError()

    try {
      const sessionsQuery = query(
        collection(firebaseFunctions.db, 'questionnaireSessions'),
        where('uid', '==', uid),
      )
      const snapshot = await getDocs(sessionsQuery)

      sessions.value = snapshot.docs.map((doc) => {
        return {
          id: doc.id,
          ...doc.data(),
        } as QuestionnaireSession
      })

      loadedForUid.value = uid
      loadedAt.value = new Date().toISOString()
      return sortedSessions.value
    } catch (err) {
      error.value = err instanceof Error
        ? err.message
        : 'Impossible de charger les sessions de questionnaire.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getSessionById = (sessionId: string) => {
    return sessions.value.find(session => session.id === sessionId) || null
  }

  const ensureSessionLoaded = async (sessionId: string) => {
    const existing = getSessionById(sessionId)
    if (existing) return existing

    await loadSessions()
    return getSessionById(sessionId)
  }

  return {
    sessions,
    sortedSessions,
    attachmentSessions,
    latestAttachmentSession,
    isLoading,
    error,
    loadedForUid,
    loadedAt,
    clearError,
    reset,
    loadSessions,
    getSessionById,
    ensureSessionLoaded,
  }
})
