import type {
  AttachmentQuestion,
  AttachmentQuestionnaireDisplayResults,
  QuestionResult
} from '../../../app/types/attachmentQuestionnaireResults'
import { computeAttachmentQuestionnaireResults } from './computeAttachmentQuestionnaireResults'
import { buildAttachmentQuestionnaireDisplayResult } from './buildAttachmentQuestionnaireDisplayResult'

export const buildAttachmentQuestionnaireResult = (
  results: QuestionResult[],
  questions: AttachmentQuestion[]
): AttachmentQuestionnaireDisplayResults => {
  const computedResults = computeAttachmentQuestionnaireResults(results, questions)
  return buildAttachmentQuestionnaireDisplayResult(computedResults)
}
