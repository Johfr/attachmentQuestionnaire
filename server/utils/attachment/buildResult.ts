import type {
  AttachmentQuestion,
  AttachmentQuestionnaireResults,
  QuestionResult
} from '../../../app/types/attachmentQuestionnaireResults'
import { computeAttachmentResults } from './computeResults'

export const buildResult = (
  results: QuestionResult[],
  questions: AttachmentQuestion[]
): AttachmentQuestionnaireResults => {
  return computeAttachmentResults(results, questions)
}
