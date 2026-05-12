<script setup lang="ts">
import type { User } from 'firebase/auth'
import { firebaseClient } from "~/composables/firebase/useFirebaseClient.js"
import Popin from '~/components/designSystem/Popin.vue'
import UserProgress from '~/components/designSystem/UserProgress.vue'
import { useAuthStore } from '~/stores/auth'
import { useBillingStore } from '~/stores/billing'
import { useContactRequestsStore } from '~/stores/contactRequests'
import { useQuestionnaireSessionsStore } from '~/stores/questionnaireSessions'
import { useSiteConfigStore } from '~/stores/siteConfig'
import type { QuestionnaireSession } from '~/types/questionnaireSessions'
import { getProfileLabel } from '~/utils/attachmentProfileTranslations'
import { PROFILE_SESSIONS_REFRESH_FLAG } from '~/constants/profileRefresh'

definePageMeta({
  middleware: ["auth"],
  requiresAuth: true
})

useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const authStore = useAuthStore()
const billingStore = useBillingStore()
const contactRequestsStore = useContactRequestsStore()
const sessionsStore = useQuestionnaireSessionsStore()
const siteConfigStore = useSiteConfigStore()
const { isDarkMode, initThemeMode, toggleThemeMode } = useThemeMode()
const isLoggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.user)
const isSubmitting = ref(false)
const portalError = ref<string | null>(null)
const isPortalLoading = ref(false)
const dashboardLoadError = ref<string | null>(null)
const incomingPartnerShareRequests = ref<Array<{
  sourceSessionId: string
  senderUid: string
  senderName: string
  senderEmail: string
  requestedAt: unknown
  sourceCompletedAt: unknown
  sourceGlobalProfile: string | null
  sourceAnxietyScore: number | null
  sourceAvoidanceScore: number | null
}>>([])
const isIncomingPartnerSharesLoading = ref(false)
const incomingPartnerShareError = ref<string | null>(null)
const selectedIncomingPartnerShareTargetSessions = ref<Record<string, string>>({})
const isPartnerSharePopinOpen = ref(false)
const isPartnerSharePaywallPopinOpen = ref(false)
const shareSessionId = ref<string | null>(null)
const partnerShareEmail = ref('')
const partnerShareError = ref<string | null>(null)
const isSendingPartnerShare = ref(false)
const partnerSharePaywallSessionId = ref<string | null>(null)
const partnerSharePaywallError = ref<string | null>(null)
const isPartnerShareCheckoutLoading = ref(false)
const checkingPartnerShareAccessSessionId = ref<string | null>(null)
const partnerShareFeedbackState = ref<'idle' | 'sending' | 'success'>('idle')
const validatingPartnerShareSessionId = ref<string | null>(null)

const PARTNER_SHARE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : ''

const consumeProfileSessionsRefreshFlag = () => {
  if (!import.meta.client) return false

  const shouldRefresh = window.sessionStorage.getItem(PROFILE_SESSIONS_REFRESH_FLAG) === '1'
  if (shouldRefresh) {
    window.sessionStorage.removeItem(PROFILE_SESSIONS_REFRESH_FLAG)
  }

  return shouldRefresh
}

const historySessions = computed(() => {
  return sessionsStore.sortedSessions.filter(session => session.status === 'completed')
})

const isResultsSharingEnabled = computed(() => siteConfigStore.isResultsSharingEnabled)
const isResultsPaywallEnabled = computed(() => siteConfigStore.isResultsPaywallEnabled)

const normalizedPartnerShareEmail = computed(() => partnerShareEmail.value.trim().toLowerCase())
const isPartnerShareEmailValid = computed(() => PARTNER_SHARE_EMAIL_PATTERN.test(normalizedPartnerShareEmail.value))
const isPartnerShareOverlayVisible = computed(() => partnerShareFeedbackState.value !== 'idle')
const PARTNER_SHARE_SUCCESS_MESSAGE = 'Message envoyé !'
const partnerShareOverlayTitle = computed(() => {
  return partnerShareFeedbackState.value === 'sending'
    ? 'Envoi en cours...'
    : PARTNER_SHARE_SUCCESS_MESSAGE
})
const partnerShareOverlayMessage = computed(() => {
  return partnerShareFeedbackState.value === 'sending'
    ?'La demande de partage est en cours d’enregistrement.'
    : 'L\'envoi du message est en cours. Tu seras notifié par mail dès réception.'
})

const resolveDate = (value: unknown): Date | null => {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number') {
    const date = new Date(value > 10_000_000_000 ? value : value * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value !== 'object') return null

  const candidate = value as {
    toDate?: () => Date
    toMillis?: () => number
    seconds?: number
    _seconds?: number
  }

  if (typeof candidate.toDate === 'function') {
    const date = candidate.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof candidate.toMillis === 'function') {
    const date = new Date(candidate.toMillis())
    return Number.isNaN(date.getTime()) ? null : date
  }

  const seconds = typeof candidate.seconds === 'number'
    ? candidate.seconds
    : typeof candidate._seconds === 'number'
      ? candidate._seconds
      : null

  if (seconds !== null) {
    const date = new Date(seconds * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

const formatDateValue = (value: unknown) => {
  return resolveDate(value)?.toLocaleDateString('fr-FR') || 'Date indisponible'
}

const formatSessionDate = (session: QuestionnaireSession) => {
  return formatDateValue(session.completedAt)
}

const accessTypeLabels: Record<string, string> = {
  ebook: 'Ebook',
  results: 'Résultats détaillés',
  ia: 'Analyse IA personnalisée',
  coachingZen: 'Rdv coaching zen',
  coachingExpress: 'Rdv coaching express',
  membership: 'Premium mensuel',
  formation: 'Formation annuelle',
}

const entitySubTypeLabels: Record<string, string> = {
  ebook: 'Ebook',
  attachment: 'Attachement adulte',
  conscience: 'Niveau de conscience',
  compatibility: 'Compatibilité',
}

const subscriptionStatusLabels: Record<string, string> = {
  active: 'Actif',
  trialing: 'Essai gratuit',
  canceled: 'Annulé',
  past_due: 'Impayé',
  unpaid: 'Impayé',
  incomplete: 'Incomplet',
  incomplete_expired: 'Expiré',
}

const formatTimestamp = (value: unknown): string => {
  if (!value) return ''
  return formatDateValue(value)
}

const formatAmount = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'eur' }).format(amount / 100)
}

