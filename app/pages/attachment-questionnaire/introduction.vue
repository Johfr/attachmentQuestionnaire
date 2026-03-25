<script setup lang="ts">
import { useAttachmentQuestionnaireStore } from '~/stores/attachmentQuestionnaire'
import { useAuthStore } from '~/stores/auth'

// definePageMeta({
//   // middleware: ["auth"],
//   requiresAuth: false,
//   // layout: false,
// })

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
// onBeforeRouteLeave((to, from, next) => {
//   if (to.path !== '/attachment-questionnaire/questionnaire') {
//     questionnaireStore.reset()
//   }
//    next()
//    return
// })
</script>

<template>
  <div>
    <main>
      <button @click="goHome" class="light-button">
        <LucideArrowLeft :size="16" />
        Retour à l'accueil
      </button>
      <AttachmentQuestionnaireIntro @startSurvey="startSurvey" />
    </main>
  </div>
</template>

<style>
</style>