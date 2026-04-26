import type { Timestamp } from "firebase/firestore"

export type QuestionnaireType = 'attachment'
export type QuestionnaireVersion = 'v1'
export type QuestionnaireSessionStatus = 'draft' | 'completed' | 'archived'
export type QuestionnairePersistStatus = 'persisted'
export type AiExchangeStatus = 'not_purchased' | 'pending' | 'generated' | 'failed'
export type PartnerShareStatus = 'invite_sent' | 'awaiting_validation' | 'linked'
export type QuestionnaireGlobalProfile =
  | 'globallySecure'
  | 'anxious'
  | 'dismissiveAvoidant'
  | 'fearfulAvoidant'
  | 'mixedProfile'

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
    partnerGender: 'male' | 'female' | null
    partnerEmail?: string | null
    partnerUid?: string | null
    partnerQuestionnaireSessionId?: string | null
    partnerGlobalStyle?: QuestionnaireGlobalProfile | null
    partnerAnxietyScore?: number | null
    partnerAvoidanceScore?: number | null
    partnerCompletedAt?: Timestamp | null
    partnerInviteSentAt?: Timestamp | null
    partnerShareStatus?: PartnerShareStatus | null
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

    globalProfile: QuestionnaireGlobalProfile

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

  aiExchange?: AiExchange

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
  lastAttemptAt: Timestamp | null
  retryCount: number
  lastErrorCode: string | null
  lastErrorMessage: string | null
  status: AiExchangeStatus
  model: string | null
  requestId: string | null
  promptVersion: string | null
  // not_purchased = pas paye
  // pending = paye mais generation pas encore finie
  // generated = reponse dispo
  // failed = erreur
}
