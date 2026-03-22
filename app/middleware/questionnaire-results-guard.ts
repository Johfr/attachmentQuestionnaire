import { useAttachmentQuestionnaireStore } from '~/stores/attachmentQuestionnaire'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const nuxtApp = useNuxtApp()
  const questionnaireStore = useAttachmentQuestionnaireStore(nuxtApp.$pinia)

  if (!questionnaireStore.isCompleted || !questionnaireStore.result) {
    return navigateTo('/')
  }
})