import type {
  AttachmentDimension,
  AttachmentQuestionnaireResults,
  AttachmentQuestionnaireDisplayResults,
  ConflictTagLevelAdvices,
  ConflictTagLevelText,
  DoughnutDataset,
  PolarTagDataItem,
  RegulationIndex,
  TagDefinition,
  TagDisplayItem,
  TagLevelAdvices,
  TagLevelText,
  TagsResultsByDimension
} from '../../../app/types/attachmentQuestionnaireResults'
import tagProfilesData from '../../data/attachment/tagProfiles.json'

const TAG_TRANSLATIONS: Record<string, string> = {
  distanceSilence: 'Distance/Silence',
  validationRequired: 'Validation requise',
  quickRepair: 'Réparation rapide',
  proximityDiscomfort: 'Inconfort émotionnelle',
  conflict: 'Conflit',
  autonomyNeed: "Besoin d'autonomie",
  fearOfLoss: 'Peur de la perte',
  overthinking: 'Rumination',
  emotionalContainment: 'Retenue émotionnelle',
  controlNeed: 'Besoin de contrôle',
  withdrawalUnderStress: 'Retrait sous stress'
}

const ANXIETY_COLOR = '#bae6fd'
const AVOIDANCE_COLOR = '#fecdd3'
const CONFLICT_COLOR = '#f97316'
const CHART_BG_COLOR = '#fefefe1c'

const isConflictTagLevelText = (
  value: TagDefinition['associatedBehaviors'],
): value is ConflictTagLevelText => {
  return !Array.isArray(value)
    && typeof value === 'object'
    && value !== null
    && ('anxiety' in value || 'avoidance' in value)
}

const isConflictTagLevelAdvices = (
  value: TagDefinition['advices'],
): value is ConflictTagLevelAdvices => {
  return typeof value === 'object'
    && value !== null
    && ('anxiety' in value || 'avoidance' in value)
}

export const resolveAssociatedBehaviors = (
  associatedBehaviors: TagDefinition['associatedBehaviors'],
  dimension: AttachmentDimension,
  regulationLevel: RegulationIndex['regulationLevel'],
): string => {
  if (Array.isArray(associatedBehaviors)) {
    return associatedBehaviors.join('\n')
  }

  if (isConflictTagLevelText(associatedBehaviors)) {
    return associatedBehaviors[dimension]?.[regulationLevel] ?? ''
  }

  return (associatedBehaviors as TagLevelText)?.[regulationLevel] ?? ''
}

export const resolveAdvices = (
  advices: TagDefinition['advices'],
  dimension: AttachmentDimension,
  regulationLevel: RegulationIndex['regulationLevel'],
): string[] => {
  if (isConflictTagLevelAdvices(advices)) {
    return advices[dimension]?.[regulationLevel] ?? []
  }

  return (advices as TagLevelAdvices)?.[regulationLevel] ?? []
}

export const resolveAttachmentQuestionnaireConflictDimension = (
  regulationData: AttachmentQuestionnaireResults['regulationIndexByDimension']
): AttachmentDimension | null => {
  const anxietyConflict = regulationData.anxiety.find(t => t.tag === 'conflict')
  const avoidanceConflict = regulationData.avoidance.find(t => t.tag === 'conflict')

  if (anxietyConflict && avoidanceConflict) {
    if (anxietyConflict.regulationLevel === 'high' && avoidanceConflict.regulationLevel === 'high') {
      return 'anxiety'
    }
    return anxietyConflict.tagTotalValues >= avoidanceConflict.tagTotalValues ? 'anxiety' : 'avoidance'
  }

  if (anxietyConflict) return 'anxiety'
  if (avoidanceConflict) return 'avoidance'
  return null
}

