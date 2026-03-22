<script setup lang="ts">
import type {
  QuestionResult,
  AttachmentQuestion,
  DimensionScore as DimensionScoreItem,
  RegulationLevel as LevelLabel,
  Trigger as TriggerItem,
  RegulationIndex as RegulationItem,
  AverageScore as AverageScoreItem,
  AttachmentProfilesByDimension,
  ProfileDimension,
  ProfileRule,
  ProfileExclusionRule,
  RegulationProfileDefinition,
  TagDefinition,
  TagDisplayItem
} from '~/types/attachmentQuestionnaireResults'
import DoughnutChart from "~/components/attachmentQuestionnaire/DoughnutChart.vue"
import PolarChart from "~/components/attachmentQuestionnaire/PolarChart.vue"
import { useFormattedDate } from '~/composables/useDate'
import tagsData from '~/assets/data/tags.json'
import regulationProfilesData from '~/assets/data/regulationProfiles.json'
import globalProfilesData from '~/assets/data/globalProfiles.json'
import Accordeon from '~/utils/Accordeon.vue'

// pusher dans le store uniquement les résultats brut aux questions {OK}
// récupérer ces résultats et les calculer avec la fonction déjà existante dans questionnaireForm {OK}
// importer les graph {OK}
// Afficher les résultats dans les graphs {OK}
// générer les réponses textuelles selon les résultats {OK}
// créer le composant pour pousser le user à acheter l'ensemble des résultats. Ce composant prendra en compte uniquement le profil global et sous profils ainsi qu'1 déclencheur de chaque dimension. Tout le reste sera en lorem ipsum non accessible et flouté. Quant au graph polar area, définir si on affiche tous les déclencheurs, ou seulement les déclencheurs les plus pertinents (ex: ceux avec une valeur moyenne supérieure à 2.5)
// créer le composant pour obtenir des résultats en fonction de l'historique de la relation
// pusher vers la BDD

const props = defineProps<{
  results: QuestionResult[],
  questions: AttachmentQuestion[]
}>()

// RESULTS
const maxQuestionsScoreByDimension = props.questions.length / new Set(props.questions.map(q => q.dimension)).size * 4 // return the max score for each dimension (number of questions for each dimension (anxiety, avoidance) * 5)

const regulationProfileTranslations = Object.fromEntries(
  ((regulationProfilesData.regulationProfiles || []) as Array<{ key: string; label: string }>)
    .map(profile => [profile.key, profile.label])
) as Record<string, string>

const globalProfileTranslations = Object.fromEntries(
  ((globalProfilesData.globalProfiles || []) as Array<{ key: string; label: string }>)
    .map(profile => [profile.key, profile.label])
) as Record<string, string>

const profileTranslations: Record<string, string> = {
  ...regulationProfileTranslations,
  ...globalProfileTranslations,
  notSignificant: 'Non significatif'
}

const getProfileLabel = (profileKey: string) => profileTranslations[profileKey] || profileKey

const getLevelLabel = (value: number): LevelLabel => {
  if (value >= 2.5) return 'high'
  if (value >= 1.5) return 'medium'
  return 'low'
}

const buildDimensionScores = (results: QuestionResult[]) => {
  const dimensionScores: Record<string, DimensionScoreItem[]> = {}

  results.forEach(result => {
    dimensionScores[result.dimension] = dimensionScores[result.dimension] || []
    dimensionScores[result.dimension]!.push({ questionId: result.id, value: result.value, tags: [...result.tags] })
  })

  return dimensionScores
}

const buildTriggersByDimension = (dimensionScores: Record<string, DimensionScoreItem[]>) => {
  // calculer les déclencheurs pour chaque dimension à partir des tags associés à chaque question
  // récupérer les tags et pour chaque valeur de dimension, faire la somme des valeurs associées à chaque tag pour identifier les déclencheurs les plus pertinents
  // additionner les valeurs égales à zéro pour chaque tag et faire la somme des valeurs pour chaque tag. Diviser ensuite la sommes des valeurs de chaque tag par le nombre d'occurences de ce tag pour obtenir une moyenne. Les tags avec les valeurs les plus élevées sont les déclencheurs les plus pertinents pour chaque dimension
  // rajouter les questionsId associés à chaque tag pour pouvoir ensuite faire le lien avec les questions du questionnaire et ainsi proposer des conseils personnalisés en fonction des déclencheurs identifiés
  const triggersByDimension: Record<string, TriggerItem[]> = {}

  Object.entries(dimensionScores).forEach(([dimension, values]) => {
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

    triggersByDimension[dimension] = Object.entries(tagScores).map(([tag, { totalValue, count, questionIds }]): TriggerItem => ({
      tag,
      averageValue: totalValue / count,
      questionIds,
      label: getLevelLabel(totalValue / count)
    })).sort((a, b) => b.averageValue - a.averageValue) // trier les déclencheurs par ordre décroissant de pertinence
  })

  return triggersByDimension
}

