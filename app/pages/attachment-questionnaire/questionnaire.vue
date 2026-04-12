<script setup lang="ts">
import questions from '~/assets/data/questions.json'
import type { QuestionResult, AttachmentQuestion } from '~/types/attachmentQuestionnaireResults'

definePageMeta({
  middleware: ["auth"],
  requiresAuth: true
})

useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore()
const questionList = questions.questions as unknown as AttachmentQuestion[]

const resetStore = () => {
  questionnaireWizardStore.reset()
}

if (!questionnaireWizardStore.hasStarted) {
  await navigateTo('/attachment-questionnaire/introduction')
}

const handleComplete = async (result: QuestionResult[]) => {
  questionnaireWizardStore.complete(result)
  await navigateTo('/attachment-questionnaire/results')
}

onBeforeRouteLeave((to) => {
  if (to.path === '/attachment-questionnaire/results') {
    return true
  }

  if (!questionnaireWizardStore.hasStarted) {
    return true
  }

  const leave = confirm('Êtes-vous sûr de vouloir quitter le questionnaire ? Vos réponses seront perdues.')
  if (!leave) {
    return false
  }

  resetStore()
  return true
})

const goHome = async () => {
  // resetStore()
  await navigateTo('/')
}
</script>

<template>
  <section>
    <button @click="goHome" class="mt-5 mb-6 flex items-center text-xs text-theme-text md:text-sm">
      <LucideArrowLeft :size="16" />
      Retour à l'accueil
    </button>
    <h1 class="text-3xl font-bold my-8 text-center">Questionnaire d'attachement adulte</h1>
    <AttachmentQuestionnaireForm
      :questions="questionList"
      @complete="handleComplete"
    />
  </section>
</template>
