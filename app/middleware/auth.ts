import { useAuthStore } from '~/stores/auth'
// import { useAttachmentQuestionnaireStore } from '~/stores/attachmentQuestionnaire'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const nuxtApp = useNuxtApp()
  const authStore = useAuthStore(nuxtApp.$pinia)
  // const questionnaireStore = useAttachmentQuestionnaireStore(nuxtApp.$pinia)

  await authStore.initAuth()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // authStore.redirectAfterLogin = to.fullPath
    authStore.openLoginModal()
    return navigateTo('/')
  }
})