const buildAverageScores = (dimensionScores: Record<string, DimensionScoreItem[]>) => {
  return Object.entries(dimensionScores).map(([dimension, values]) => {
    const scoreRatio = (values.reduce((sum, item) => sum + item.value, 0)) / maxQuestionsScoreByDimension
    return {
      dimension,
      average: Math.round(scoreRatio * 100),
      // selon le score average obtenu, identifier le niveau d'intensité pour chaque dimension (anxiété, évitement). Se baser sur l'échelle suivante :0 à 33 = faible, 34 à 66 = moyen, 67 à 100 = élevé.
      intensityLevel: scoreRatio * 100 <= 33 ? 'low' : (scoreRatio * 100 <= 66 ? 'medium' : 'high')
    }
  }) as AverageScoreItem[]
}

const buildRegulationIndexByDimension = (
  triggersByDimension: Record<string, TriggerItem[]>,
  questions: AttachmentQuestion[]
) => {
  // déterminer l'indice de régulation par rapport au style dominant, par le niveau de certains tags (déja calculé dans triggersByDimension) et de leur association. vu que mon échelle va de 0 à 4 je dois donc récupérer le nombre de fois que le tag est présent dans les questions, définir son maximum (un multiple de 4) et multiplier par 1/3 pour obtenir le niveau faible, modéré, élevé. SI un tag est présent 3 fois dans les questions, son maximum sera de 12, donc un score inférieur ou égal à 4 sera considéré comme faible, un score compris entre 4 et 8 sera considéré comme modéré, et un score supérieur à 8 sera considéré comme élevé. code ça dans une fonction à part pour chaque tag et faire la moyenne des scores obtenus pour les tags associés à chaque dimension pour obtenir un indice de régulation global pour chaque dimension.
  const regulationIndexByDimension: Record<string, RegulationItem[]> = {}

  Object.entries(triggersByDimension).forEach(([dimension, triggers]) => {
    regulationIndexByDimension[dimension] = triggers.map(({ tag, averageValue }) => {
      const questionCountForTag = questions.filter(q => q.tags.includes(tag)).length
      const maxTagScore = questionCountForTag * 4
      // rajoute la valeur numérique totale de chaque tag. SI un tag est présent sur 2 questions, son score max hypothétique serait de 4x2. Sa valeur réelle sera celle défini par le choix du user lors de la réponse à la question. Je veux afficher le résultatsous forme de clé/valeur du type scoreTotal : 4 (le user à obtenu un score de 2 à chaque question) et scoreMax : 8 (4x2).
      const tagTotalValues = averageValue * questionCountForTag
      // défini le niveau de régulation pour chaque tag en fonction de la valeur numérique totale du tag et de son maximum hypothétique. SI un tag est présent 3 fois dans les questions, son maximum sera de 12, donc un score inférieur ou égal à 4 sera considéré comme faible, un score compris entre 4 et 8 sera considéré comme modéré, et un score supérieur à 8 sera considéré comme élevé.
      const regulationLevel = tagTotalValues <= maxTagScore / 3 ? 'low' : (tagTotalValues <= (maxTagScore / 3) * 2 ? 'medium' : 'high')

      return { tag, tagTotalValues, maxTagScore, regulationLevel }
    })
  })

  return regulationIndexByDimension
}

