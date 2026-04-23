import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firebaseClient } from '~/composables/firebase/useFirebaseClient.js'
import { useAuthStore } from '~/stores/auth'
import type { ContactRequest } from '~/types/contactRequests'

const getTimestampMs = (value: unknown): number => {
  if (!value || typeof value !== 'object') return 0

  const candidate = value as { toMillis?: () => number; seconds?: number }
  if (typeof candidate.toMillis === 'function') return candidate.toMillis()
  if (typeof candidate.seconds === 'number') return candidate.seconds * 1000
  return 0
}

export const useContactRequestsStore = defineStore('contactRequests', () => {
  const authStore = useAuthStore()

  const requests = ref<ContactRequest[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const loadedForUid = ref<string | null>(null)

  const sortedRequests = computed(() => {
    return [...requests.value].sort((a, b) => {
      const timeA = getTimestampMs(a.createdAt) || getTimestampMs(a.updatedAt)
      const timeB = getTimestampMs(b.createdAt) || getTimestampMs(b.updatedAt)
      return timeB - timeA
    })
  })

  const reset = () => {
    requests.value = []
    isLoading.value = false
    error.value = null
    loadedForUid.value = null
  }

  const loadRequests = async (force = false) => {
    const uid = authStore.user?.id
    if (!uid) {
      reset()
      return []
    }

    if (!force && loadedForUid.value === uid) {
      return sortedRequests.value
    }

    isLoading.value = true
    error.value = null

    try {
      const requestsQuery = query(
        collection(firebaseClient.db, 'contactRequests'),
        where('uid', '==', uid),
      )
      const snapshot = await getDocs(requestsQuery)

      requests.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ContactRequest[]

      loadedForUid.value = uid
      return sortedRequests.value
    } catch (err) {
      error.value = err instanceof Error
        ? err.message
        : 'Impossible de charger tes prises de contact.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    requests,
    sortedRequests,
    isLoading,
    error,
    loadedForUid,
    loadRequests,
    reset,
  }
})
