import { describe, expect, it } from 'vitest'
import { computeAttachmentQuestionnaireResults } from '../../server/utils/attachment/computeAttachmentQuestionnaireResults'
import {
  buildAttachmentQuestionnaireDisplayResult,
  resolveAdvices,
  resolveAssociatedBehaviors,
  resolveAttachmentQuestionnaireConflictDimension
} from '../../server/utils/attachment/buildAttachmentQuestionnaireDisplayResult'
import questionsData from '../../app/assets/data/attachment/questions.json'

const BASE_RESULTS = [
  { id: 1, dimension: 'anxiety', value: 3, tags: ['distanceSilence', 'fearOfLoss'] },
  { id: 2, dimension: 'avoidance', value: 2, tags: ['proximityDiscomfort', 'withdrawalUnderStress'] },
  { id: 3, dimension: 'anxiety', value: 4, tags: ['validationRequired', 'distanceSilence'] },
  { id: 4, dimension: 'avoidance', value: 1, tags: ['proximityDiscomfort', 'autonomyNeed'] },
  { id: 5, dimension: 'anxiety', value: 4, tags: ['quickRepair', 'fearOfLoss'] },
  { id: 6, dimension: 'avoidance', value: 1, tags: ['autonomyNeed'] },
  { id: 7, dimension: 'anxiety', value: 1, tags: ['quickRepair', 'conflict'] },
  { id: 8, dimension: 'avoidance', value: 4, tags: ['conflict', 'withdrawalUnderStress'] },
  { id: 9, dimension: 'anxiety', value: 1, tags: ['validationRequired'] },
  { id: 10, dimension: 'avoidance', value: 4, tags: ['proximityDiscomfort', 'emotionalContainment'] },
  { id: 11, dimension: 'anxiety', value: 4, tags: ['distanceSilence', 'overthinking'] },
  { id: 12, dimension: 'avoidance', value: 4, tags: ['emotionalContainment'] },
  { id: 13, dimension: 'anxiety', value: 4, tags: ['validationRequired'] },
  { id: 14, dimension: 'avoidance', value: 2, tags: ['controlNeed', 'proximityDiscomfort'] },
  { id: 15, dimension: 'anxiety', value: 4, tags: ['quickRepair', 'conflict'] },
  { id: 16, dimension: 'avoidance', value: 3, tags: ['autonomyNeed', 'controlNeed'] },
  { id: 17, dimension: 'anxiety', value: 2, tags: ['distanceSilence', 'fearOfLoss', 'overthinking'] },
  { id: 18, dimension: 'avoidance', value: 1, tags: ['autonomyNeed', 'emotionalContainment'] },
  { id: 19, dimension: 'anxiety', value: 1, tags: ['quickRepair', 'conflict'] },
  { id: 20, dimension: 'avoidance', value: 4, tags: ['withdrawalUnderStress', 'controlNeed'] }
] as const

