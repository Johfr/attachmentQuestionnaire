import type {
  AttachmentQuestionnaireResults,
  AttachmentQuestionnaireDisplayResults,
  IntensityLevel,
} from '../../../app/types/attachmentQuestionnaireResults'
import type { QuestionnaireSession } from '../../../app/types/questionnaireSessions'
import { buildAttachmentQuestionnaireDisplayResult } from '../../utils/attachment/buildAttachmentQuestionnaireDisplayResult'

// Scores are already computed and persisted in Firestore at session creation time.
// Re-running the algorithm from raw answers would give inconsistent results if
// questions.json or the scoring logic has changed since the session was created.
// Instead we reconstruct the intermediate AttachmentQuestionnaireResults object
// from the stored flat summary and pass it to the display enrichment step only.

type StoredResult = QuestionnaireSession['result']
type StoredCompletedAt = { seconds: number; nanoseconds?: number } | null

type DisplayFromSessionRequest = {
  storedResult: StoredResult
  completedAt: StoredCompletedAt
}

const formatStoredDate = (ts: StoredCompletedAt): string => {
  if (!ts?.seconds) return ''
  const date = new Date(ts.seconds * 1000)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

const scoreToIntensity = (score: number): IntensityLevel => {
  if (score > 66) return 'high'
  if (score > 33) return 'medium'
  return 'low'
}

export default defineEventHandler(async (event): Promise<AttachmentQuestionnaireDisplayResults> => {
  const body = await readBody<DisplayFromSessionRequest>(event)

  if (!body?.storedResult) {
    throw createError({
      statusCode: 400,
      statusMessage: 'storedResult is required',
    })
  }

  const { storedResult, completedAt } = body

  // Rebuild regulationIndexByDimension from the stored flat trigger map.
  // Keys are stored as `${dimension}_${tag}` (e.g. "anxiety_fearOfLoss").
  // The relative score (tagTotalValues / maxTagScore) is preserved by normalising
  // to a virtual maxTagScore of 100.
  const regulationIndexByDimension: AttachmentQuestionnaireResults['regulationIndexByDimension'] = {
    anxiety: [],
    avoidance: [],
  }

  for (const [key, { score, level }] of Object.entries(storedResult.triggers)) {
    const separatorIdx = key.indexOf('_')
    const dim = key.slice(0, separatorIdx) as 'anxiety' | 'avoidance'
    const tag = key.slice(separatorIdx + 1)
    if (dim !== 'anxiety' && dim !== 'avoidance') continue

    regulationIndexByDimension[dim].push({
      tag,
      tagTotalValues: score * 100,
      maxTagScore: 100,
      regulationLevel: level,
    })
  }

  const results: AttachmentQuestionnaireResults = {
    // Not used by buildAttachmentQuestionnaireDisplayResult — kept for type completeness.
    triggersByDimension: { anxiety: [], avoidance: [] },
    dimensionScores: { anxiety: [], avoidance: [] },
    regulationIndexByDimension,
    averageScores: [
      { dimension: 'anxiety', average: storedResult.anxietyScore, intensityLevel: scoreToIntensity(storedResult.anxietyScore) },
      { dimension: 'avoidance', average: storedResult.avoidanceScore, intensityLevel: scoreToIntensity(storedResult.avoidanceScore) },
    ],
    attachmentProfilesByDimension: {
      globalStyle: storedResult.globalProfile,
      anxiety: storedResult.anxietySubProfile,
      avoidance: storedResult.avoidanceSubProfile,
    },
    completionDate: formatStoredDate(completedAt),
  }

  return buildAttachmentQuestionnaireDisplayResult(results)
})
