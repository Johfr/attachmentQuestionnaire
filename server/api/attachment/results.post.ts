import type { ComputeAttachmentResultsRequest } from '../../../app/types/attachmentQuestionnaireResults'
import { buildResult } from '../../utils/attachment/buildResult'

export default defineEventHandler(async event => {
  const body = await readBody<ComputeAttachmentResultsRequest>(event)

  if (!body?.results?.length || !body?.questions?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'results and questions are required'
    })
  }

  return buildResult(body.results, body.questions)
})
