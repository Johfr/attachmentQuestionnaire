import { useAuthStore } from '~/stores/auth'
// import { useAttachmentQuestionnaireWizardStore } from '~/stores/attachmentQuestionnaireWizard'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on SSR: Firebase Auth is not available server-side.
  // The middleware will run again on the client after onAuthStateChanged resolves.
  // Without this guard, a direct load or Stripe return URL redirects authenticated
  // users to / because user is null during SSR.
  if (import.meta.server) return

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