describe('buildAttachmentQuestionnaireDisplayResult', () => {
  const rawResults = computeAttachmentQuestionnaireResults(BASE_RESULTS as any, (questionsData as any).questions)
  const displayResults = buildAttachmentQuestionnaireDisplayResult(rawResults)

  it('preserves all raw result fields', () => {
    expect(displayResults.attachmentProfilesByDimension).toEqual(rawResults.attachmentProfilesByDimension)
    expect(displayResults.averageScores).toEqual(rawResults.averageScores)
    expect(displayResults.regulationIndexByDimension).toEqual(rawResults.regulationIndexByDimension)
    expect(displayResults.completionDate).toBe(rawResults.completionDate)
  })

  it('computes anxietyAverageScore from averageScores', () => {
    const expected = rawResults.averageScores.find(s => s.dimension === 'anxiety')?.average
    expect(displayResults.anxietyAverageScore).toBe(expected)
  })

  it('computes avoidanceAverageScore from averageScores', () => {
    const expected = rawResults.averageScores.find(s => s.dimension === 'avoidance')?.average
    expect(displayResults.avoidanceAverageScore).toBe(expected)
  })

  it('builds anxietyDatasets with correct data and colors', () => {
    expect(displayResults.anxietyDatasets).toHaveLength(1)
    const dataset = displayResults.anxietyDatasets[0]
    expect(dataset.data[0]).toBe(displayResults.anxietyAverageScore)
    expect(dataset.data[1]).toBe(100 - displayResults.anxietyAverageScore)
    expect(dataset.backgroundColor[0]).toBe('#bae6fd')
  })

  it('builds avoidanceDatasets with correct data and colors', () => {
    expect(displayResults.avoidanceDatasets).toHaveLength(1)
    const dataset = displayResults.avoidanceDatasets[0]
    expect(dataset.data[0]).toBe(displayResults.avoidanceAverageScore)
    expect(dataset.data[1]).toBe(100 - displayResults.avoidanceAverageScore)
    expect(dataset.backgroundColor[0]).toBe('#fecdd3')
  })

  it('produces tagsResults with a TagDisplayItem per tag per dimension', () => {
    expect(Array.isArray(displayResults.tagsResults.anxiety)).toBe(true)
    expect(Array.isArray(displayResults.tagsResults.avoidance)).toBe(true)
    expect(displayResults.tagsResults.anxiety.length).toBeGreaterThan(0)

    const item = displayResults.tagsResults.anxiety[0]
    expect(item).toHaveProperty('key')
    expect(item).toHaveProperty('tag')
    expect(item).toHaveProperty('regulationLevel')
    expect(item).toHaveProperty('label')
    expect(item).toHaveProperty('indicator')
    expect(item).toHaveProperty('trigger')
    expect(typeof item.associatedBehaviors).toBe('string')
    expect(item).toHaveProperty('outputText')
    expect(Array.isArray(item.advices)).toBe(true)
  })

  it('applies tag translations', () => {
    const allItems = [...displayResults.tagsResults.anxiety, ...displayResults.tagsResults.avoidance]
    const distanceSilenceItem = allItems.find(t => t.key === 'distanceSilence')
    expect(distanceSilenceItem?.tag).toBe('Distance/Silence')

    const autonomyItem = allItems.find(t => t.key === 'autonomyNeed')
    expect(autonomyItem?.tag).toBe("Besoin d'autonomie")
  })

  it('sorts tagsResults by relative score descending', () => {
    const items: Array<{ key: string }> = displayResults.tagsResults.anxiety
    for (let i = 1; i < items.length; i++) {
      const prevKey = items[i - 1].key
      const currKey = items[i].key
      const prevReg = rawResults.regulationIndexByDimension.anxiety.find(r => r.tag === prevKey)
      const currReg = rawResults.regulationIndexByDimension.anxiety.find(r => r.tag === currKey)
      if (prevReg && currReg && prevReg.maxTagScore > 0 && currReg.maxTagScore > 0) {
        const prevScore = prevReg.tagTotalValues / prevReg.maxTagScore
        const currScore = currReg.tagTotalValues / currReg.maxTagScore
        expect(prevScore).toBeGreaterThanOrEqual(currScore)
      }
    }
  })

  it('conflict tag appears in at most one dimension in tagsResults', () => {
    const conflictInAnxiety = displayResults.tagsResults.anxiety.find(t => t.key === 'conflict')
    const conflictInAvoidance = displayResults.tagsResults.avoidance.find(t => t.key === 'conflict')
    expect(!!(conflictInAnxiety && conflictInAvoidance)).toBe(false)
  })

  it('conflict tag appears in at most one dimension in tagData', () => {
    const conflictItems = displayResults.tagData.filter(t => t.key === 'conflict')
    expect(conflictItems.length).toBeLessThanOrEqual(1)
  })

  it('produces tagData with valid items', () => {
    expect(Array.isArray(displayResults.tagData)).toBe(true)
    expect(displayResults.tagData.length).toBeGreaterThan(0)

    const item = displayResults.tagData[0]
    expect(item).toHaveProperty('key')
    expect(item).toHaveProperty('label')
    expect(item).toHaveProperty('value')
    expect(item).toHaveProperty('color')
    expect(item).toHaveProperty('dimension')
    expect(item.value).toBeGreaterThanOrEqual(0)
    expect(item.value).toBeLessThanOrEqual(100)
  })

  it('assigns correct colors in tagData', () => {
    const anxietyItem = displayResults.tagData.find(t => t.dimension === 'anxiety' && t.key !== 'conflict')
    const avoidanceItem = displayResults.tagData.find(t => t.dimension === 'avoidance' && t.key !== 'conflict')
    expect(anxietyItem?.color).toBe('#bae6fd')
    expect(avoidanceItem?.color).toBe('#fecdd3')
  })
})

