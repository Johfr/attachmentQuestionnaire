import type {
  AttachmentQuestionnaireDisplayResults,
} from '../../../app/types/attachmentQuestionnaireResults'
import type { QuestionnaireSession } from '../../../app/types/questionnaireSessions'
import { buildAttachmentDisplayResultFromStoredSession } from '../../utils/attachment/buildAttachmentDisplayResultFromStoredSession'

type StoredResult = QuestionnaireSession['result']
type StoredCompletedAt = { seconds: number; nanoseconds?: number } | null

type DisplayFromSessionRequest = {
  storedResult: StoredResult
  completedAt: StoredCompletedAt
}

export default defineEventHandler(async (event): Promise<AttachmentQuestionnaireDisplayResults> => {
  const body = await readBody<DisplayFromSessionRequest>(event)

  if (!body?.storedResult) {
    throw createError({
      statusCode: 400,
      statusMessage: 'storedResult is required',
    })
  }

  return buildAttachmentDisplayResultFromStoredSession(body.storedResult, body.completedAt)
})
