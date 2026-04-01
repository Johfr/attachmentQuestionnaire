import { ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  AttachmentQuestionnaireResults,
  QuestionResult
} from '~/types/attachmentQuestionnaireResults'

export const ATTACHMENT_QUESTIONNAIRE_ID = 'attachmentQuestionnaire' as const

export type AttachmentQuestionnaireResultEntity = {
  id: string
  userId: string
  questionnaireId: typeof ATTACHMENT_QUESTIONNAIRE_ID
  computedResults: AttachmentQuestionnaireResults
  rawAnswers: QuestionResult[] | null
  createdAt: string
  updatedAt: string
}

export type ListUserResultsParams = {
  userId: string
  questionnaireId?: typeof ATTACHMENT_QUESTIONNAIRE_ID
  limit?: number
}

export type LatestUserResultParams = {
  userId: string
  questionnaireId?: typeof ATTACHMENT_QUESTIONNAIRE_ID
}

export type UserResultByIdParams = {
  userId: string
  resultId: string
}

export type SaveUserResultParams = {
  userId: string
  computedResults: AttachmentQuestionnaireResults
  rawAnswers?: QuestionResult[] | null
  questionnaireId?: typeof ATTACHMENT_QUESTIONNAIRE_ID
  id?: string
}

export interface AttachmentQuestionnaireResultsDbAdapter {
  listUserResults: (params: ListUserResultsParams) => Promise<AttachmentQuestionnaireResultEntity[]>
  getLatestUserResult: (params: LatestUserResultParams) => Promise<AttachmentQuestionnaireResultEntity | null>
  getUserResultById: (params: UserResultByIdParams) => Promise<AttachmentQuestionnaireResultEntity | null>
  saveUserResult: (params: SaveUserResultParams) => Promise<AttachmentQuestionnaireResultEntity>
}

const generateId = () => {
  return `aq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const sortByDateDesc = (items: AttachmentQuestionnaireResultEntity[]) => {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime()
    const timeB = new Date(b.createdAt).getTime()
    return timeB - timeA
  })
}

const createInMemoryAdapter = (): AttachmentQuestionnaireResultsDbAdapter => {
  const db = new Map<string, AttachmentQuestionnaireResultEntity[]>()

  return {
    listUserResults: async ({ userId, limit }) => {
      const rows = db.get(userId) || []
      const sorted = sortByDateDesc(rows)

      if (typeof limit === 'number' && limit > 0) {
        return sorted.slice(0, limit)
      }

      return sorted
    },

    getLatestUserResult: async ({ userId }) => {
      const rows = db.get(userId) || []
      const sorted = sortByDateDesc(rows)
      return sorted[0] || null
    },

    getUserResultById: async ({ userId, resultId }) => {
      const rows = db.get(userId) || []
      return rows.find(row => row.id === resultId) || null
    },

    saveUserResult: async ({
      userId,
      computedResults,
      rawAnswers = null,
      questionnaireId = ATTACHMENT_QUESTIONNAIRE_ID,
      id
    }) => {
      const now = new Date().toISOString()
      const rows = db.get(userId) || []
      const existingIndex = id ? rows.findIndex(row => row.id === id) : -1

      if (existingIndex >= 0) {
        const existing = rows[existingIndex] as AttachmentQuestionnaireResultEntity

        const updated = {
          id: existing.id,
          userId: existing.userId,
          questionnaireId: existing.questionnaireId,
          createdAt: existing.createdAt,
          computedResults,
          rawAnswers,
          updatedAt: now
        } as AttachmentQuestionnaireResultEntity

        const nextRows = [...rows]
        nextRows[existingIndex] = updated
        db.set(userId, nextRows)
        return updated
      }

      const created: AttachmentQuestionnaireResultEntity = {
        id: id || generateId(),
        userId,
        questionnaireId,
        computedResults,
        rawAnswers,
        createdAt: now,
        updatedAt: now
      }

      db.set(userId, [...rows, created])
      return created
    }
  }
}

export const useAttachmentQuestionnaireResultsDbStore = defineStore(
  'attachmentQuestionnaireResultsDb',
  () => {
    const adapter = ref<AttachmentQuestionnaireResultsDbAdapter>(createInMemoryAdapter())

    const setAdapter = (nextAdapter: AttachmentQuestionnaireResultsDbAdapter) => {
      adapter.value = nextAdapter
    }

    const resetAdapter = () => {
      adapter.value = createInMemoryAdapter()
    }

    const listUserResults = async (params: ListUserResultsParams) => {
      return adapter.value.listUserResults(params)
    }

    const getLatestUserResult = async (params: LatestUserResultParams) => {
      return adapter.value.getLatestUserResult(params)
    }

    const getUserResultById = async (params: UserResultByIdParams) => {
      return adapter.value.getUserResultById(params)
    }

    const saveUserResult = async (params: SaveUserResultParams) => {
      return adapter.value.saveUserResult(params)
    }

    return {
      setAdapter,
      resetAdapter,
      listUserResults,
      getLatestUserResult,
      getUserResultById,
      saveUserResult
    }
  }
)