const buildTagsResults = (
  results: AttachmentQuestionnaireResults,
  tagsCatalog: TagDefinition[],
  conflictDimension: AttachmentDimension | null
): TagsResultsByDimension => {
  const regulationData = results.regulationIndexByDimension
  const relativeScore = (item: RegulationIndex) =>
    item.maxTagScore > 0 ? item.tagTotalValues / item.maxTagScore : 0

  const anxietyTriggers = [...regulationData.anxiety].sort((a, b) => relativeScore(b) - relativeScore(a))
  const avoidanceTriggers = [...regulationData.avoidance].sort((a, b) => relativeScore(b) - relativeScore(a))

  const mapForDimension = (dimension: AttachmentDimension, triggers: RegulationIndex[]): TagDisplayItem[] => {
    const displayItems: TagDisplayItem[] = []

    triggers.forEach(triggerItem => {
      if (triggerItem.tag === 'conflict' && conflictDimension && conflictDimension !== dimension) {
        return
      }

      const tagDefinition = tagsCatalog.find(t => t.key === triggerItem.tag)
      if (!tagDefinition) return

      displayItems.push({
        key: triggerItem.tag,
        tag: TAG_TRANSLATIONS[triggerItem.tag] ?? triggerItem.tag,
        regulationLevel: triggerItem.regulationLevel,
        label: tagDefinition.label,
        indicator: tagDefinition.indicator,
        trigger: tagDefinition.trigger,
        associatedBehaviors: resolveAssociatedBehaviors(
          tagDefinition.associatedBehaviors,
          dimension,
          triggerItem.regulationLevel,
        ),
        outputText: tagDefinition.outputTexts[triggerItem.regulationLevel],
        advices: resolveAdvices(
          tagDefinition.advices,
          dimension,
          triggerItem.regulationLevel,
        )
      })
    })

    return displayItems
  }

  return {
    anxiety: mapForDimension('anxiety', anxietyTriggers),
    avoidance: mapForDimension('avoidance', avoidanceTriggers)
  }
}

const buildTagData = (
  results: AttachmentQuestionnaireResults,
  conflictDimension: AttachmentDimension | null
): PolarTagDataItem[] => {
  const regulationData = results.regulationIndexByDimension
  const relativeScore = (item: RegulationIndex) =>
    item.maxTagScore > 0 ? item.tagTotalValues / item.maxTagScore : 0

  const allTags: PolarTagDataItem[] = []

  const pushTagsForDimension = (dimension: AttachmentDimension, tagList: RegulationIndex[]) => {
    tagList.forEach(tagObj => {
      if (tagObj.tag === 'conflict' && conflictDimension && conflictDimension !== dimension) {
        return
      }

      const value = tagObj.maxTagScore > 0
        ? Math.round((tagObj.tagTotalValues / tagObj.maxTagScore) * 100)
        : 0

      allTags.push({
        key: tagObj.tag,
        label: TAG_TRANSLATIONS[tagObj.tag] ?? tagObj.tag,
        value,
        color: tagObj.tag === 'conflict' ? CONFLICT_COLOR : dimension === 'anxiety' ? ANXIETY_COLOR : AVOIDANCE_COLOR,
        dimension
      })
    })
  }

  const avoidanceSorted = [...regulationData.avoidance].sort((a, b) => relativeScore(b) - relativeScore(a))
  const anxietySorted = [...regulationData.anxiety].sort((a, b) => relativeScore(a) - relativeScore(b))

  pushTagsForDimension('avoidance', avoidanceSorted)
  pushTagsForDimension('anxiety', anxietySorted)

  return allTags
}

export const buildAttachmentQuestionnaireDisplayResult = (
  results: AttachmentQuestionnaireResults
): AttachmentQuestionnaireDisplayResults => {
  const tagsCatalog = (tagProfilesData.tags || []) as TagDefinition[]
  const conflictDimension = resolveAttachmentQuestionnaireConflictDimension(results.regulationIndexByDimension)

  const anxietyAverageScore = results.averageScores.find(s => s.dimension === 'anxiety')?.average ?? 0
  const avoidanceAverageScore = results.averageScores.find(s => s.dimension === 'avoidance')?.average ?? 0

  const tagsResults = buildTagsResults(results, tagsCatalog, conflictDimension)
  const tagData = buildTagData(results, conflictDimension)

  const anxietyDatasets: DoughnutDataset[] = [
    {
      data: [anxietyAverageScore, 100 - anxietyAverageScore],
      backgroundColor: [ANXIETY_COLOR, CHART_BG_COLOR],
      borderRadius: 100,
      spacing: 5
    }
  ]

  const avoidanceDatasets: DoughnutDataset[] = [
    {
      data: [avoidanceAverageScore, 100 - avoidanceAverageScore],
      backgroundColor: [AVOIDANCE_COLOR, CHART_BG_COLOR],
      borderRadius: 100,
      spacing: 5
    }
  ]

  return {
    ...results,
    tagsResults,
    tagData,
    anxietyAverageScore,
    avoidanceAverageScore,
    anxietyDatasets,
    avoidanceDatasets
  }
}
