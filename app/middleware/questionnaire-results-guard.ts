import { useAttachmentQuestionnaireWizardStore } from '~/stores/attachmentQuestionnaireWizard'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on SSR: wizard state is not available server-side (client-only Pinia store).
  // On direct load of /attachment-questionnaire/results, the guard runs client-side
  // after hydration, where wizardStore state is correct.
  if (import.meta.server) return

  const nuxtApp = useNuxtApp()
  const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore(nuxtApp.$pinia)

  if (!questionnaireWizardStore.isCompleted || !questionnaireWizardStore.result) {
    return navigateTo('/')
  }
})