const SUBSCRIPTION_ACCESS_TYPES = new Set(['membership', 'formation'])

const activeSubscriptionTags = computed(() => {
  return billingStore.subscriptions
    .filter(s => (s.status === 'active' || s.status === 'trialing') && SUBSCRIPTION_ACCESS_TYPES.has(s.metadata.accessType || ''))
    .map(s => s.metadata.accessType as string)
    .filter((v, i, a) => a.indexOf(v) === i)
})

const ONE_SHOT_ACCESS_TYPES = new Set(['results', 'ia'])
const COACHING_ACCESS_TYPES = new Set(['coachingZen', 'coachingExpress'])
const EBOOK_DOWNLOAD_URL = '/downloads/ebook-anxieux-evitant-v1.pdf'

const oneShotPayments = computed(() => {
  return billingStore.payments.filter(p => ONE_SHOT_ACCESS_TYPES.has(p.metadata.accessType || ''))
})

const coachingPayments = computed(() => {
  return billingStore.payments.filter(p => COACHING_ACCESS_TYPES.has(p.metadata.accessType || ''))
})

const ebookPayments = computed(() => {
  return billingStore.payments.filter(p => p.metadata.accessType === 'ebook')
})

const handleOpenPortal = async () => {
  portalError.value = null
  isPortalLoading.value = true
  try {
    await billingStore.openCustomerPortal()
  } catch (e) {
    portalError.value = e instanceof Error ? e.message : 'Impossible d\'ouvrir le portail de gestion.'
  } finally {
    isPortalLoading.value = false
  }
}

