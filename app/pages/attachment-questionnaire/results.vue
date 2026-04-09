<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "questionnaire-results-guard"],
  requiresAuth: true,
  requiresResults: true,
})

useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore()

const { computedResults, sessionId, persisted, persistRetryFailed, computeError, load } =
  useAttachmentResultsPersistRetry()

await load()

const resetStore = () => {
  questionnaireWizardStore.reset()
}

const goHome = async () => {
  resetStore()
  await navigateTo('/')
}

// Depuis les resultats chauds, on interdit le retour direct vers
// l'introduction / questionnaire et on nettoie le wizard au depart
// pour eviter les doublons de session en navigation SPA.
onBeforeRouteLeave((to) => {
  if (to.path === '/attachment-questionnaire/questionnaire' || to.path === '/attachment-questionnaire/introduction') {
    return false
  }

  resetStore()
})
</script>

<template>
  <section>
    <button @click="goHome" class="text-blue-700 text-xs md:text-sm flex items-center">
      <LucideArrowLeft :size="16" />
      Retour a l'accueil
    </button>
    <h1 class="text-xl font-bold text-center md:text-4xl md:max-w-144 md:mx-auto">Tes resultats au Questionnaire d'attachement adulte</h1>
    <p class="text-sm md:text-base text-center text-gray-600">Decouvre ton style d'attachement</p>
    <p v-if="computedResults" class="text-sm md:text-base text-center text-gray-600">
      {{ computedResults.completionDate }}
    </p>

    <div class="my-10">
      <p v-if="computeError" class="text-red-600">{{ computeError }}</p>
      <p v-if="computedResults && !persisted && !persistRetryFailed" class="text-xs text-amber-600 text-center">
        Sauvegarde en cours...
      </p>
      <p v-if="persistRetryFailed" class="text-xs text-red-500 text-center">
        Tes resultats sont affiches mais n'ont pas pu etre sauvegardes. Contacte le support si le probleme persiste.
      </p>
      <AttachmentQuestionnaireResults
        v-if="computedResults"
        :docId="sessionId ?? ''"
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
