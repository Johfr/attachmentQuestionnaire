import type { ComputeAttachmentQuestionnaireResultsRequest } from '../../../app/types/attachmentQuestionnaireResults'
import { buildAttachmentQuestionnaireResult } from '../../utils/attachment/buildAttachmentQuestionnaireResult'

export default defineEventHandler(async event => {
  const body = await readBody<ComputeAttachmentQuestionnaireResultsRequest>(event)

  if (!body?.results?.length || !body?.questions?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'results and questions are required'
    })
  }  

  return buildAttachmentQuestionnaireResult(body.results, body.questions)
})
