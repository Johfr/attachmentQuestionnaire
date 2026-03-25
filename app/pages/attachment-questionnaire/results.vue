<script setup lang="ts">
import { useAttachmentQuestionnaireStore } from '~/stores/attachmentQuestionnaire'
import type {
  AttachmentQuestion,
  AttachmentDimension,
  AttachmentQuestionnaireResults,
  DoughnutDataset,
  PolarTagDataItem,
  RegulationIndex as RegulationItem,
  TagDefinition,
  TagDisplayItem,
  TagsResultsByDimension
} from '~/types/attachmentQuestionnaireResults'
import questions from '~/assets/data/questions.json'
import tagsProfilsData from '~/assets/data/tagsProfils.json'

definePageMeta({
  middleware: ["auth", "questionnaire-results-guard"],
  requiresAuth: true,
  requiresResults: true,
  // layout: "default",
})

const questionnaireStore = useAttachmentQuestionnaireStore()
const questionList = questions.questions as unknown as AttachmentQuestion[]
const computedResults = ref<AttachmentQuestionnaireResults | null>(null)
const computeError = ref<string | null>(null)

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

const getConflictDimension = (regulationData: AttachmentQuestionnaireResults['regulationIndexByDimension']) => {
  const anxietyConflict = regulationData.anxiety.find(t => t.tag === 'conflict')
  const avoidanceConflict = regulationData.avoidance.find(t => t.tag === 'conflict')

  if (anxietyConflict && avoidanceConflict) {
    if (anxietyConflict.regulationLevel === 'high' && avoidanceConflict.regulationLevel === 'high') {
      return 'anxiety' as const
    }

    return anxietyConflict.tagTotalValues >= avoidanceConflict.tagTotalValues ? 'anxiety' : 'avoidance'
  }

  if (anxietyConflict) {
    return 'anxiety' as const
  }

  if (avoidanceConflict) {
    return 'avoidance' as const
  }

  return null
}

