<script setup lang="ts">
import { useAttachmentQuestionnaireWizardStore } from '~/stores/attachmentQuestionnaireWizard'
import { useAuthStore } from '~/stores/auth'
import type { AuthFormPayload } from '~/types/User'

const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore()
const authStore = useAuthStore()
const user = computed(() => authStore.user)
const currentPartnerContext = computed(() => authStore.currentPartnerContext)
const authErrorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

onMounted(async () => {
  if (!user.value) return
  await authStore.loadCurrentPartnerContext()
})

const startSurvey = async (userData: { authPayload: AuthFormPayload | null, partnerName: string | null, partnerAge: number | null }) => {
  authErrorMessage.value = null
  isSubmitting.value = true

  try {
    if (user.value) {
      await authStore.savePartnerContext({
        partnerName: userData.partnerName,
        partnerAge: userData.partnerAge,
      })

      questionnaireWizardStore.start()
      await navigateTo('/attachment-questionnaire/questionnaire')
      return
    }

    if (!userData.authPayload) return

    const result = await authStore.authenticateForQuestionnaire(userData.authPayload, {
      partnerName: userData.partnerName,
      partnerAge: userData.partnerAge,
    })

    if (!result.success) {
      authErrorMessage.value = result.errorMessage || 'Impossible de continuer pour le moment.'
      return
    }

    questionnaireWizardStore.start()
    await navigateTo('/attachment-questionnaire/questionnaire')
  } finally {
    isSubmitting.value = false
  }
}

const resetStore = () => {
  questionnaireWizardStore.reset()
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
    <AttachmentQuestionnaireIntro
      :auth-error-message="authErrorMessage"
      :is-submitting="isSubmitting"
      :initial-partner-name="currentPartnerContext?.firstName || null"
      :initial-partner-age="currentPartnerContext?.age ?? null"
      @startSurvey="startSurvey"
    />
  </main>
</template>

<style>
</style>