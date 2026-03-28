import { useAttachmentQuestionnaireWizardStore } from '~/stores/attachmentQuestionnaireWizard'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const nuxtApp = useNuxtApp()
  const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore(nuxtApp.$pinia)

  if (!questionnaireWizardStore.isCompleted || !questionnaireWizardStore.result) {
    return navigateTo('/')
  }
})