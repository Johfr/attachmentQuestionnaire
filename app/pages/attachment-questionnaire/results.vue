<script setup lang="ts">
import { useAttachmentQuestionnaireWizardStore } from '~/stores/attachmentQuestionnaireWizard'
import { useAuthStore } from '~/stores/auth'
import { firebaseFunctions } from '~/composables/firebase/init.js'
import type {
  AttachmentQuestion,
  AttachmentQuestionnaireDisplayResults,
  ComputeAttachmentResultsApiResponse,
} from '~/types/attachmentQuestionnaireResults'
import questions from '~/assets/data/questions.json'

definePageMeta({
  middleware: ["auth", "questionnaire-results-guard"],
  requiresAuth: true,
  requiresResults: true,
  // layout: "default",
})

const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore()
const authStore = useAuthStore()
const questionList = questions.questions as unknown as AttachmentQuestion[]
const computedResults = ref<AttachmentQuestionnaireDisplayResults | null>(null)
const sessionId = ref<string | null>(null)
const persisted = ref(false)
const computeError = ref<string | null>(null)

const loadComputedResults = async () => {
  if (!questionnaireWizardStore.result?.length) {
    return
  }

  try {
    const token = await firebaseFunctions.auth.currentUser?.getIdToken()

    const partnerCtx = authStore.currentPartnerContext
    const response = await $fetch<ComputeAttachmentResultsApiResponse>('/api/attachment/results', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        results: questionnaireWizardStore.result,
        questions: questionList,
        relationContext: partnerCtx
          ? { partnerFirstName: partnerCtx.firstName, partnerAge: partnerCtx.age }
          : null,
      },
    })

    computedResults.value = response.results
    sessionId.value = response.sessionId
    persisted.value = response.persisted

    if (!response.persisted) {
      console.warn('[results] Firestore persist failed, code:', response.persistErrorCode)
    }
  } catch (error) {
    computeError.value = error instanceof Error
      ? error.message
      : 'Impossible de calculer les résultats pour le moment.'
  }
}

await loadComputedResults()

const resetStore = () => {
  questionnaireWizardStore.reset()
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
        v-if="computedResults && sessionId"
        :docId="sessionId"
        :computed-results="computedResults"
        :tags-results="computedResults.tagsResults"
        :tag-data="computedResults.tagData"
        :anxiety-average-score="computedResults.anxietyAverageScore"
        :avoidance-average-score="computedResults.avoidanceAverageScore"
        :anxiety-datasets="computedResults.anxietyDatasets"
        :avoidance-datasets="computedResults.avoidanceDatasets"
      />
    </div>
  </section>
</template>

<style>
</style>