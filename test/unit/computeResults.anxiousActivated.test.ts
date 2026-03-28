import { describe, expect, it } from 'vitest'
import { computeAttachmentResults } from '../../server/utils/attachment/computeResults'
import questionsData from '../../app/assets/data/questions.json'

describe('computeAttachmentResults anxiousActivated matching', () => {
  it('matches anxiousActivated for the provided response set', () => {
    const results = [
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

    const computed = computeAttachmentResults(results as any, (questionsData as any).questions)

    expect(computed.attachmentProfilesByDimension.anxiety).toBe('anxiousActivated')

    const quickRepair = computed.regulationIndexByDimension.anxiety.find(item => item.tag === 'quickRepair')
    expect(quickRepair).toBeTruthy()
    expect(quickRepair?.regulationLevel).toBe('high')
    expect(Math.round(((quickRepair?.tagTotalValues ?? 0) / (quickRepair?.maxTagScore ?? 1)) * 100)).toBe(63)
  })
})
