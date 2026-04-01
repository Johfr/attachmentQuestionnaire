import type {
  AttachmentQuestionnaireResults,
  EnrichAttachmentQuestionnaireResultsRequest
} from '../../../app/types/attachmentQuestionnaireResults'
import { buildAttachmentQuestionnaireDisplayResult } from '../../utils/attachment/buildAttachmentQuestionnaireDisplayResult'

export default defineEventHandler(async event => {
  const body = await readBody<EnrichAttachmentQuestionnaireResultsRequest>(event)

  if (!body?.computedResults) {
    throw createError({
      statusCode: 400,
      statusMessage: 'computedResults is required'
    })
  }

  return buildAttachmentQuestionnaireDisplayResult(body.computedResults as AttachmentQuestionnaireResults)
})