describe('resolveAttachmentQuestionnaireConflictDimension', () => {
  it('returns anxiety when both dimensions have high conflict and anxiety score is equal', () => {
    const regulationData = {
      anxiety: [{ tag: 'conflict', tagTotalValues: 10, maxTagScore: 12, regulationLevel: 'high' as const }],
      avoidance: [{ tag: 'conflict', tagTotalValues: 10, maxTagScore: 12, regulationLevel: 'high' as const }]
    }
    expect(resolveAttachmentQuestionnaireConflictDimension(regulationData)).toBe('anxiety')
  })

  it('returns anxiety when anxiety conflict score is higher', () => {
    const regulationData = {
      anxiety: [{ tag: 'conflict', tagTotalValues: 9, maxTagScore: 12, regulationLevel: 'high' as const }],
      avoidance: [{ tag: 'conflict', tagTotalValues: 5, maxTagScore: 12, regulationLevel: 'medium' as const }]
    }
    expect(resolveAttachmentQuestionnaireConflictDimension(regulationData)).toBe('anxiety')
  })

  it('returns avoidance when avoidance conflict score is higher', () => {
    const regulationData = {
      anxiety: [{ tag: 'conflict', tagTotalValues: 4, maxTagScore: 12, regulationLevel: 'medium' as const }],
      avoidance: [{ tag: 'conflict', tagTotalValues: 8, maxTagScore: 12, regulationLevel: 'high' as const }]
    }
    expect(resolveAttachmentQuestionnaireConflictDimension(regulationData)).toBe('avoidance')
  })

  it('returns anxiety when only anxiety dimension has conflict', () => {
    const regulationData = {
      anxiety: [{ tag: 'conflict', tagTotalValues: 6, maxTagScore: 12, regulationLevel: 'medium' as const }],
      avoidance: [{ tag: 'autonomyNeed', tagTotalValues: 4, maxTagScore: 8, regulationLevel: 'medium' as const }]
    }
    expect(resolveAttachmentQuestionnaireConflictDimension(regulationData)).toBe('anxiety')
  })

  it('returns avoidance when only avoidance dimension has conflict', () => {
    const regulationData = {
      anxiety: [{ tag: 'distanceSilence', tagTotalValues: 6, maxTagScore: 12, regulationLevel: 'medium' as const }],
      avoidance: [{ tag: 'conflict', tagTotalValues: 4, maxTagScore: 8, regulationLevel: 'medium' as const }]
    }
    expect(resolveAttachmentQuestionnaireConflictDimension(regulationData)).toBe('avoidance')
  })

  it('returns null when no conflict tag exists in either dimension', () => {
    const regulationData = {
      anxiety: [{ tag: 'distanceSilence', tagTotalValues: 6, maxTagScore: 12, regulationLevel: 'medium' as const }],
      avoidance: [{ tag: 'autonomyNeed', tagTotalValues: 4, maxTagScore: 8, regulationLevel: 'medium' as const }]
    }
    expect(resolveAttachmentQuestionnaireConflictDimension(regulationData)).toBeNull()
  })

  it('returns null when both dimensions are empty', () => {
    const regulationData = { anxiety: [], avoidance: [] }
    expect(resolveAttachmentQuestionnaireConflictDimension(regulationData)).toBeNull()
  })
})

describe('conflict-specific trigger content resolution', () => {
  it('resolves associatedBehaviors from dimension + level for conflict', () => {
    const associatedBehaviors = {
      anxiety: {
        low: 'anxiety low behavior',
        medium: 'anxiety medium behavior',
        high: 'anxiety high behavior',
      },
      avoidance: {
        low: 'avoidance low behavior',
        medium: 'avoidance medium behavior',
        high: 'avoidance high behavior',
      },
    }

    expect(resolveAssociatedBehaviors(associatedBehaviors, 'anxiety', 'high')).toBe('anxiety high behavior')
    expect(resolveAssociatedBehaviors(associatedBehaviors, 'avoidance', 'medium')).toBe('avoidance medium behavior')
  })

  it('resolves advices from dimension + level for conflict', () => {
    const advices = {
      anxiety: {
        low: ['anxiety low advice'],
        medium: ['anxiety medium advice'],
        high: ['anxiety high advice'],
      },
      avoidance: {
        low: ['avoidance low advice'],
        medium: ['avoidance medium advice'],
        high: ['avoidance high advice'],
      },
    }

    expect(resolveAdvices(advices, 'anxiety', 'high')).toEqual(['anxiety high advice'])
    expect(resolveAdvices(advices, 'avoidance', 'medium')).toEqual(['avoidance medium advice'])
  })

  it('keeps standard trigger formats compatible', () => {
    expect(resolveAssociatedBehaviors(['first', 'second'], 'anxiety', 'low')).toBe('first\nsecond')
    expect(resolveAssociatedBehaviors({
      low: 'low behavior',
      medium: 'medium behavior',
      high: 'high behavior',
    }, 'avoidance', 'medium')).toBe('medium behavior')

    expect(resolveAdvices({
      low: ['low advice'],
      medium: ['medium advice'],
      high: ['high advice'],
    }, 'anxiety', 'low')).toEqual(['low advice'])
  })
})
