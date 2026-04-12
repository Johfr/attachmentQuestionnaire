<script setup lang="ts">
import { useAttachmentQuestionnaireWizardStore } from '~/stores/attachmentQuestionnaireWizard'
import { useAuthStore } from '~/stores/auth'
import type { AuthFormPayload } from '~/types/User'

const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore()
const authStore = useAuthStore()
const user = computed(() => authStore.user)
const currentPartnerContext = computed(() => authStore.currentPartnerContext)
const authErrorMessage = ref<string | null>(null)
const accessBlockedMessage = ref<string | null>(null)
const isSubmitting = ref(false)

onMounted(async () => {
  if (!user.value) return
  await authStore.loadCurrentPartnerContext()
})

const buildCooldownMessage = (remainingDays: number) => {
  const unit = remainingDays > 1 ? 'jours' : 'jour'
  return `Encore ${remainingDays} ${unit} avant de pouvoir passer de nouveau le formulaire.`
}

const startSurvey = async (userData: { authPayload: AuthFormPayload | null, partnerName: string | null, partnerAge: number | null }) => {
  await authStore.initAuth()
  authErrorMessage.value = null
  accessBlockedMessage.value = null
  isSubmitting.value = true

  try {
    if (user.value) {
      await authStore.loadCurrentPartnerContext()
      const cooldown = authStore.getQuestionnaireCooldownStatus('attachment')
      if (cooldown.blocked) {
        accessBlockedMessage.value = buildCooldownMessage(cooldown.remainingDays)
        return
      }

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

    const cooldown = authStore.getQuestionnaireCooldownStatus('attachment')
    if (cooldown.blocked) {
      accessBlockedMessage.value = buildCooldownMessage(cooldown.remainingDays)
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

useSeoMeta({
  title: 'Test d\'attachement adulte gratuit | Anxieux, évitant ou sécure ?',
  description: 'Passe le test d\'attachement adulte en 8 à 15 minutes. Découvre ton profil (anxieux activé, évitant rigide, sécure, désorganisé) et reçois une analyse personnalisée de tes comportements face à la distance, la rupture et l\'abandon.',
  keywords: 'test attachement adulte gratuit, questionnaire attachement, suis-je anxieux ou évitant, profil attachement, anxieux activé, évitant rigide, peur de l\'abandon, rupture, anxiété relation, attachement désorganisé, attachement sécure',
  ogTitle: 'Test d\'attachement adulte gratuit | Anxieux, évitant ou sécure ?',
  ogDescription: 'Découvre ton profil d\'attachement en 8-15 min : anxieux, évitant, sécure ou désorganisé. Analyse personnalisée incluse.',
  ogUrl: 'https://relation-anxieux-evitant.web.app/attachment-questionnaire/introduction',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://relation-anxieux-evitant.web.app/attachment-questionnaire/introduction' }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Test de style d\'attachement adulte',
      url: 'https://relation-anxieux-evitant.web.app/attachment-questionnaire/introduction',
      description: 'Test gratuit pour découvrir ton style d\'attachement : anxieux, évitant, sécure ou désorganisé.',
      inLanguage: 'fr-FR',
      applicationCategory: 'LifestyleApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    }),
  }],
})
</script>

<template>
  <main>
    <button @click="goHome" class="mt-5 mb-6 flex items-center text-xs text-theme-text md:text-sm">
      <LucideArrowLeft :size="16" />
      Retour à l'accueil
    </button>
    <AttachmentQuestionnaireIntro
      :auth-error-message="authErrorMessage"
      :access-blocked-message="accessBlockedMessage"
      :is-submitting="isSubmitting"
      :initial-partner-name="currentPartnerContext?.firstName || null"
      :initial-partner-age="currentPartnerContext?.age ?? null"
      @startSurvey="startSurvey"
    />
  </main>
</template>

<style>
</style>