const waitForAuthenticatedUser = async () => {
  if (firebaseClient.auth.currentUser) {
    return firebaseClient.auth.currentUser
  }

  if (typeof firebaseClient.auth.authStateReady === 'function') {
    try {
      await firebaseClient.auth.authStateReady()
    } catch {
      // no-op
    }
  }

  if (firebaseClient.auth.currentUser) {
    return firebaseClient.auth.currentUser
  }

  return await new Promise<User | null>((resolve) => {
    let settled = false

    const finalize = (value: User | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const unsubscribe = firebaseClient.onAuthStateChanged(
      firebaseClient.auth,
      currentUser => {
        unsubscribe()
        finalize(currentUser)
      },
      () => {
        unsubscribe()
        finalize(firebaseClient.auth.currentUser)
      },
    )

    window.setTimeout(() => {
      unsubscribe()
      finalize(firebaseClient.auth.currentUser)
    }, 1500)
  })
}

const getAuthToken = async () => {
  const currentUser = await waitForAuthenticatedUser()
  if (!currentUser) {
    return null
  }

  try {
    return await currentUser.getIdToken()
  } catch {
    return null
  }
}

async function loadIncomingPartnerShareRequests() {
  if (!isResultsSharingEnabled.value) {
    incomingPartnerShareRequests.value = []
    incomingPartnerShareError.value = null
    isIncomingPartnerSharesLoading.value = false
    return []
  }

  isIncomingPartnerSharesLoading.value = true
  incomingPartnerShareError.value = null

  try {
    const token = await getAuthToken()
    if (!token) {
      incomingPartnerShareError.value = 'Impossible de vérifier ton compte pour le moment.'
    return incomingPartnerShareRequests.value
    }

    const requests = await $fetch<typeof incomingPartnerShareRequests.value>('/api/attachment/partner-share/pending', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    incomingPartnerShareRequests.value = requests
    selectedIncomingPartnerShareTargetSessions.value = requests.reduce<Record<string, string>>((acc, request) => {
      acc[request.sourceSessionId] = selectedIncomingPartnerShareTargetSessions.value[request.sourceSessionId] || ''
      return acc
    }, {})
    return requests
  } catch (error) {
    incomingPartnerShareError.value = error instanceof Error
      ? error.message
      : 'Les demandes de partage sont temporairement indisponibles.'
    return incomingPartnerShareRequests.value
  } finally {
    isIncomingPartnerSharesLoading.value = false
  }
}

const resetPartnerShareForm = () => {
  shareSessionId.value = null
  partnerShareEmail.value = ''
  partnerShareError.value = null
  isSendingPartnerShare.value = false
}

watch(isPartnerSharePopinOpen, isOpen => {
  if (!isOpen) {
    resetPartnerShareForm()
  }
})

const resetPartnerSharePaywall = () => {
  partnerSharePaywallSessionId.value = null
  partnerSharePaywallError.value = null
  isPartnerShareCheckoutLoading.value = false
}

watch(isPartnerSharePaywallPopinOpen, isOpen => {
  if (!isOpen) {
    resetPartnerSharePaywall()
  }
})

const hasPartnerShareAccess = (session: QuestionnaireSession) => {
  const billingInfo = session.billingInfo || {}

  return Boolean(
    billingInfo.hasPaidResults
    || billingInfo.hasPaidIa
    || billingInfo.hasPaidMembership
    || billingInfo.hasPaidFormation,
  )
}

const openPartnerShareFormPopin = (session: QuestionnaireSession) => {
  shareSessionId.value = session.id
  partnerShareEmail.value = session.relationContext?.partnerEmail || ''
  partnerShareError.value = null
  isPartnerSharePopinOpen.value = true
}

const openPartnerSharePaywallPopin = (session: QuestionnaireSession) => {
  partnerSharePaywallSessionId.value = session.id
  partnerSharePaywallError.value = null
  isPartnerSharePaywallPopinOpen.value = true
}

const openPartnerSharePopin = async (session: QuestionnaireSession) => {
  if (!isResultsSharingEnabled.value || checkingPartnerShareAccessSessionId.value) {
    return
  }

  checkingPartnerShareAccessSessionId.value = session.id
  partnerShareError.value = null
  partnerSharePaywallError.value = null

  try {
    if (isResultsPaywallEnabled.value && !hasPartnerShareAccess(session)) {
      openPartnerSharePaywallPopin(session)
      return
    }

    openPartnerShareFormPopin(session)
  } finally {
    checkingPartnerShareAccessSessionId.value = null
  }
}

const getPartnerDisplayName = (session: QuestionnaireSession) => {
  return session.relationContext?.partnerFirstName
    || session.relationContext?.partnerEmail
    || ''
}

const getPartnerInitial = (session: QuestionnaireSession) => {
  const userInitial = user.value?.name?.trim().charAt(0).toUpperCase() || ''
  const partnerDisplayName = getPartnerDisplayName(session).trim()

  if (!partnerDisplayName) {
    return ''
  }

  const partnerInitial = partnerDisplayName.charAt(0).toUpperCase()
  if (partnerInitial !== userInitial) {
    return partnerInitial
  }

  return partnerDisplayName.charAt(1).toUpperCase() || partnerInitial
}

const hasPendingPartnerShare = (session: QuestionnaireSession) => {
  return session.relationContext?.partnerShareStatus === 'invite_sent'
    || session.relationContext?.partnerShareStatus === 'awaiting_validation'
}

const hasLinkedPartnerResult = (session: QuestionnaireSession) => {
  return session.relationContext?.partnerShareStatus === 'linked'
    && typeof session.relationContext?.partnerAnxietyScore === 'number'
    && typeof session.relationContext?.partnerAvoidanceScore === 'number'
}

const getAvailableSessionsForIncomingRequest = () => {
  return historySessions.value.filter((session) => {
    if (session.questionnaireType !== 'attachment' || session.status !== 'completed') {
      return false
    }

    const relationContext = session.relationContext || {}
    return relationContext.partnerShareStatus !== 'linked'
  })
}

const getSelectedIncomingTargetSessionId = (sourceSessionId: string) => {
  const explicitTargetSessionId = selectedIncomingPartnerShareTargetSessions.value[sourceSessionId]
  return explicitTargetSessionId || ''
}

const formatIncomingRequestTargetSessionLabel = (session: QuestionnaireSession) => {
  const parts = [
    formatSessionDate(session),
    getProfileLabel(session.result.globalProfile),
    `Évitement ${session.result.avoidanceScore}%`,
    `Anxiété ${session.result.anxietyScore}%`,
  ]

  if (hasPendingPartnerShare(session)) {
    parts.push('en cours de partage...')
  }

  return parts.join(' • ')
}
const handlePartnerShareCheckout = async () => {
  if (!partnerSharePaywallSessionId.value || isPartnerShareCheckoutLoading.value) {
    return
  }

  isPartnerShareCheckoutLoading.value = true
  partnerSharePaywallError.value = null

  try {
    await billingStore.goToCheckout(
      'questionnaire',
      'attachment',
      'results',
      'v1',
      'profil?results-historic=1',
      partnerSharePaywallSessionId.value,
    )
  } catch (error: any) {
    partnerSharePaywallError.value = error?.message || 'Impossible d’ouvrir la page de paiement pour le moment.'
  } finally {
    isPartnerShareCheckoutLoading.value = false
  }
}

const handleSendPartnerShare = async () => {
  if (!isResultsSharingEnabled.value || !shareSessionId.value || !isPartnerShareEmailValid.value || isSendingPartnerShare.value) {
    return
  }

  const token = await getAuthToken()
  if (!token) {
    partnerShareError.value = 'Impossible de vérifier ton compte pour le moment.'
    return
  }

  isSendingPartnerShare.value = true
  partnerShareError.value = null

  try {
    partnerShareFeedbackState.value = 'sending'

    await $fetch('/api/attachment/partner-share', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: {
        sessionId: shareSessionId.value,
        partnerEmail: normalizedPartnerShareEmail.value,
      },
    })

    isPartnerSharePopinOpen.value = false
    await Promise.all([
      sessionsStore.loadSessions(true),
      loadIncomingPartnerShareRequests(),
    ])
    partnerShareFeedbackState.value = 'success'
    resetPartnerShareForm()
  } catch (error: any) {
    partnerShareFeedbackState.value = 'idle'
    partnerShareError.value = error?.data?.statusMessage
      || error?.statusMessage
      || error?.message
      || 'Impossible d’enregistrer la demande pour le moment.'
  } finally {
    isSendingPartnerShare.value = false
  }
}

const closePartnerShareOverlay = () => {
  if (partnerShareFeedbackState.value === 'sending') {
    return
  }

  partnerShareFeedbackState.value = 'idle'
}

const handleValidatePartnerShare = async (sourceSessionId: string) => {
  if (!isResultsSharingEnabled.value) {
    incomingPartnerShareError.value = 'Impossible de vérifier ton compte pour le moment.'
    return
  }

  const token = await getAuthToken()
  if (!token || validatingPartnerShareSessionId.value) {
    return
  }

  const targetSessionId = getSelectedIncomingTargetSessionId(sourceSessionId)

  if (!targetSessionId) {
    incomingPartnerShareError.value = 'Impossible de vérifier ton compte pour le moment.'
    return
  }

  validatingPartnerShareSessionId.value = sourceSessionId
  incomingPartnerShareError.value = null
  try {
    await $fetch('/api/attachment/partner-share/validate', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: {
        sourceSessionId,
        ...(targetSessionId ? { targetSessionId } : {}),
      },
    })

    await sessionsStore.loadSessions(true)
    await loadIncomingPartnerShareRequests()
    delete selectedIncomingPartnerShareTargetSessions.value[sourceSessionId]
  } catch (error: any) {
    incomingPartnerShareError.value = error?.data?.statusMessage
      || error?.statusMessage
      || error?.message
      || 'Impossible de valider cette demande pour le moment.'
  } finally {
    validatingPartnerShareSessionId.value = null
  }
}

