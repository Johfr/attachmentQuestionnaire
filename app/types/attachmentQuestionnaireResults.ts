export type AttachmentDimension = 'anxiety' | 'avoidance'
export type ProfileDimension = AttachmentDimension | 'mixed' | 'global' | 'generic'
export type RegulationLevel = 'low' | 'medium' | 'high'
export type IntensityLevel = 'low' | 'medium' | 'high'
export type AttachmentProfile =
  | 'notSignificant'
  | 'anxiousActivated'
  | 'anxiousRegulated'
  | 'anxiousAmbivalent'
  | 'avoidantRigid'
  | 'avoidantFlexible'
  | 'avoidantAdaptive'
  | 'globallySecure'
  | 'anxious'
  | 'dismissiveAvoidant'
  | 'fearfulAvoidant'
  | 'mixedProfile'
  // Legacy compatibility
  | 'secure'
  | 'avoidant'
  | 'fearful'

export type Trigger = {
  tag: string
  averageValue: number
  questionIds: number[]
  label: RegulationLevel
}

export type RegulationIndex = {
  tag: string
  tagTotalValues: number
  maxTagScore: number
  regulationLevel: RegulationLevel
}

export type DimensionScore = {
  questionId: number
  value: number
  tags: string[]
}

export type QuestionResult = {
  id: number
  dimension: AttachmentDimension
  value: number
  tags: string[]
}

export type AttachmentQuestion = {
  id: number
  dimension: AttachmentDimension
  question: string
  tags: string[]
}

export type AverageScore = {
  dimension: AttachmentDimension
  average: number
  intensityLevel: IntensityLevel
}

export type TagDefinition = {
  key: string
  indicator: string
  trigger: string
  associatedBehaviors: string[]
  outputTexts: Record<RegulationLevel, string>
  advices: Record<RegulationLevel, string[]>
  label: string
}

export type TagDisplayItem = {
  key: string
  tag: string
  regulationLevel: RegulationLevel
  label: string
  indicator: string
  trigger: string
  associatedBehaviors: string[]
  outputText: string
  advices: string[]
}

export type DoughnutDataset = {
  data: number[]
  backgroundColor: string[]
  borderRadius: number
  spacing: number
}

export type PolarTagDataItem = {
  key: string
  label: string
  value: number
  color: string
  dimension: AttachmentDimension
}

export type TagsResultsByDimension = {
  anxiety: TagDisplayItem[]
  avoidance: TagDisplayItem[]
}

export type ProfileRule = {
  tag?: string
  levels?: RegulationLevel[]
  type?: 'majorityTagsAtLevel' | 'noTagsAtLevel' | 'noClearProfileMatch' | 'dimensionCombination' | 'dimensionLevels'
  tags?: string[]
  level?: RegulationLevel
  minimumCount?: number
  dimensions?: Partial<Record<AttachmentDimension, RegulationLevel[]>>
  profiles?: string[]
}

export type ProfileExclusionRule = {
  type: 'profileConflict' | 'tagCombination' | 'tag' | 'clearProfileMatchExists'
  profile?: string
  tag?: string
  tags?: string[]
  levels?: RegulationLevel[]
}

export type RegulationProfileDefinition = {
  key: string
  dimension: ProfileDimension
  rules: {
    eligibility?: {
      fallback?: boolean
      dimension?: AttachmentDimension
      levels?: RegulationLevel[]
      dimensions?: Partial<Record<AttachmentDimension, RegulationLevel[]>>
    }
    coreRules?: ProfileRule[]
    supportRules?: ProfileRule[]
    exclusionRules?: ProfileExclusionRule[]
    matchPolicy?: string
  }
}

export type AttachmentTriggersByDimension = {
  anxiety: Trigger[]
  avoidance: Trigger[]
}

export type AttachmentRegulationIndexByDimension = {
  anxiety: RegulationIndex[]
  avoidance: RegulationIndex[]
}

export type AttachmentDimensionScores = {
  anxiety: DimensionScore[]
  avoidance: DimensionScore[]
}

export type AttachmentProfilesByDimension = {
  anxiety: string
  avoidance: string
  globalStyle: string
}

export type AttachmentQuestionnaireResults = {
  triggersByDimension: AttachmentTriggersByDimension
  regulationIndexByDimension: AttachmentRegulationIndexByDimension
  dimensionScores: AttachmentDimensionScores
  averageScores: AverageScore[]
  attachmentProfilesByDimension: AttachmentProfilesByDimension
  completionDate: string
}

export type ComputeAttachmentQuestionnaireResultsRequest = {
  results: QuestionResult[]
  questions: AttachmentQuestion[]
}

export type EnrichAttachmentQuestionnaireResultsRequest = {
  computedResults: AttachmentQuestionnaireResults
}

// Legacy aliases for compatibility while migrating callers.
export type ComputeAttachmentResultsRequest = ComputeAttachmentQuestionnaireResultsRequest
export type EnrichResultsRequest = EnrichAttachmentQuestionnaireResultsRequest

export type AttachmentQuestionnaireDisplayResults = AttachmentQuestionnaireResults & {
  tagsResults: TagsResultsByDimension
  tagData: PolarTagDataItem[]
  anxietyAverageScore: number
  avoidanceAverageScore: number
  anxietyDatasets: DoughnutDataset[]
  avoidanceDatasets: DoughnutDataset[]
}