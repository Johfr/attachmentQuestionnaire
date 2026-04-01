<script setup lang="ts">
import { useAttachmentQuestionnaireResultsStore } from '~/stores/attachmentQuestionnaireResults'
import type { AttachmentQuestionnaireDisplayResults } from '~/types/attachmentQuestionnaireResults'

definePageMeta({
  middleware: ["auth"],
  requiresAuth: true,
})

const resultsStore = useAttachmentQuestionnaireResultsStore()
const computedResults = ref<AttachmentQuestionnaireDisplayResults | null>(null)
const computeError = ref<string | null>(null)

const loadResults = async () => {
  try {
    await resultsStore.loadLatestResult()
    const stored = resultsStore.currentResult

    if (!stored) {
      return
    }

    computedResults.value = await $fetch<AttachmentQuestionnaireDisplayResults>('/api/attachment/enrich', {
      method: 'POST',
      body: { computedResults: stored }
    })
  } catch (error) {
    computeError.value = error instanceof Error
      ? error.message
      : 'Impossible de charger les résultats pour le moment.'
  }
}

await loadResults()

const goHome = async () => {
  await navigateTo('/')
}

onBeforeRouteLeave((to, from, next) => {
  if (to.path === '/attachment-questionnaire/questionnaire' || to.path === '/attachment-questionnaire/introduction') {
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
        v-if="computedResults"
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