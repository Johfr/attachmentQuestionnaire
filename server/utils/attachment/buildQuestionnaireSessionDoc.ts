import type {
  AttachmentQuestionnaireResults,
  QuestionResult,
} from '../../../app/types/attachmentQuestionnaireResults'
const SCORING_VERSION = '1.0'
const roundStoredTriggerScore = (value: number) => Math.round(value * 10000) / 10000

type RelationContext = {
  partnerFirstName: string | null
  partnerAge: number | null
  partnerGender: 'male' | 'female' | null
}

/**
 * Maps computed questionnaire results to the Firestore QuestionnaireSession document shape.
 * Timestamps (createdAt, updatedAt, completedAt) are NOT included here — they are added
 * by the caller using FieldValue.serverTimestamp() at write time.
 */
export const buildQuestionnaireSessionDoc = (
  uid: string,
  computedResults: AttachmentQuestionnaireResults,
  rawAnswers: QuestionResult[],
  relationContext: RelationContext | null,
) => {
  const { averageScores, attachmentProfilesByDimension, regulationIndexByDimension } = computedResults

  const anxietyScore = averageScores.find(s => s.dimension === 'anxiety')?.average ?? 0
  const avoidanceScore = averageScores.find(s => s.dimension === 'avoidance')?.average ?? 0

  // Flat trigger map keyed as `<dimension>_<tag>` (e.g. anxiety_fearOfLoss).
  // The field is desindexed in Firestore so the key format doesn't matter for queries.
  const triggers: Record<string, { score: number; level: 'low' | 'medium' | 'high' }> = {}
  for (const [dim, indexes] of Object.entries(regulationIndexByDimension)) {
    for (const idx of indexes) {
      const rawScore = idx.maxTagScore > 0 ? idx.tagTotalValues / idx.maxTagScore : 0
      const score = roundStoredTriggerScore(rawScore)
      triggers[`${dim}_${idx.tag}`] = { score, level: idx.regulationLevel }
    }
  }

  const globalProfileKey = attachmentProfilesByDimension.globalStyle
  const anxietySubKey = attachmentProfilesByDimension.anxiety
  const avoidanceSubKey = attachmentProfilesByDimension.avoidance

  return {
    uid,
    questionnaireType: 'attachment' as const,
    questionnaireVersion: 'v1' as const,
    status: 'completed' as const,
    scoringVersion: SCORING_VERSION,

    relationContext: relationContext ?? { partnerFirstName: null, partnerAge: null, partnerGender: null },

    answers: rawAnswers.map(r => ({
      id: r.id,
      dimension: r.dimension,
      value: r.value,
      tags: r.tags,
    })),

    result: {
      anxietyScore,
      avoidanceScore,
      globalProfile: globalProfileKey,
      anxietySubProfile: anxietySubKey,
      avoidanceSubProfile: avoidanceSubKey,
      triggers,
    },

    billingInfo: {
      hasPaidResults: false,
      hasPaidIa: false,
      hasPaidMembership: false,
      hasPaidFormation: false,
    },

    persist: {
      status: 'persisted' as const,
      retryCount: 0,
      lastAttemptAt: null,
      lastErrorCode: null,
    },
  }
}
