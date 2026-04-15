<script setup lang="ts">
import questions from '~/assets/data/questions.json'
import type { QuestionResult, AttachmentQuestion } from '~/types/attachmentQuestionnaireResults'

definePageMeta({
  middleware: ['auth'],
  requiresAuth: true,
})

useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore()
const questionList = questions.questions as unknown as AttachmentQuestion[]
const isCompleting = ref(false)
const completionError = ref<string | null>(null)

const resetStore = () => {
  questionnaireWizardStore.reset()
}

if (!questionnaireWizardStore.hasStarted) {
  await navigateTo('/attachment-questionnaire/introduction')
}

const handleComplete = async (result: QuestionResult[]) => {
  if (isCompleting.value) return

  isCompleting.value = true
  completionError.value = null

  try {
    questionnaireWizardStore.complete(result)
    await navigateTo('/attachment-questionnaire/results')
  } catch (error) {
    completionError.value = error instanceof Error
      ? error.message
      : 'Impossible de valider le questionnaire pour le moment.'
  } finally {
    isCompleting.value = false
  }
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
    <p
      v-if="completionError"
      class="mb-4 text-center text-sm text-red-600"
      data-testid="questionnaire-submit-error"
    >
      {{ completionError }}
    </p>
    <AttachmentQuestionnaireForm
      :questions="questionList"
      :is-submitting="isCompleting"
      @complete="handleComplete"
    />
  </section>
</template>