const getTagsResultsForDisplay = (results: AttachmentQuestionnaireResults): TagsResultsByDimension => {
  const regulationData = results.regulationIndexByDimension
  const relativeScore = (item: RegulationItem) =>
    item.maxTagScore > 0 ? item.tagTotalValues / item.maxTagScore : 0

  const anxietyTriggers = [...regulationData.anxiety].sort((a, b) => relativeScore(b) - relativeScore(a))
  const avoidanceTriggers = [...regulationData.avoidance].sort((a, b) => relativeScore(b) - relativeScore(a))
  const conflictDimension = getConflictDimension(regulationData)

  const tagsCatalog = (tagsProfilsData.tags || []) as TagDefinition[]
  const findTagDefinition = (tagKey: string) => tagsCatalog.find(t => t.key === tagKey)

  const mapForDimension = (dimension: AttachmentDimension, triggers: RegulationItem[]) => {
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
        key: triggerItem.tag,
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

const loadComputedResults = async () => {
  if (!questionnaireStore.result?.length) {
    return
  }

  try {
    const endpoint: string = '/api/attachment/results'
    computedResults.value = await $fetch<AttachmentQuestionnaireResults>(endpoint, {
      method: 'POST',
      body: {
        results: questionnaireStore.result,
        questions: questionList
      }
    })
  } catch (error) {
    computeError.value = error instanceof Error
      ? error.message
      : 'Impossible de calculer les résultats pour le moment.'
  }
}

await loadComputedResults()

const tagsResults = computed<TagsResultsByDimension>(() => {
  if (!computedResults.value) {
    return {
      anxiety: [],
      avoidance: []
    }
  }

  return getTagsResultsForDisplay(computedResults.value)
})

const anxietyAverageScore = computed(() => {
  return computedResults.value?.averageScores.find(score => score.dimension === 'anxiety')?.average ?? 0
})

const avoidanceAverageScore = computed(() => {
  return computedResults.value?.averageScores.find(score => score.dimension === 'avoidance')?.average ?? 0
})

const anxietyDatasets = computed<DoughnutDataset[]>(() => [
  {
    data: [anxietyAverageScore.value, 100 - anxietyAverageScore.value],
    backgroundColor: ['#bae6fd', '#fefefe1c'],
    borderRadius: 100,
    spacing: 5
  }
])

const avoidanceDatasets = computed<DoughnutDataset[]>(() => [
  {
    data: [avoidanceAverageScore.value, 100 - avoidanceAverageScore.value],
    backgroundColor: ['#fecdd3', '#fefefe1c'],
    borderRadius: 100,
    spacing: 5
  }
])

const tagData = computed<PolarTagDataItem[]>(() => {
  if (!computedResults.value) {
    return []
  }

  const regulationData = computedResults.value.regulationIndexByDimension
  const conflictDimension = getConflictDimension(regulationData)
  const allTags: PolarTagDataItem[] = []
  const relativeScore = (item: RegulationItem) =>
    item.maxTagScore > 0 ? item.tagTotalValues / item.maxTagScore : 0

  const pushTagsForDimension = (dimension: AttachmentDimension, tagList: RegulationItem[]) => {
    tagList.forEach(tagObj => {
      if (tagObj.tag === 'conflict' && conflictDimension && conflictDimension !== dimension) {
        return
      }

      const value = tagObj.maxTagScore > 0
        ? Math.round((tagObj.tagTotalValues / tagObj.maxTagScore) * 100)
        : 0

      allTags.push({
        key: tagObj.tag,
        label: tagTranslations[tagObj.tag as keyof typeof tagTranslations] || tagObj.tag,
        value,
        color: tagObj.tag === 'conflict' ? '#f97316' : dimension === 'anxiety' ? '#bae6fd' : '#fecdd3',
        dimension
      })
    })
  }

  const avoidanceSorted = [...regulationData.avoidance].sort((a, b) => relativeScore(b) - relativeScore(a))
  const anxietySorted = [...regulationData.anxiety].sort((a, b) => relativeScore(a) - relativeScore(b))

  pushTagsForDimension('avoidance', avoidanceSorted)
  pushTagsForDimension('anxiety', anxietySorted)

  return allTags
})

const resetStore = () => {
  questionnaireStore.reset()
}

const goHome = async () => {
  resetStore()
  await navigateTo('/')
}

// si le user a fini le test et est à la page des résultats il ne peut plus accéder au questionnaire ou à l'introduction. Il doit repasser par la home
// Si le user n'est pas premium il ne peut repasser le test qu'une fois par mois
// si le user est premium il peut repasser le test 1 fois par semaine
// dans tous les cas, s'assurer que le store est reset quand il quitte la page results.
onBeforeRouteLeave((to, from, next) => {
  if (to.path === '/attachment-questionnaire/questionnaire' || to.path === '/attachment-questionnaire/introduction') {
    // bloquer la navigation vers le questionnaire ou l'introduction depuis les résultats
    next(false)
  } else {
    next()
  }
})

// const resultsExplanationText = ref('Le type global est calculé selon 2 dimensions : l'anxiété et l'évitement. Le score aux questions permets de définir le degré d'anxiété et d'évitement chez l'individu. 
// Les types sécure, anxieux, évitant, désorganisé sont définis selon les résultats obtenus sur ces 2 axes (voir graphique ci-dessous) -> Mettre graphique -|-
// A partir de là on peut définir :
// sécure = anxiété low + évitement low
// anxieux = anxiété high + évitement low
// etc. (rajouter les 2 autres types)

// Mais ce type global ne défini pas toujours de façon exacte l'individu. C'est la raison pour laquelle les calculs au questionnaire prennent en compte différent déclencheurs. 5 déclencheures pour la dimension anxiété et 5 déclencheures pour la dimension évitante.
// Ce sont ces déclencheurs (et leur association) qui permettent de définir des sous profils.
// Un profil à l'attachement Anxieux avec un score compris entre 40% et 70% peut avoir un sous profil Anxieux-ambivalent ou Anxieux régulé selon si l'association de certains déclencheurs est pertinent.
// L'important dans la lecture des résultats n'est pas de s'apposer une étiquette sur le front mais bien de comprendre les mécanismes qui déclenche notre attachement.
// Et c'est tout l'intérêt des déclencheurs ci-dessous. Grâce à eux il est désormais possible de savoir avec une exactitude proche de 80% les situations qui font plonger un individu dans son attachement anxieux ou évitant.
// A noter qu'une personne dite "sécure" peut tout à fait avoir des scores medium sur certains déclencheurs. Cela indique que même en étant sécure certaines situations l'active émotionnellement.
// Mieux comprendre ses déclencheurs et travailler dessus prend alors tout son sens.') 


</script>

<template>
  <section>
    <button @click="goHome" class="light-button">
      <LucideArrowLeft :size="16" />
      Retour à l'accueil
    </button>
    <h1 class="text-xl font-bold text-center md:text-4xl md:max-w-144 md:mx-auto">Tes résultats au Questionnaire d'attachement adulte</h1>
    <p class="text-sm md:text-base text-center text-gray-600">Découvre ton style d'attachement</p>
    <p v-if="computedResults" class="text-sm md:text-base text-center text-gray-600">
      {{ computedResults.completionDate }}
    </p>
    
    <div class="my-10">
      <p v-if="computeError" class="text-red-600">{{ computeError }}</p>
      <AttachmentQuestionnaireResults
        v-if="computedResults"
        :computed-results="computedResults"
        :tags-results="tagsResults"
        :tag-data="tagData"
        :anxiety-average-score="anxietyAverageScore"
        :avoidance-average-score="avoidanceAverageScore"
        :anxiety-datasets="anxietyDatasets"
        :avoidance-datasets="avoidanceDatasets"
      />
    </div>
  </section>
</template>

<style>
</style>