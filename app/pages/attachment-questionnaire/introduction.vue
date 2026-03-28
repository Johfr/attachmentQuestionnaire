<script setup lang="ts">
import { useAttachmentQuestionnaireStore } from '~/stores/attachmentQuestionnaire'
import { useAuthStore } from '~/stores/auth'

const questionnaireStore = useAttachmentQuestionnaireStore()
const authStore = useAuthStore()
const user = computed(() => authStore.user)

const startSurvey = async () => {
  if (user.value) {
    questionnaireStore.start()
    await navigateTo('/attachment-questionnaire/questionnaire')
  } else {
    authStore.openLoginModal()
  }
}

const resetStore = () => {
  questionnaireStore.reset()
}

const goHome = async () => {
  resetStore()
  await navigateTo('/')
}
</script>

<template>
  <main>
    <button @click="goHome" class="text-blue-500 text-xs md:text-sm flex items-center">
      <LucideArrowLeft :size="16" />
      Retour à l'accueil
    </button>
    <AttachmentQuestionnaireIntro @startSurvey="startSurvey" />
  </main>
</template>

<style>
</style>