<script setup lang="ts">
import questions from '~/assets/data/questions.json'
import { useAttachmentQuestionnaireWizardStore } from '~/stores/attachmentQuestionnaireWizard'
import type { QuestionResult, AttachmentQuestion } from '~/types/attachmentQuestionnaireResults'

definePageMeta({
  middleware: ["auth"],
  requiresAuth: true
})

useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

// const router = useRouter()
const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore()
const questionList = questions.questions as unknown as AttachmentQuestion[]

const resetStore = () => {
  questionnaireWizardStore.reset()
}

if (!questionnaireWizardStore.hasStarted) {
  await navigateTo('/attachment-questionnaire/introduction')
}

const handleComplete = async (result: QuestionResult[]) => {
  console.log(result)
  questionnaireWizardStore.complete(result)
  await navigateTo('/attachment-questionnaire/results')
}

onBeforeRouteLeave((to, from, next) => {
  if (to.path === '/attachment-questionnaire/results') {
    next()
    return
  } else {
    if (questionnaireWizardStore.hasStarted) {
      const leave = confirm('Êtes-vous sûr de vouloir quitter le questionnaire ? Vos réponses seront perdues.')
      if (leave) {
        resetStore()
        questionnaireWizardStore.goToIntroduction()
        next()
      } else {
        next(false)
      }
    } else {
      next()
    }
  }
})

const goHome = async () => {
  // resetStore()
  await navigateTo('/')
}
</script>

<template>
  <section>
    <button @click="goHome" class="text-blue-500 text-xs md:text-sm flex items-center">
      <LucideArrowLeft :size="16" />
      Retour à l'accueil
    </button>
    <h1 class="text-3xl font-bold my-8">Questionnaire d'attachement adulte</h1>
    <AttachmentQuestionnaireForm
      :questions="questionList"
      @complete="handleComplete"
    />
  </section>
</template>

<style>
h1 {
  text-align: center;
}
</style>