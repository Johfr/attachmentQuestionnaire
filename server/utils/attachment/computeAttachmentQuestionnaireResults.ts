import type {
  AttachmentQuestion,
  AttachmentQuestionnaireResults,
  AttachmentProfilesByDimension,
  AverageScore,
  DimensionScore,
  ProfileDimension,
  ProfileExclusionRule,
  ProfileRule,
  QuestionResult,
  RegulationIndex,
  RegulationLevel,
  RegulationProfileDefinition,
  Trigger
} from '../../../app/types/attachmentQuestionnaireResults'
import regulationProfilesData from '../../data/attachment/regulationProfiles.json'

type IntensityByDimension = Record<'anxiety' | 'avoidance', RegulationLevel>

const getLevelLabel = (value: number): RegulationLevel => {
  if (value >= 2.5) return 'high'
  if (value >= 1.5) return 'medium'
  return 'low'
}

const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const buildDimensionScores = (results: QuestionResult[]) => {
  const dimensionScores: Record<'anxiety' | 'avoidance', DimensionScore[]> = {
    anxiety: [],
    avoidance: []
  }

  results.forEach(result => {
    dimensionScores[result.dimension].push({ questionId: result.id, value: result.value, tags: [...result.tags] })
  })

  return dimensionScores
}

const buildTriggersByDimension = (dimensionScores: Record<'anxiety' | 'avoidance', DimensionScore[]>) => {
  const triggersByDimension: Record<'anxiety' | 'avoidance', Trigger[]> = {
    anxiety: [],
    avoidance: []
  }

  ;(Object.entries(dimensionScores) as Array<['anxiety' | 'avoidance', DimensionScore[]]>).forEach(([dimension, values]) => {
    const tagScores: Record<string, { totalValue: number; count: number; questionIds: number[] }> = {}

    values.forEach(({ value, tags, questionId }) => {
      tags.forEach(tag => {
        if (!tagScores[tag]) {
          tagScores[tag] = { totalValue: 0, count: 0, questionIds: [] }
        }

        tagScores[tag].totalValue += value
        tagScores[tag].count++

        if (!tagScores[tag].questionIds.includes(questionId)) {
          tagScores[tag].questionIds.push(questionId)
        }
      })
    })

    triggersByDimension[dimension] = Object.entries(tagScores)
      .map(([tag, { totalValue, count, questionIds }]): Trigger => ({
        tag,
        averageValue: totalValue / count,
        questionIds,
        label: getLevelLabel(totalValue / count)
      }))
      .sort((a, b) => b.averageValue - a.averageValue)
  })

  return triggersByDimension
}

const buildAverageScores = (
  dimensionScores: Record<'anxiety' | 'avoidance', DimensionScore[]>,
  maxQuestionsScoreByDimension: number
) => {
  return Object.entries(dimensionScores).map(([dimension, values]) => {
    const total = values.reduce((sum, item) => sum + item.value, 0)
    const scoreRatio = maxQuestionsScoreByDimension > 0 ? total / maxQuestionsScoreByDimension : 0
    const percentage = scoreRatio * 100

    return {
      dimension,
      average: Math.round(percentage),
      intensityLevel: percentage <= 33 ? 'low' : (percentage <= 66 ? 'medium' : 'high')
    }
  }) as AverageScore[]
}

const buildRegulationIndexByDimension = (
  triggersByDimension: Record<'anxiety' | 'avoidance', Trigger[]>,
  questions: AttachmentQuestion[]
) => {
  const regulationIndexByDimension: Record<'anxiety' | 'avoidance', RegulationIndex[]> = {
    anxiety: [],
    avoidance: []
  }

  ;(Object.entries(triggersByDimension) as Array<['anxiety' | 'avoidance', Trigger[]]>).forEach(([dimension, triggers]) => {
    regulationIndexByDimension[dimension] = triggers.map(({ tag, averageValue }) => {
      const questionCountForTag = questions.filter(q => q.tags.includes(tag)).length
      const maxTagScore = questionCountForTag * 4
      const tagTotalValues = averageValue * questionCountForTag
      // Keep level thresholds consistent with trigger labels and profile matching rules.
      const regulationLevel = getLevelLabel(averageValue)

      return { tag, tagTotalValues, maxTagScore, regulationLevel }
    })
  })

  return regulationIndexByDimension
}

