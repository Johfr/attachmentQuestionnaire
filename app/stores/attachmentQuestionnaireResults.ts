import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import {
  ATTACHMENT_QUESTIONNAIRE_ID,
  useAttachmentQuestionnaireResultsDbStore,
  type AttachmentQuestionnaireResultEntity
} from '~/stores/attachmentQuestionnaireResultsDb'
import type {
  AttachmentQuestionnaireResults,
  QuestionResult
} from '~/types/attachmentQuestionnaireResults'

type SaveResultPayload = {
  computedResults: AttachmentQuestionnaireResults
  rawAnswers?: QuestionResult[] | null
  id?: string
}

export const useAttachmentQuestionnaireResultsStore = defineStore(
  'attachmentQuestionnaireResults',
  () => {
    const authStore = useAuthStore()
    const dbStore = useAttachmentQuestionnaireResultsDbStore()

    const currentResultRecord = ref<AttachmentQuestionnaireResultEntity | null>(null)
    const history = ref<AttachmentQuestionnaireResultEntity[]>([])
    const isLoading = ref(false)
    const isSaving = ref(false)
    const error = ref<string | null>(null)
    const loadedAt = ref<string | null>(null)

    const currentResult = computed<AttachmentQuestionnaireResults | null>(() => {
      return currentResultRecord.value?.computedResults || null
    })

    const hasCurrentResult = computed(() => !!currentResultRecord.value)
    const hasHistory = computed(() => history.value.length > 0)

    const clearError = () => {
      error.value = null
    }

    const setError = (err: unknown) => {
      error.value = err instanceof Error
        ? err.message
        : 'Une erreur est survenue lors de la lecture des resultats.'
    }

    const getCurrentUserId = () => {
      const userId = authStore.user?.id
      if (!userId) {
        throw new Error('Utilisateur non connecte.')
      }
      return userId
    }

    const upsertHistory = (resultRecord: AttachmentQuestionnaireResultEntity) => {
      const index = history.value.findIndex(item => item.id === resultRecord.id)

      if (index === -1) {
        history.value = [resultRecord, ...history.value]
        return
      }

      const next = [...history.value]
      next[index] = resultRecord
      history.value = next
    }

    const saveResult = async (payload: SaveResultPayload) => {
      isSaving.value = true
      clearError()

      try {
        const userId = getCurrentUserId()
        const saved = await dbStore.saveUserResult({
          userId,
          questionnaireId: ATTACHMENT_QUESTIONNAIRE_ID,
          computedResults: payload.computedResults,
          rawAnswers: payload.rawAnswers || null,
          id: payload.id
        })

        currentResultRecord.value = saved
        upsertHistory(saved)
        loadedAt.value = new Date().toISOString()
        return saved
      } catch (err) {
        setError(err)
        throw err
      } finally {
        isSaving.value = false
      }
    }

    const loadLatestResult = async () => {
      isLoading.value = true
      clearError()

      try {
        const userId = getCurrentUserId()
        const latest = await dbStore.getLatestUserResult({
          userId,
          questionnaireId: ATTACHMENT_QUESTIONNAIRE_ID
        })

        currentResultRecord.value = latest
        if (latest) {
          upsertHistory(latest)
        }
        loadedAt.value = new Date().toISOString()
        return latest
      } catch (err) {
        setError(err)
        throw err
      } finally {
        isLoading.value = false
      }
    }

    const loadResultById = async (resultId: string) => {
      isLoading.value = true
      clearError()

      try {
        const userId = getCurrentUserId()
        const row = await dbStore.getUserResultById({ userId, resultId })
        currentResultRecord.value = row
        if (row) {
          upsertHistory(row)
        }
        loadedAt.value = new Date().toISOString()
        return row
      } catch (err) {
        setError(err)
        throw err
      } finally {
        isLoading.value = false
      }
    }

    const loadHistory = async (limit = 10) => {
      isLoading.value = true
      clearError()

      try {
        const userId = getCurrentUserId()
        const rows = await dbStore.listUserResults({
          userId,
          questionnaireId: ATTACHMENT_QUESTIONNAIRE_ID,
          limit
        })

        history.value = rows
        loadedAt.value = new Date().toISOString()

        if (!currentResultRecord.value && rows.length > 0) {
          const firstRow = rows[0]
          if (firstRow) {
            currentResultRecord.value = firstRow
          }
        }

        return rows
      } catch (err) {
        setError(err)
        throw err
      } finally {
        isLoading.value = false
      }
    }

    const setCurrentResultRecord = (resultRecord: AttachmentQuestionnaireResultEntity | null) => {
      currentResultRecord.value = resultRecord
      if (resultRecord) {
        upsertHistory(resultRecord)
      }
    }

    const resetState = () => {
      currentResultRecord.value = null
      history.value = []
      isLoading.value = false
      isSaving.value = false
      error.value = null
      loadedAt.value = null
    }

    return {
      currentResultRecord,
      currentResult,
      history,
      isLoading,
      isSaving,
      error,
      loadedAt,
      hasCurrentResult,
      hasHistory,
      clearError,
      saveResult,
      loadLatestResult,
      loadResultById,
      loadHistory,
      setCurrentResultRecord,
      resetState
    }
  }
)