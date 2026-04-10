import type {
  AttachmentQuestionnaireResults,
  AttachmentQuestionnaireDisplayResults,
  IntensityLevel,
} from '../../../app/types/attachmentQuestionnaireResults'
import type { QuestionnaireSession } from '../../../app/types/questionnaireSessions'
import { buildAttachmentQuestionnaireDisplayResult } from './buildAttachmentQuestionnaireDisplayResult'

type StoredResult = QuestionnaireSession['result']
type StoredCompletedAt = { seconds: number; nanoseconds?: number } | null

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

export const buildAttachmentDisplayResultFromStoredSession = (
  storedResult: StoredResult,
  completedAt: StoredCompletedAt,
): AttachmentQuestionnaireDisplayResults => {
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
}
