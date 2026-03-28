import { useAuthStore } from '~/stores/auth'
// import { useAttachmentQuestionnaireWizardStore } from '~/stores/attachmentQuestionnaireWizard'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const nuxtApp = useNuxtApp()
  const authStore = useAuthStore(nuxtApp.$pinia)
  // const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore(nuxtApp.$pinia)

  await authStore.initAuth()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // authStore.redirectAfterLogin = to.fullPath
    authStore.openLoginModal()
    return navigateTo('/')
  }
})