const handleAuthAction = async () => {
  if (isSubmitting.value) return

  if (!isLoggedIn.value) {
    authStore.openLoginModal()
    return
  }

  isSubmitting.value = true
  try {
    const result = await authStore.logout()
    if (result.success) {
      await navigateTo('/')
    }
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  initThemeMode()
})

watch(
  () => authStore.isLoggedIn,
  async (loggedIn) => {
    if (loggedIn) {
      dashboardLoadError.value = null
      const shouldForceSessionsReload = consumeProfileSessionsRefreshFlag()
      await siteConfigStore.loadConfig(shouldForceSessionsReload)
      const results = await Promise.allSettled([
        sessionsStore.loadSessions(shouldForceSessionsReload),
        billingStore.loadPurchaseHistory(),
        contactRequestsStore.loadRequests(),
        loadIncomingPartnerShareRequests(),
      ])

      const hasDashboardFailure = results[0]?.status === 'rejected'

      if (hasDashboardFailure) {
        dashboardLoadError.value = 'Certaines données de ton espace perso sont temporairement indisponibles.'
      }
      return
    }

    dashboardLoadError.value = null
    sessionsStore.reset()
    contactRequestsStore.reset()
    incomingPartnerShareRequests.value = []
    incomingPartnerShareError.value = null
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <!-- <h2>Réussis ta relation ou mets y fin de façon saine</h2>
    <p>Réduis ta panique et/ou ta fuite en adoptant des comportements sains et protecteurs.</p> -->
    
    <!-- <DesignSystemPageSectionHeading :isHeading="true" title="Mon profil" sectionSpacing="mt-8 mb-12" /> -->

    <div class="md:flex justify-between">
      <DesignSystemPageSectionHeading :asTag="true" :isHeading="true" title="Bienvenue," :highlight="authStore?.user?.name" />
    </div>

    <!-- userInfos  -->
    <section class="">
      <h2 class="text-xl font-bold my-8">
        Informations personnelles
      </h2>

      <p v-if="dashboardLoadError" class="mb-4 text-xs text-amber-700">
        {{ dashboardLoadError }}
      </p>

      <div class="flex items-end flex-wrap gap-3">
        <!-- user -->
        <div class="flex flex-col items-center">
          <p class="font-bold">
            {{ user?.name }}, {{ user?.age }} ans
          </p>

          <span
            v-for="tag in activeSubscriptionTags"
            :key="tag"
            class="rounded-full bg-theme-successBadgeBg px-3 py-1 text-xs font-semibold text-theme-successBadgeText"
          >
            {{ accessTypeLabels[tag] || tag }}
          </span>
        </div>

        <!-- logout -->
        <button
          type="button"
          class="flex items-center justify-center gap-2 py-2 px-4 text-xs bg-theme-button text-theme-buttonText  disabled:opacity-60 rounded-3xl"
          title="Se déconnecter"
          :disabled="isSubmitting"
          @click="handleAuthAction"
        >
          <span>Déconnexion</span>
          <LucidePowerOff v-if="isLoggedIn" :size="18" />
          <LucidePower v-else :size="18" />
        </button>

        <!-- swith theme color -->
        <button
          type="button"
          class="flex items-center justify-center gap-2 py-2 px-4 text-xs disabled:opacity-60 rounded-3xl md:hidden"
          :class="isDarkMode ? 'bg-theme-buttonText text-theme-button' : 'bg-theme-button text-theme-buttonText'"
          title="Changer le mode"
          @click="toggleThemeMode"
        >
          <LucideSun v-if="isDarkMode" :size="18" />
          <LucideMoon v-else :size="18" />
          <span>Theme</span>
        </button>
      </div>

      <DesignSystemUserProgress />
    </section>

    <section v-if="isResultsSharingEnabled" class="md:max-w-[60%]">
      <h2 class="text-xl font-bold my-8">
        Demandes de partage reçues
      </h2>

      <p v-if="isIncomingPartnerSharesLoading" class="text-sm text-theme-muted">
        Chargement des demandes...
      </p>
      <p v-else-if="incomingPartnerShareRequests.length === 0" class="text-sm text-theme-muted">
        Tu n'as aucune demande de partage en attente.
      </p>
      <p v-if="incomingPartnerShareError" class="mt-3 text-sm text-amber-700">
        {{ incomingPartnerShareError }}
      </p>

      <div v-if="incomingPartnerShareRequests.length > 0" class="space-y-3">
        <div
          v-for="request in incomingPartnerShareRequests"
          :key="request.sourceSessionId"
          class="rounded-2xl border border-red-300 bg-theme-surfaceStaticCard p-4"
        >
          <p
            v-if="getAvailableSessionsForIncomingRequest().length === 0"
            class="mb-4 text-sm text-theme-muted"
          >
            Aucune de tes sessions disponibles ne peut être liée à cette demande.
          </p>

          <label class="mb-4 flex flex-col text-sm text-theme-text">
            <!-- <span class="font-semibold">Session à relier à cette demande</span> -->
            <span class="mt-1 text-xs text-theme-muted">
              Choisis laquelle de tes sessions tu veux associer à cette demande de partage.
            </span>
            <div class="relative mt-2">
              <select
                v-model="selectedIncomingPartnerShareTargetSessions[request.sourceSessionId]"
                class="theme-select rounded-2xl border border-solid border-theme-formInputBorder bg-theme-surfaceFormInput px-4 py-3 pr-14 text-sm"
                :class="getSelectedIncomingTargetSessionId(request.sourceSessionId) ? 'text-theme-text' : 'text-theme-muted'"
              >
                <option value="" >Sélectionne la session à lier</option>
                <option
                  v-for="session in getAvailableSessionsForIncomingRequest()"
                  :key="session.id"
                  :value="session.id"
                >
                  {{ formatIncomingRequestTargetSessionLabel(session) }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl">
                <LucideChevronDown :size="18" class="theme-select-icon" />
              </div>
            </div>
          </label>

          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="font-bold text-theme-text">
                {{ request.senderName }} souhaite partager ses résultats
              </p>
              <p class="mt-1 text-sm text-theme-muted">
                Demande reçue le {{ formatTimestamp(request.requestedAt) || 'Date indisponible' }}
              </p>
              <!-- <p class="mt-1 text-sm text-theme-muted">
                {{ getProfileLabel(request.sourceGlobalProfile || 'mixedProfile') }} • Évitement {{ request.sourceAvoidanceScore ?'--' }}% • Anxiété {{ request.sourceAnxietyScore ?'--' }}%
              </p> -->
            </div>

            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-3xl bg-theme-button px-5 py-3 text-sm font-semibold text-theme-buttonText transition-all hover:opacity-90 disabled:opacity-60"
              :disabled="validatingPartnerShareSessionId === request.sourceSessionId || getAvailableSessionsForIncomingRequest().length === 0 || !getSelectedIncomingTargetSessionId(request.sourceSessionId)"
              @click="handleValidatePartnerShare(request.sourceSessionId)"
            >
              <LucideLoader v-if="validatingPartnerShareSessionId === request.sourceSessionId" :size="16" class="animate-spin" />
              <LucideCheckCheck v-else :size="16" />
              <span>Valider la demande</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Historique des résultats aux questionnaires -->
    <section class="md:max-w-[60%]">
      <h2 class="text-xl font-bold my-8">
        Historique de mes résultats
      </h2>

      <p v-if="sessionsStore.isLoading" class="text-sm text-theme-muted">Chargement de ton historique...</p>
      <p v-else-if="historySessions.length === 0" class="text-sm text-theme-muted">
        Tu n'as encore aucun résultat enregistré.
      </p>
      
      <div v-else class="space-y-3">
        <div
          v-for="session in historySessions"
          :key="session.id"
          class="md:flex md:items-center md:justify-start md:gap-2"
        >
          <!-- results du user -->
          <RouterLink
            :to="`/user/attachment-questionnaire/results?sessionId=${session.id}`"
            class="flex justify-between items-center gap-4 md:max-w-[50%] rounded-2xl border border-transparent bg-theme-surfaceLinkCard p-4 transition-colors hover:border-theme-button md:items-end"
          >
            <div class="">
              <!-- Initial du user + partner -->
              <p class="flex my-2 text-xs uppercase text-theme-muted">
                <span class="flex justify-center items-center w-6 h-6 p-2 rounded-full bg-primary" :title="user?.name">
                  {{ user?.name?.split('')[0] }}
                </span>
                <span
                  v-if="!hasLinkedPartnerResult(session) && getPartnerInitial(session)"
                  class="flex justify-center items-center w-6 h-6 -ml-1 p-2 rounded-full bg-secondary"
                  :title="getPartnerDisplayName(session) || undefined"
                >
                  {{ getPartnerInitial(session) }}
                </span>
              </p>

              <!-- Profil global -->
              <p class="mt-1 font-bold text-theme-text">{{ getProfileLabel(session.result.globalProfile) }}</p>
              
              <!-- Type de questionnaire -->
              <p class="my-1 text-sm text-theme-muted">
                {{ entitySubTypeLabels[session.questionnaireType] || session.questionnaireType }} • {{ formatSessionDate(session) }}
              </p>
            </div>

            <!-- Scores d'évitement et d'anxiété -->
            <div class="flex flex-col items-center gap-2 text-xs uppercase text-theme-muted md:flex-row md:justify-start">
              <p class="flex flex-col items-center">
                <span>
                  Avoidance
                </span>
                <span class="font-bold text-blue-500">
                  {{ session.result.avoidanceScore }}%
                </span>
              </p>
              <p class="flex flex-col items-center">
                <span>
                  Anxiety
                </span>
                <span class="font-bold text-red-500">
                  {{ session.result.anxietyScore }}% 
                </span>
              </p>
            </div>
          </RouterLink>
          
          <LucideSendToBack
            v-if="isResultsSharingEnabled"
            :size="16"
            class="my-2 w-full text-center text-theme-muted md:my-0 md:w-auto"
          />

          <!-- results du partenaire -->
          <div
            v-if="hasLinkedPartnerResult(session)"
            class="flex justify-between items-center gap-4 md:max-w-[50%] rounded-2xl border border-transparent bg-theme-surfaceStaticCard p-4 transition-colors hover:border-theme-button md:items-end"
          >
            <div>
              <p class="flex my-2 text-xs uppercase text-theme-muted">
                <span
                  v-if="getPartnerInitial(session)"
                  class="flex justify-center items-center w-6 h-6 p-2 rounded-full bg-secondary"
                  :title="getPartnerDisplayName(session) || undefined"
                >
                  {{ getPartnerInitial(session) }}
                </span>
              </p>
              <p class="font-bold text-theme-text">
                Résultat partenaire
              </p>
              <p class="mt-1 text-sm text-theme-muted">
                {{ getProfileLabel(session.relationContext.partnerGlobalStyle || 'mixedProfile') }}
              </p>
              <p class="mt-1 text-xs text-theme-muted">
                {{ formatTimestamp(session.relationContext.partnerCompletedAt) || 'Date indisponible' }}
              </p>
            </div>
            
            <!-- Scores d'évitement et d'anxiété -->
            <div class="flex flex-col items-center gap-2 text-xs uppercase text-theme-muted md:flex-row md:justify-start">
            <!-- <div class="mt-3 flex gap-4 text-xs uppercase text-theme-muted"> -->
              <p class="flex flex-col">
                <span>Avoidance</span>
                <span class="font-bold text-blue-500">{{ session.relationContext.partnerAvoidanceScore }}%</span>
              </p>
              <p class="flex flex-col">
                <span>Anxiety</span>
                <span class="font-bold text-red-500">{{ session.relationContext.partnerAnxietyScore }}%</span>
              </p>
            </div>
          </div>

          <p v-else-if="hasPendingPartnerShare(session)" class="text-xs text-theme-muted">
            Demande envoyée le {{ formatTimestamp(session.relationContext.partnerInviteSentAt) || 'Date indisponible' }}
          </p>

            <button
              v-else-if="isResultsSharingEnabled"
              type="button"
              class="flex items-center gap-2 mx-auto md:mx-0 rounded-3xl bg-theme-button px-5 py-3 text-xs font-semibold text-theme-buttonText transition-all hover:opacity-90 disabled:opacity-60"
              :disabled="checkingPartnerShareAccessSessionId === session.id"
              @click="openPartnerSharePopin(session)"
          >
            <LucideLoader v-if="checkingPartnerShareAccessSessionId === session.id" :size="16" class="animate-spin" />
            <LucideShare2 v-else :size="16" class="inline-block" />
            <span v-if="checkingPartnerShareAccessSessionId === session.id">Vérification...</span>
            <span v-else>
              Invite
              {{ user?.gender === 'female' ? 'ton partenaire' : 'ta partenaire' }}
            </span>
          </button>
        </div>
      </div>
    </section>
    <!-- Mes Rdv -->
    <section class="md:max-w-[48%]">
      <h2 class="text-xl font-bold my-8">
        Mes rdvs
      </h2>

      <p v-if="billingStore.isLoadingHistory" class="text-sm text-theme-muted">Chargement...</p>
      <p v-else-if="coachingPayments.length === 0" class="text-sm text-theme-muted">
        Tu n'as encore aucun rendez-vous réservé.
      </p>

      <div class="mb-3">
        <RouterLink
          to="/contact"
          class="inline-flex items-center gap-2 rounded-3xl bg-theme-button px-5 py-3 text-sm font-semibold text-theme-buttonText transition-all hover:opacity-90"
        >
          <LucideCalendar1 :size="20" class="mb-1 md:mr-1" />
          Prendre rdv
        </RouterLink>
      </div>

      <div v-if="coachingPayments.length > 0" class="space-y-3">
        <div
          v-for="payment in coachingPayments"
          :key="payment.id"
          class="rounded-2xl bg-theme-surfaceStaticCard p-4"
        >
          <div class="flex items-center justify-between">
            <p class="font-bold text-theme-text">
              {{ accessTypeLabels[payment.metadata.accessType || ''] || payment.metadata.accessType || 'Rdv coaching' }}
            </p>
            <span class="text-sm font-semibold text-theme-text">
              {{ formatAmount(payment.amount, payment.currency) }}
            </span>
          </div>
          <p class="mt-1 text-xs text-theme-muted">
            <span v-if="formatTimestamp(payment.created)">
              Réservé le : {{ formatTimestamp(payment.created) }}
            </span>
          </p>
        </div>
      </div>
      
    </section>
    <!-- Mes prises de contact -->
    <section class="md:max-w-[48%]">
      <h2 class="text-xl font-bold my-8">
        Mes prises de contact
      </h2>

      <p v-if="contactRequestsStore.isLoading" class="text-sm text-theme-muted">Chargement...</p>
      <p v-else-if="contactRequestsStore.sortedRequests.length === 0" class="text-sm text-theme-muted">
        Tu n'as encore envoyé aucun message.
      </p>

      <div v-else class="space-y-3">
        <details
          v-for="request in contactRequestsStore.sortedRequests"
          :key="request.id"
          class="group rounded-2xl bg-theme-surfaceStaticCard p-4"
        >
          <summary class="cursor-pointer list-none">
            <div class="flex items-center justify-between gap-4">
              <p class="font-bold text-theme-text">
                Message envoyé
              </p>
              <div class="flex items-center gap-3 text-xs text-theme-muted">
                <span>
                  {{ formatTimestamp(request.createdAt) || 'Date indisponible' }}
                </span>
                <span class="flex items-center gap-1">
                  <span class="group-open:hidden">Déplier</span>
                  <span class="hidden group-open:inline">Replier</span>
                  <LucideChevronRight :size="16" class="transition-transform duration-300 group-open:rotate-90" />
                </span>
              </div>
            </div>
          </summary>

          <p class="mt-4 whitespace-pre-line text-sm text-theme-muted">
            {{ request.message }}
          </p>
        </details>
      </div>
    </section>

    <!-- Mes ebooks -->
    <section class="md:max-w-[48%]">
      <h2 class="text-xl font-bold my-8">
        Mes ebooks
      </h2>

      <p v-if="billingStore.isLoadingHistory" class="text-sm text-theme-muted">Chargement...</p>
      <p v-else-if="ebookPayments.length === 0" class="text-sm text-theme-muted">
        Tu n'as encore aucun ebook disponible.
      </p>

      <div v-else class="space-y-3">
        <div class="rounded-2xl bg-theme-surfaceStaticCard p-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-bold text-theme-text">
                Ebook : Tout comprendre sur la relation anxieux-evitant
              </p>
              <p class="text-xs text-theme-muted mt-1">
                T?l?chargement disponible depuis ton espace perso.
              </p>
            </div>

            <a
              :href="EBOOK_DOWNLOAD_URL"
              download
              class="inline-flex items-center gap-2 py-3 px-5 text-sm font-semibold bg-theme-button text-theme-buttonText rounded-3xl hover:opacity-90 transition-all"
            >
              <LucideDownload :size="16" />
              T?l?charger
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Achats et abonnements -->
    <div class="md:flex md:justify-between md:gap-2">
      <!-- mon abonnement -->
      <section class="md:w-full">
        <h2 class="text-xl font-bold my-8">
          Gérer mon abonnement
        </h2>

        <p v-if="billingStore.isLoadingHistory" class="text-sm text-theme-muted">Chargement...</p>
        <p v-else-if="billingStore.subscriptions.length === 0" class="text-sm text-theme-muted">
          Tu n'as aucun abonnement pour le moment.
        </p>

        <div v-else class="space-y-3">
          <div>
            <div
              v-for="sub in billingStore.subscriptions"
              :key="sub.id"
              class="rounded-2xl bg-theme-surfaceStaticCard p-4"
            >
              <div class="flex items-center justify-between">
                <p class="font-bold text-theme-text">
                  {{ accessTypeLabels[sub.metadata.accessType || ''] || sub.metadata.accessType || 'Abonnement' }}
                </p>
                <span
                  class="rounded-full px-2 py-1 text-xs font-semibold"
                  :class="{
                    'bg-green-200 text-green-600': sub.status === 'active' || sub.status === 'trialing',
                    'bg-red-100 text-red-600': sub.status !== 'active' && sub.status !== 'trialing',
                  }"
                >
                  {{ subscriptionStatusLabels[sub.status] || sub.status }}
                </span>
              </div>
              <p v-if="sub.metadata.entitySubType" class="mt-1 text-xs text-theme-muted">
                {{ entitySubTypeLabels[sub.metadata.entitySubType] || sub.metadata.entitySubType }}
              </p>
              <p v-if="sub.cancel_at_period_end" class="mt-1 text-xs text-red-500">
                Annulation prévue à la fin de la période en cours
              </p>
              <p class="mt-1 text-xs text-theme-muted">
                <span v-if="formatTimestamp(sub.created)">Depuis le {{ formatTimestamp(sub.created) }}</span>
                <span v-if="formatTimestamp(sub.current_period_end)"> • Prochaine échéance : {{ formatTimestamp(sub.current_period_end) }}</span>
              </p>
            </div>

            <button
              type="button"
              class="mt-4 flex items-center gap-2 rounded-3xl bg-theme-button px-5 py-2 text-sm font-semibold text-theme-buttonText transition-all hover:opacity-90 disabled:opacity-60"
              :disabled="isPortalLoading"
              @click="handleOpenPortal"
            >
              <LucideLoader2 v-if="isPortalLoading" :size="16" class="animate-spin" />
              {{ isPortalLoading ?'Redirection...' : 'Gérer mon abonnement sur Stripe' }}
            </button>
            <p v-if="portalError" class="mt-2 text-xs text-red-500">{{ portalError }}</p>
          </div>
        </div>
      </section>

      <!-- Mes achats -->
      <section class="md:w-full">
        <h2 class="text-xl font-bold my-8">
          Mes achats
        </h2>

        <p v-if="billingStore.isLoadingHistory" class="text-sm text-theme-muted">Chargement...</p>
        <p v-else-if="oneShotPayments.length === 0" class="text-sm text-theme-muted">
          Tu n'as encore aucun achat.
        </p>

        <div v-else class="space-y-3">
          <div
            v-for="payment in oneShotPayments"
            :key="payment.id"
            class="rounded-2xl bg-theme-surfaceStaticCard p-4"
          >
            <div class="flex items-center justify-between">
              <p class="font-bold text-theme-text">
                {{ accessTypeLabels[payment.metadata.accessType || ''] || payment.metadata.accessType || 'Achat' }}
              </p>
              <span class="text-sm font-semibold text-theme-text">
                {{ formatAmount(payment.amount, payment.currency) }}
              </span>
            </div>
            <p v-if="payment.metadata.entitySubType" class="mt-1 text-xs text-theme-muted">
              <span class="capitalize">
                {{ payment.metadata.entityType }}
              </span>
              : {{ entitySubTypeLabels[payment.metadata.entitySubType] || payment.metadata.entitySubType }}
            </p>
            <p class="mt-1 text-xs text-theme-muted">
              <span v-if="formatTimestamp(payment.created)">
                Acheté le : {{ formatTimestamp(payment.created) }}
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
    <Popin v-model="isPartnerSharePaywallPopinOpen">
      <div class="text-theme-text">
        <h3 class="text-2xl font-bold">
          Débloque tes résultats
        </h3>
        <p class="mt-3 text-sm text-theme-muted">
          Tu dois d'abord débloquer tes résultats avant de pouvoir faire ta demande.
        </p>

        <p v-if="partnerSharePaywallError" class="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ partnerSharePaywallError }}
        </p>

        <button
          type="button"
          class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-theme-button px-4 py-4 text-sm font-semibold text-theme-buttonText disabled:opacity-60"
          :disabled="!partnerSharePaywallSessionId || isPartnerShareCheckoutLoading"
          @click="handlePartnerShareCheckout"
        >
          <span>{{ isPartnerShareCheckoutLoading ? 'Redirection...' : 'Débloquer mes résultats pour 1,99 €' }}</span>
          <LucideLoader v-if="isPartnerShareCheckoutLoading" :size="18" class="animate-spin" />
          <LucideExternalLink v-else :size="18" aria-hidden="true" />
        </button>
      </div>
    </Popin>

    <Popin v-model="isPartnerSharePopinOpen">
      <div class="text-theme-text">
        <h3 class="text-2xl font-bold">
          Partager le questionnaire
        </h3>
        <p class="mt-3 text-sm text-theme-muted">
          Invite
          {{ user?.gender === 'female' ? 'ton partenaire' : 'ta partenaire' }}
          à passer le questionnaire.
        </p>

        <label for="partner-share-email" class="mt-6 flex flex-col text-sm text-theme-text">
          Adresse email de ton/ta partenaire
          <input
            id="partner-share-email"
            v-model="partnerShareEmail"
            type="email"
            name="partner-share-email"
            autocomplete="email"
            placeholder="prenom@email.com"
            data-testid="partner-share-email-input"
            class="mt-2 rounded-2xl border border-solid border-theme-formInputBorder bg-theme-surfaceFormInput p-3 text-sm text-theme-text placeholder:text-theme-muted"
          />
        </label>

        <p v-if="partnerShareError" class="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ partnerShareError }}
        </p>

        <button
          type="button"
          data-testid="partner-share-submit"
          class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-theme-button px-4 py-4 text-sm font-semibold text-theme-buttonText disabled:opacity-60"
          :disabled="!isPartnerShareEmailValid || isSendingPartnerShare"
          @click="handleSendPartnerShare"
        >
          <LucideLoader v-if="isSendingPartnerShare" :size="18" class="animate-spin" />
          <span>{{ isSendingPartnerShare ? 'Envoi...' : 'Envoyer' }}</span>
        </button>
      </div>
    </Popin>

    <div
      v-if="isPartnerShareOverlayVisible"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-theme-modalOverlay px-4"
      @click="closePartnerShareOverlay"
    >
      <div class="relative w-full max-w-sm rounded-[2rem] bg-theme-modalBg px-6 py-10 text-center text-theme-modalText shadow-2xl" @click.stop>
        <button
          v-if="partnerShareFeedbackState === 'success'"
          type="button"
          class="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-theme-muted transition-colors hover:bg-theme-surfaceStaticCard hover:text-theme-text"
          aria-label="Fermer le message d'envoi"
          @click="closePartnerShareOverlay"
        >
          <LucideX :size="20" />
        </button>
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-theme-surfaceStaticCard">
          <LucideShare2
            v-if="partnerShareFeedbackState === 'sending'"
            :size="28"
            class="animate-bounce text-theme-button"
          />
          <LucideBadgeCheck
            v-else
            :size="28"
            class="text-theme-successBadgeText"
          />
        </div>
        <p class="mt-5 text-xl font-bold">
          {{ partnerShareOverlayTitle }}
        </p>
        <p class="mt-3 text-sm text-theme-muted">
          {{ partnerShareOverlayMessage }}
        </p>
      </div>
    </div>
  </div>  
</template>


