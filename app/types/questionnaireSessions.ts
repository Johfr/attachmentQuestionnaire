import type { Timestamp } from "firebase/firestore"

export type QuestionnaireType = 'attachment'
export type QuestionnaireVersion = 'v1'
export type QuestionnaireSessionStatus = 'draft' | 'completed' | 'archived'
export type QuestionnairePersistStatus = 'persisted' | 'pending_retry'

export type QuestionnaireSession = {
  id: string
  uid: string

  questionnaireType: QuestionnaireType
  questionnaireVersion: QuestionnaireVersion
  status: QuestionnaireSessionStatus

  // Increment when scoring logic changes.
  scoringVersion: string

  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt: Timestamp | null

  relationContext: {
    partnerFirstName: string | null
    partnerAge: number | null
  }

  answers: Array<{
    id: number
    dimension: 'anxiety' | 'avoidance'
    value: number
    tags: string[]
  }>

  result: {
    anxietyScore: number
    avoidanceScore: number

    globalProfile:
      | 'globallySecure'
      | 'anxious'
      | 'dismissiveAvoidant'
      | 'fearfulAvoidant'
      | 'mixedProfile'

    anxietySubProfile:
      | 'anxiousActivated'
      | 'anxiousRegulated'
      | 'anxiousAmbivalent'
      | 'notSignificant'

    avoidanceSubProfile:
      | 'avoidantRigid'
      | 'avoidantFlexible'
      | 'avoidantAdaptive'
      | 'notSignificant'

    triggers: Record<string, {
      score: number
      level: 'low' | 'medium' | 'high'
    }>
  }

  billingInfo: {
    hasPaidResults: boolean
    hasPaidIa: boolean
    hasPaidMembership: boolean
    hasPaidFormation: boolean
  }

  persist: {
    status: QuestionnairePersistStatus
    retryCount: number
    lastAttemptAt: Timestamp | null
    lastErrorCode: string | null
  }
}

export type AiExchange = {
  unlocked: boolean
  purchasedAt: Timestamp | null
  userInput: string | null
  output: string | null
  generatedAt: Timestamp | null
  status: 'not_purchased' | 'pending' | 'generated' | 'failed'
  model: string | null
  requestId: string | null
  // not_purchased = pas paye
  // pending = paye mais generation pas encore finie
  // generated = reponse dispo
  // failed = erreur
}