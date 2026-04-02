import type {
  AttachmentQuestion,
  AttachmentQuestionnaireDisplayResults,
  QuestionResult,
} from '../../../app/types/attachmentQuestionnaireResults'
import questions from '../../../app/assets/data/questions.json'
import { buildAttachmentQuestionnaireResult } from '../../utils/attachment/buildAttachmentQuestionnaireResult'

type DisplayFromSessionRequest = {
  answers: QuestionResult[]
}

export default defineEventHandler(async (event): Promise<AttachmentQuestionnaireDisplayResults> => {
  const body = await readBody<DisplayFromSessionRequest>(event)

  if (!body?.answers?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'answers is required',
    })
  }

  const questionList = questions.questions as unknown as AttachmentQuestion[]
  return buildAttachmentQuestionnaireResult(body.answers, questionList)
})
