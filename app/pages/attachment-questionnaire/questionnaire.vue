<script setup lang="ts">
import questions from '~/assets/data/questions.json'
import { useAttachmentQuestionnaireStore } from '~/stores/attachmentQuestionnaire'
import type { QuestionResult, AttachmentQuestion } from '~/types/attachmentQuestionnaireResults'

definePageMeta({
  middleware: ["auth"],
  requiresAuth: true
})

// const router = useRouter()
const questionnaireStore = useAttachmentQuestionnaireStore()
const questionList = questions.questions as unknown as AttachmentQuestion[]

const resetStore = () => {
  questionnaireStore.reset()
}

if (!questionnaireStore.hasStarted) {
  await navigateTo('/attachment-questionnaire/introduction')
}

const handleComplete = async (result: QuestionResult[]) => {
  console.log(result)
  questionnaireStore.complete(result)
  await navigateTo('/attachment-questionnaire/results')
}

onBeforeRouteLeave((to, from, next) => {
  if (to.path === '/attachment-questionnaire/results') {
    next()
    return
  } else {
    if (questionnaireStore.hasStarted) {
      const leave = confirm('Êtes-vous sûr de vouloir quitter le questionnaire ? Vos réponses seront perdues.')
      if (leave) {
        resetStore()
        questionnaireStore.goToIntroduction()
        next()
      } else {
        next(false)
      }
    } else {
      next()
    }
  }
})
</script>

<template>
  <section>
    <!-- {{ questionnaireStore.isCompleted }} -->
    <h1 title="attachment survey" class="text-lg font-bold my-8 text-primary">Questionnaire d'attachement adulte</h1>
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