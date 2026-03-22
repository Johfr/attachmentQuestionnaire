<script setup lang="ts">
import { useAttachmentQuestionnaireStore } from '~/stores/attachmentQuestionnaire'
import type { AttachmentQuestion } from '~/types/attachmentQuestionnaireResults'
import questions from '~/assets/data/questions.json'

definePageMeta({
  middleware: ["auth", "questionnaire-results-guard"],
  requiresAuth: true,
  requiresResults: true,
  // layout: "default",
})

const questionnaireStore = useAttachmentQuestionnaireStore()
const questionList = questions.questions as unknown as AttachmentQuestion[]

// if (!questionnaireStore.isCompleted || !questionnaireStore.result) {
//   await navigateTo('/')
// }


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
</script>

<template>
  <section>
    <button @click="goHome" class="light-button">
      <LucideArrowLeft :size="16" />
      Retour à l'accueil
    </button>
    <h1 title="attachment survey">Questionnaire d'attachement adulte</h1>
    <h2>Résultats</h2>
    <AttachmentQuestionnaireResults v-if="questionnaireStore.result" :results="questionnaireStore.result" :questions="questionList" />
  </section>
</template>

<style>
</style>