const buildAttachmentProfilesByDimension = (
  averageScores: AverageScore[],
  regulationIndexByDimension: Record<string, RegulationIndex[]>
): AttachmentProfilesByDimension => {
  const profileDefinitions = ((regulationProfilesData.regulationProfiles || []) as RegulationProfileDefinition[])
    .filter(profile => profile.dimension === 'anxiety' || profile.dimension === 'avoidance')
  const anxietyIntensity = averageScores.find(s => s.dimension === 'anxiety')?.intensityLevel ?? 'low'
  const avoidanceIntensity = averageScores.find(s => s.dimension === 'avoidance')?.intensityLevel ?? 'low'
  const intensityByDimension: IntensityByDimension = {
    anxiety: anxietyIntensity,
    avoidance: avoidanceIntensity
  }

  const anxietyTriggers = regulationIndexByDimension.anxiety || []
  const avoidanceTriggers = regulationIndexByDimension.avoidance || []
  const allTriggers = [...anxietyTriggers, ...avoidanceTriggers]
  const matchedProfiles = new Set<string>()

  const getTagLevel = (tag: string, dimension?: 'anxiety' | 'avoidance'): RegulationLevel | undefined => {
    if (dimension === 'anxiety') {
      return anxietyTriggers.find(t => t.tag === tag)?.regulationLevel
    }

    if (dimension === 'avoidance') {
      return avoidanceTriggers.find(t => t.tag === tag)?.regulationLevel
    }

    return allTriggers.find(t => t.tag === tag)?.regulationLevel
  }

  const getLevelsForTag = (tag: string): RegulationLevel[] => {
    return allTriggers.filter(t => t.tag === tag).map(t => t.regulationLevel)
  }

  const matchesTagRule = (tag: string, levels: RegulationLevel[], profileDimension: ProfileDimension) => {
    const scopeDimension: 'anxiety' | 'avoidance' | undefined =
      profileDimension === 'anxiety' || profileDimension === 'avoidance'
        ? profileDimension
        : undefined
    const level = getTagLevel(tag, scopeDimension)
    return Boolean(level && levels.includes(level))
  }

  const evaluateRule = (rule: ProfileRule, profileDimension: ProfileDimension): boolean => {
    if (rule.type === 'majorityTagsAtLevel') {
      const tags = rule.tags || []
      const targetLevel = rule.level
      const minimumCount = rule.minimumCount || 0
      if (!targetLevel) return false

      const matches = tags.filter(tag => {
        const scopeDimension: 'anxiety' | 'avoidance' | undefined =
          profileDimension === 'anxiety' || profileDimension === 'avoidance'
            ? profileDimension
            : undefined
        const level = getTagLevel(tag, scopeDimension)
        return level === targetLevel
      }).length

      return matches >= minimumCount
    }

    if (rule.type === 'noTagsAtLevel') {
      const tags = rule.tags || []
      const targetLevel = rule.level
      if (!targetLevel) return false

      return tags.every(tag => !getLevelsForTag(tag).includes(targetLevel))
    }

    if (rule.type === 'dimensionCombination') {
      const dimensions = rule.dimensions || {}
      return Object.entries(dimensions).every(([dimension, levels]) => {
        return levels?.includes(intensityByDimension[dimension as 'anxiety' | 'avoidance'])
      })
    }

    if (rule.type === 'noClearProfileMatch') {
      const profiles = rule.profiles || []
      return profiles.every(profile => !matchedProfiles.has(profile))
    }

    if (rule.tag && rule.levels?.length) {
      return matchesTagRule(rule.tag, rule.levels, profileDimension)
    }

    return false
  }

  const matchesEligibility = (profile: RegulationProfileDefinition) => {
    const eligibility = profile.rules.eligibility
    if (!eligibility) return true
    if (eligibility.fallback) return true

    if (eligibility.dimension && eligibility.levels?.length) {
      return eligibility.levels.includes(intensityByDimension[eligibility.dimension])
    }

    if (eligibility.dimensions) {
      return Object.entries(eligibility.dimensions).every(([dimension, levels]) => {
        return levels?.includes(intensityByDimension[dimension as 'anxiety' | 'avoidance'])
      })
    }

    return true
  }

  const matchesExclusion = (profile: RegulationProfileDefinition) => {
    const exclusions = profile.rules.exclusionRules || []
    return exclusions.some((exclusion: ProfileExclusionRule) => {
      if (exclusion.type === 'profileConflict' && exclusion.profile) {
        return matchedProfiles.has(exclusion.profile)
      }

      if (exclusion.type === 'tag' && exclusion.tag && exclusion.levels?.length) {
        return matchesTagRule(exclusion.tag, exclusion.levels, profile.dimension)
      }

      if (exclusion.type === 'tagCombination' && exclusion.tags?.length && exclusion.levels?.length) {
        return exclusion.tags.every((tag, index) => {
          const level = exclusion.levels?.[index]
          return level ? matchesTagRule(tag, [level], profile.dimension) : false
        })
      }

      if (exclusion.type === 'clearProfileMatchExists') {
        return matchedProfiles.size > 0
      }

      return false
    })
  }

  const matchesProfileRules = (profile: RegulationProfileDefinition) => {
    if (!matchesEligibility(profile)) return false
    if (matchesExclusion(profile)) return false

    const coreRules = profile.rules.coreRules || []
    const supportRules = profile.rules.supportRules || []
    const policy = profile.rules.matchPolicy || 'allCore'

    const allCoreMatch = coreRules.every(rule => evaluateRule(rule, profile.dimension))
    const hasSupportMatch = supportRules.some(rule => evaluateRule(rule, profile.dimension))

    if (policy === 'fallback_only') {
      return allCoreMatch
    }

    if (policy === 'allCore_plus_oneSupport') {
      return allCoreMatch && hasSupportMatch
    }

    return allCoreMatch
  }

  let anxietyProfile = 'notSignificant'
  let avoidanceProfile = 'notSignificant'
  let globalStyle = 'mixedProfile'

  profileDefinitions.forEach(profile => {
    if (!matchesProfileRules(profile)) return

    matchedProfiles.add(profile.key)

    if (profile.dimension === 'anxiety' && anxietyProfile === 'notSignificant') {
      anxietyProfile = profile.key
    }

    if (profile.dimension === 'avoidance' && avoidanceProfile === 'notSignificant') {
      avoidanceProfile = profile.key
    }
  })

  if (anxietyIntensity === 'low' && avoidanceIntensity === 'low') {
    globalStyle = 'globallySecure'
  } else if (anxietyIntensity === 'high' && avoidanceIntensity === 'low') {
    globalStyle = 'anxious'
  } else if (anxietyIntensity === 'low' && avoidanceIntensity === 'high') {
    globalStyle = 'dismissiveAvoidant'
  } else if (anxietyIntensity === 'high' && avoidanceIntensity === 'high') {
    globalStyle = 'fearfulAvoidant'
  }

  return {
    anxiety: anxietyProfile,
    avoidance: avoidanceProfile,
    globalStyle
  }
}

export const computeAttachmentQuestionnaireResults = (
  results: QuestionResult[],
  questions: AttachmentQuestion[]
): AttachmentQuestionnaireResults => {
  const dimensionsCount = new Set(questions.map(q => q.dimension)).size
  const maxQuestionsScoreByDimension = dimensionsCount > 0
    ? (questions.length / dimensionsCount) * 4
    : 0

  const dimensionScores = buildDimensionScores(results)
  const triggersByDimension = buildTriggersByDimension(dimensionScores)
  const averageScores = buildAverageScores(dimensionScores, maxQuestionsScoreByDimension)
  const regulationIndexByDimension = buildRegulationIndexByDimension(triggersByDimension, questions)
  const attachmentProfilesByDimension = buildAttachmentProfilesByDimension(averageScores, regulationIndexByDimension)
  const completionDate = formatDate(new Date())

  return {
    regulationIndexByDimension,
    averageScores,
    attachmentProfilesByDimension,
    completionDate,
    triggersByDimension,
    dimensionScores
  }
}