const buildAttachmentProfilesByDimension = (
  averageScores: AverageScoreItem[],
  regulationIndexByDimension: Record<string, RegulationItem[]>
) => {
  const profileDefinitions = ((regulationProfilesData.regulationProfiles || []) as RegulationProfileDefinition[])
    .filter(profile => profile.dimension === 'anxiety' || profile.dimension === 'avoidance')
  const anxietyIntensity = averageScores.find(s => s.dimension === 'anxiety')?.intensityLevel ?? 'low'
  const avoidanceIntensity = averageScores.find(s => s.dimension === 'avoidance')?.intensityLevel ?? 'low'
  const intensityByDimension: Record<'anxiety' | 'avoidance', LevelLabel> = {
    anxiety: anxietyIntensity,
    avoidance: avoidanceIntensity
  }

  // Récupérer les triggers pour chaque dimension
  const anxietyTriggers = regulationIndexByDimension['anxiety'] || []
  const avoidanceTriggers = regulationIndexByDimension['avoidance'] || []
  const allTriggers = [...anxietyTriggers, ...avoidanceTriggers]
  const matchedProfiles = new Set<string>()

  const getTagLevel = (tag: string, dimension?: 'anxiety' | 'avoidance'): LevelLabel | undefined => {
    if (dimension === 'anxiety') {
      return anxietyTriggers.find(t => t.tag === tag)?.regulationLevel
    }
    if (dimension === 'avoidance') {
      return avoidanceTriggers.find(t => t.tag === tag)?.regulationLevel
    }
    return allTriggers.find(t => t.tag === tag)?.regulationLevel
  }

  const getLevelsForTag = (tag: string): LevelLabel[] => {
    return allTriggers.filter(t => t.tag === tag).map(t => t.regulationLevel)
  }

  const matchesTagRule = (tag: string, levels: LevelLabel[], profileDimension: ProfileDimension) => {
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
    return exclusions.some(exclusion => {
      if (exclusion.type === 'profileConflict' && exclusion.profile) {
        return matchedProfiles.has(exclusion.profile)
      }

      if (exclusion.type === 'tag' && exclusion.tag && exclusion.levels?.length) {
        return matchesTagRule(exclusion.tag, exclusion.levels, profile.dimension)
      }

      if (exclusion.type === 'tagCombination' && exclusion.tags?.length && exclusion.levels?.length) {
        return exclusion.tags.every((tag, index) => {
          const level = exclusion.levels![index]
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
    if (!matchesProfileRules(profile)) {
      return
    }

    matchedProfiles.add(profile.key)

    if (profile.dimension === 'anxiety' && anxietyProfile === 'notSignificant') {
      anxietyProfile = profile.key
    }

    if (profile.dimension === 'avoidance' && avoidanceProfile === 'notSignificant') {
      avoidanceProfile = profile.key
    }
  })

  // globalStyle est calculé uniquement à partir des niveaux de dimensions.
  if (anxietyIntensity === 'low' && avoidanceIntensity === 'low') {
    globalStyle = 'globallySecure'
  } else if (anxietyIntensity === 'high' && avoidanceIntensity === 'low') {
    globalStyle = 'anxious'
  } else if (anxietyIntensity === 'low' && avoidanceIntensity === 'high') {
    globalStyle = 'dismissiveAvoidant'
  } else if (anxietyIntensity === 'high' && avoidanceIntensity === 'high') {
    globalStyle = 'fearfulAvoidant'
  } else {
    globalStyle = 'mixedProfile'
  }

  const attachmentProfilesByDimension: AttachmentProfilesByDimension = {
    anxiety: anxietyProfile,
    avoidance: avoidanceProfile,
    globalStyle
  }

  return attachmentProfilesByDimension
}

const buildCompletionDate = () => {
  // DAte du jour où le questionnaire est complété pour permettre à l'utilisateur de suivre l'évolution de ses résultats dans le temps s'il refait le questionnaire à plusieurs reprises
  return useFormattedDate(new Date())
}

const calculateResults = () => {
  const dimensionScores = buildDimensionScores(props.results)
  const triggersByDimension = buildTriggersByDimension(dimensionScores)
  const averageScores = buildAverageScores(dimensionScores)
  const regulationIndexByDimension = buildRegulationIndexByDimension(triggersByDimension, props.questions)
  const attachmentProfilesByDimension = buildAttachmentProfilesByDimension(averageScores, regulationIndexByDimension)
  const completionDate = buildCompletionDate()

  // triggersByDimension : utile pour connaitre le averageValue qu'à obtenu le user pour chaque tag et ainsi identifier les déclencheurs les plus pertinents pour chaque dimension. Utile pour l'affichage des résultats et la génération de conseils personnalisés.
  // dimensionScores : utile uniquement pour générer les scores. Inutiles pour l'affichage des données
  return {
    regulationIndexByDimension,
    averageScores,
    attachmentProfilesByDimension,
    completionDate,
    triggersByDimension,
    dimensionScores
  }
}


// TAGS
// Créer une fonction qui retournera un tableau
// récupérer les données de regulationIndexByDimension
// classer les déclencheurs en fonction de la valeur de tagTotalValues du plus élevé au plus faible selon leur dimension d'appartenance (anxiété, évitement) pour identifier les déclencheurs les plus pertinents pour chaque dimension. Un .sort() suffira.
// boucler sur le json tags pour récupérer label, indicator, trigger, associatedBehaviors, outputTexts[regulationLevel], advices[regulationLevel] pour chaque déclencheur, et pusher dans le nouveau tableau généré.
// retourner un objet de type {
// {
//     "anxiety": [
//       {
//         "tag": "distanceSilence",
//         "regulationLevel": "high",
//         "label" : "...",
//         "indicator" : "...",
//         "trigger" : "...",
//         "associatedBehaviors" : "...",
//         "outputTexts[regulationLevel]" : "...", // ici on récupère directement la bonne donnée selon le regulationLevel du déclencheur
//         "advices[regulationLevel]" : "...", // ici on récupère directement la bonne donnée selon le regulationLevel du déclencheur
//       }
//     }
// le tag conflict à une dimension mixed, il peut donc apparaître à la fois dans les déclencheurs d'anxiété et d'évitement. Pour éviter les doublons dans l'affichage, n'afficher ce tag qu'une fois peu importe la dimension dans laquelle il apparaît en priorité. SI le tag conflict obtient un score élevé dans les deux dimensions, privilégier son affichage dans la dimension anxiété et ne pas l'afficher dans la dimension évitement même s'il est présent dans les déclencheurs d'évitement. Ne rien pusher dans la dimension qui ne contiendra pas le tag conflict : ni undefined, ni null, ni un objet vide. Rien.

const getTagsDataForDisplay = () => {
  const regulationData = graphData.value.regulationIndexByDimension
  const anxietyTriggers = [...(regulationData?.anxiety || [])].sort((a, b) => b.tagTotalValues - a.tagTotalValues)
  const avoidanceTriggers = [...(regulationData?.avoidance || [])].sort((a, b) => b.tagTotalValues - a.tagTotalValues)

  const tagsCatalog = (tagsData.tags || []) as TagDefinition[]
  const findTagDefinition = (tagKey: string) => tagsCatalog.find(t => t.key === tagKey)

  const anxietyConflict = anxietyTriggers.find(t => t.tag === 'conflict')
  const avoidanceConflict = avoidanceTriggers.find(t => t.tag === 'conflict')

  let conflictDimension: 'anxiety' | 'avoidance' | null = null

  if (anxietyConflict && avoidanceConflict) {
    if (anxietyConflict.regulationLevel === 'high' && avoidanceConflict.regulationLevel === 'high') {
      conflictDimension = 'anxiety'
    } else {
      conflictDimension = anxietyConflict.tagTotalValues >= avoidanceConflict.tagTotalValues ? 'anxiety' : 'avoidance'
    }
  } else if (anxietyConflict) {
    conflictDimension = 'anxiety'
  } else if (avoidanceConflict) {
    conflictDimension = 'avoidance'
  }

  const mapForDimension = (dimension: 'anxiety' | 'avoidance', triggers: RegulationItem[]) => {
    const displayItems: TagDisplayItem[] = []

    triggers.forEach(triggerItem => {
      if (triggerItem.tag === 'conflict' && conflictDimension && conflictDimension !== dimension) {
        return
      }

      const tagDefinition = findTagDefinition(triggerItem.tag)
      if (!tagDefinition) {
        return
      }

      displayItems.push({
        tag: tagTranslations[triggerItem.tag as keyof typeof tagTranslations] || triggerItem.tag,
        regulationLevel: triggerItem.regulationLevel,
        label: tagDefinition.label,
        indicator: tagDefinition.indicator,
        trigger: tagDefinition.trigger,
        associatedBehaviors: tagDefinition.associatedBehaviors,
        outputText: tagDefinition.outputTexts[triggerItem.regulationLevel],
        advices: tagDefinition.advices[triggerItem.regulationLevel]
      })
    })

    return displayItems
  }

  return {
    anxiety: mapForDimension('anxiety', anxietyTriggers),
    avoidance: mapForDimension('avoidance', avoidanceTriggers)
  }
}

const tagsResults = computed(() => getTagsDataForDisplay())

// GRAPHS
const graphData = computed(() => calculateResults())
const DoughnutChartData = ref([graphData.value.averageScores?.[0]?.average ?? 0, graphData.value.averageScores?.[1]?.average ?? 0])

const anxietyLabel = ['Anxiety']
const avoidanceLabel = ['Avoidance']

const anxietyDatasets = computed(() => [
  { 
    data: [DoughnutChartData.value[0] ?? 0, (100 - (DoughnutChartData.value[0] ?? 0))],
    backgroundColor: ['#bae6fd', '#fefefe1c'],
    borderRadius: 100,
    spacing: 5,
  }
])

const avoidanceDatasets = computed(() => [
  { 
    data: [DoughnutChartData.value[1] ?? 0, (100 - (DoughnutChartData.value[1] ?? 0))],
    backgroundColor: ['#fecdd3', '#fefefe1c'],
    borderRadius: 100,
    spacing: 5,
  }
])

const tagTranslations = {
  distanceSilence: 'Distance/Silence',
  validationRequired: 'Validation requise',
  quickRepair: 'Réparation rapide',
  proximityDiscomfort: 'Inconfort de proximité',
  conflict: 'Conflit',
  autonomyNeed: 'Besoin d\'autonomie',
  fearOfLoss: 'Peur de la perte',
  overthinking: 'Rumination',
  emotionalContainment: 'Retenue émotionnelle',
  controlNeed: 'Besoin de contrôle',
  withdrawalUnderStress: 'Retrait sous stress'
}


// La value de chaque label dans tagData doit correspondre à l'objet corresponsant de regulationIndexByDimension selon la dimension à laquelle il appartient : anxiety ou avoidance. La dimension à laquelle appartient les tag doit être présente pour faciliter le script et le rendre autonome.
// La value devra être calculée selon le rapport entre tagTotalValues et maxTagScore pour obtenir un score en % sur 100.
// Ajuste le code pour que les bonnes valeurs soient prise en compte dans tagData.
const tagData = computed(() => {
  const allTags: { label: string; value: number; color: string; dimension: string }[] = []

  // Add anxiety tags
  graphData.value.regulationIndexByDimension?.anxiety?.forEach(tagObj => {
    const value = Math.round((tagObj.tagTotalValues / tagObj.maxTagScore) * 100)
    const color = tagObj.tag === 'conflict' ? '#f97316' : '#bae6fd'
    allTags.push({
      label: tagTranslations[tagObj.tag as keyof typeof tagTranslations] || tagObj.tag,
      value,
      color,
      dimension: 'anxiety'
    })
  })

  // Add avoidance tags
  graphData.value.regulationIndexByDimension?.avoidance?.forEach(tagObj => {
    const value = Math.round((tagObj.tagTotalValues / tagObj.maxTagScore) * 100)
    const color = tagObj.tag === 'conflict' ? '#f97316' : '#fecdd3'
    allTags.push({
      label: tagTranslations[tagObj.tag as keyof typeof tagTranslations] || tagObj.tag,
      value,
      color,
      dimension: 'avoidance'
    })
  })

  // Remove duplicates by label, keeping the first occurrence (or handle conflict specifically)
  const uniqueTags = allTags.filter((tag, index, self) => 
    index === self.findIndex(t => t.label === tag.label)
  )

  return uniqueTags
})
</script>

<template>
  <p>Composant Resultats</p>
  <div class="donuts-container">
    <DoughnutChart
      :labels="anxietyLabel"
      :datasets="anxietyDatasets"
      :legend="{ display: false }"
      :cutout="'80%'"
      :width="'150px'"
      :height="'150px'"
      :center-text="`Anxiety\n${DoughnutChartData[0] ?? 0}%`"
      :center-text-font-size="14"
      :center-text-font-color="'#0369a1'" 
    />
    <DoughnutChart
      :labels="avoidanceLabel"
      :datasets="avoidanceDatasets"
      :legend="{ display: false }"
      :cutout="'80%'"
      :width="'150px'"
      :height="'150px'"
      :center-text="`Avoidance\n${DoughnutChartData[1] ?? 0}%`"
      :center-text-font-size="14"
      :center-text-font-color="'#be123c'" 
    />
  </div>

  <section>
    <h2 class="text-2xl font-bold">Tes profils d'attachement</h2>
    <Accordeon title="Ton style global de régulation">
    <p class="mb-3">
      {{ getProfileLabel(graphData.attachmentProfilesByDimension.globalStyle) }}
    </p>
    <p class="mb-3" v-for="profile in globalProfilesData.globalProfiles" :key="profile.key">
      {{ profile.key === graphData.attachmentProfilesByDimension.globalStyle ? profile.explanation : '' }}
    </p>
    </Accordeon>

    <Accordeon title="Ton sous-Profil d'anxiété">
      <p class="mb-3">
        {{ getProfileLabel(graphData.attachmentProfilesByDimension.anxiety) }}
      </p>
      <p class="mb-3" v-for="profile in regulationProfilesData.regulationProfiles" :key="profile.key">
        {{ profile.key === graphData.attachmentProfilesByDimension.anxiety ? profile.explanation : '' }}
      </p>
    </Accordeon>
    
    <Accordeon title="Ton sous-Profil d'évitement">
      <p class="mb-3">
        {{ getProfileLabel(graphData.attachmentProfilesByDimension.avoidance) }}
      </p>
      <p class="mb-3" v-for="profile in regulationProfilesData.regulationProfiles" :key="profile.key">
        {{ profile.key === graphData.attachmentProfilesByDimension.avoidance ? profile.explanation : '' }}
      </p>
    </Accordeon>

    <!-- {{ globalProfilesData.globalProfiles }} -->

    <!-- globalProfiles -->
  </section>

  <section style="margin-top: 2rem">
    <h2 class="mb-3 text-2xl font-bold">Les déclencheurs</h2>
    <PolarChart :tags="tagData" :width="'600px'" :height="'600px'" />
  </section>

  <section class="results">
    <!-- comment afficher tagsResults.avoidance sans dupliquer tout le code ? -->
    <div v-for="dimension in ['anxiety', 'avoidance']" :key="dimension">
      <h2 class="text-3xl font-bold mt-10 mb-5">{{ dimension === 'anxiety' ? 'Décelencheurs Anxieux' : 'Décelencheurs Évitants' }}</h2>
      
      <div v-for="tag in tagsResults[dimension as 'anxiety' | 'avoidance']" :key="tag.label" class="mt-5">
        <Accordeon :title="`${tag.tag} : ${tag.label} (${tag.regulationLevel})`">

          <h3 class="text-2xl font-bold">{{ tag.tag }} : {{ tag.label }} ({{ tag.regulationLevel }})</h3>
          <p class="my-5"><strong>Indicateur :</strong> {{ tag.indicator }}</p>
          <p class="my-5"><strong>Déclencheur :</strong> {{ tag.trigger }}</p>
          
          <div class="my-5"> 
            <strong>Ce genre de profil :</strong>
            <ul class="pl-5">
              <li v-for="(behavior, index) in tag.associatedBehaviors" :key="index" class="list-disc list-inside first-letter:uppercase">
                {{ behavior }}
              </li>
            </ul>
          </div>

          <p><strong>Interprétation des résultats :</strong> {{ tag.outputText }}</p>
          
          <div class="my-5">
            <strong>Mon conseil :</strong>
            <ul class="pl-5">
              <li v-for="(advice, index) in tag.advices" :key="index" class="list-disc list-inside first-letter:uppercase">
                {{ advice }}
                
              </li>
            </ul>
          </div>
        </Accordeon>
      </div>
    </div>

    
    <div class="hidden">
    <div v-for="tag in tagsResults.anxiety" :key="tag.label" class="mt-5">
      <Accordeon :title="`${tag.tag} : ${tag.label} (${tag.regulationLevel})`">
        <h3 class="text-2xl font-bold">{{ tag.tag }} : {{ tag.label }} ({{ tag.regulationLevel }})</h3>
        <p class="my-5"><strong>Indicateur :</strong> {{ tag.indicator }}</p>
        <p class="my-5"><strong>Déclencheur :</strong> {{ tag.trigger }}</p>
        
        <div class="my-5"> 
          <strong>Ce genre de profil :</strong>
          <ul class="pl-5">
            <li v-for="(behavior, index) in tag.associatedBehaviors" :key="index" class="list-disc list-inside first-letter:uppercase">
              {{ behavior }}
            </li>
          </ul>
        </div>

        <p><strong>Interprétation des résultats :</strong> {{ tag.outputText }}</p>
        
        <div class="my-5">
          <strong>Mon conseil :</strong>
          <ul class="pl-5">
            <li v-for="(advice, index) in tag.advices" :key="index" class="list-disc list-inside first-letter:uppercase">
              {{ advice }}
              
            </li>
          </ul>
        </div>
      </Accordeon>

    </div>
    </div>
  </section>
  <pre>
    {{ calculateResults() }}
    <!-- tagdata : {{ getTagsDataForDisplay() }} -->
  </pre>
</template>

<style lang="scss" scoped>
.donuts-container {
  display: flex;
}
</style>