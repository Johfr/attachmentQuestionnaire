<script setup lang="ts">
import UserProgress from '~/components/designSystem/UserProgress.vue'
import { useAuthStore } from '~/stores/auth'
import { useBillingStore } from '~/stores/billing'
import { useQuestionnaireSessionsStore } from '~/stores/questionnaireSessions'
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
const sessionsStore = useQuestionnaireSessionsStore()
const { isDarkMode, initThemeMode, toggleThemeMode } = useThemeMode()
const isLoggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.user)
const isSubmitting = ref(false)
const portalError = ref<string | null>(null)
const isPortalLoading = ref(false)
const dashboardLoadError = ref<string | null>(null)

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

const formatSessionDate = (session: QuestionnaireSession) => {
  const completed = session.completedAt
  if (!completed || typeof completed !== 'object') {
    return 'Date indisponible'
  }

  const candidate = completed as { toDate?: () => Date; seconds?: number }
  if (typeof candidate.toDate === 'function') {
    return candidate.toDate().toLocaleDateString('fr-FR')
  }

  if (typeof candidate.seconds === 'number') {
    return new Date(candidate.seconds * 1000).toLocaleDateString('fr-FR')
  }

  return 'Date indisponible'
}

watch(
  () => authStore.isLoggedIn,
  async (loggedIn) => {
    if (loggedIn) {
      dashboardLoadError.value = null
      const shouldForceSessionsReload = consumeProfileSessionsRefreshFlag()
      try {
        await Promise.all([
          sessionsStore.loadSessions(shouldForceSessionsReload),
          billingStore.loadPurchaseHistory(),
        ])
      } catch {
        dashboardLoadError.value = 'Certaines donnees de ton espace perso sont temporairement indisponibles.'
      }
      return
    }

    dashboardLoadError.value = null
    sessionsStore.reset()
  },
  { immediate: true },
)

const accessTypeLabels: Record<string, string> = {
  ebook: 'Ebook',
  results: 'Résultats détaillés',
  ia: 'Analyse IA personnalisée',
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
  if (typeof value === 'number') return new Date(value * 1000).toLocaleDateString('fr-FR')
  if (typeof value !== 'object') return ''
  const candidate = value as { toDate?: () => Date; seconds?: number }
  if (typeof candidate.toDate === 'function') return candidate.toDate().toLocaleDateString('fr-FR')
  if (typeof candidate.seconds === 'number') return new Date(candidate.seconds * 1000).toLocaleDateString('fr-FR')
  return ''
}

const formatAmount = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'eur' }).format(amount / 100)
}

const SUBSCRIPTION_ACCESS_TYPES = new Set(['membership', 'formation'])

const activeSubscriptionTags = computed(() => {
  return billingStore.subscriptions
    .filter(s => (s.status === 'active' || s.status === 'trialing') && SUBSCRIPTION_ACCESS_TYPES.has(s.metadata.accessType ?? ''))
    .map(s => s.metadata.accessType as string)
    .filter((v, i, a) => a.indexOf(v) === i)
})

const ONE_SHOT_ACCESS_TYPES = new Set(['results', 'ia'])
const EBOOK_DOWNLOAD_URL = '/downloads/ebook-anxieux-evitant-v1.pdf'

const oneShotPayments = computed(() => {
  return billingStore.payments.filter(p => ONE_SHOT_ACCESS_TYPES.has(p.metadata.accessType ?? ''))
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
            {{ accessTypeLabels[tag] ?? tag }}
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

    <!-- Historique des résultats aux questionnaires -->
    <section class="md:max-w-[48%]">
      <h2 class="text-xl font-bold my-8">
        Historique de mes résultats
      </h2>

      <p v-if="sessionsStore.isLoading" class="text-sm text-gray-500">Chargement de ton historique...</p>
      <p v-else-if="historySessions.length === 0" class="text-sm text-gray-500">
        Tu n'as encore aucun résultat enregistré.
      </p>
      
      <div v-else class="space-y-3">
        <RouterLink
          v-for="session in historySessions"
          :key="session.id"
          :to="`/user/attachment-questionnaire/results?sessionId=${session.id}`"
          class="flex justify-between items-center gap-4 rounded-2xl border border-transparent bg-theme-surfaceLinkCard p-4 transition-colors hover:border-theme-button md:items-end"
        >
          <div class="">
            <!-- Initial du user + partner -->
            <p class="flex my-2 text-xs uppercase text-gray-400">
              <span class="flex justify-center items-center w-6 h-6 p-2 rounded-full bg-primary" :title="user?.name">
                {{ user?.name?.split('')[0] }}
              </span>
              <span class="flex justify-center items-center w-6 h-6 -ml-1 p-2 rounded-full bg-secondary" :title="session?.relationContext?.partnerFirstName ?? undefined">
                {{ session?.relationContext?.partnerFirstName?.split('')[0] }}
              </span>
            </p>

            <!-- Profil global -->
            <p class="font-bold text-gray-800 mt-1">{{ getProfileLabel(session.result.globalProfile) }}</p>
            
            <!-- Type de questionaire -->
            <p class=" my-1 text-sm text-gray-400">
              {{ entitySubTypeLabels[session.questionnaireType] ?? session.questionnaireType }} • {{ formatSessionDate(session) }}
            </p>
          </div>

          <!-- Scores d'évitement et d'anxiété -->
          <div class="flex flex-col items-center md:flex-row md:justify-start gap-2 text-xs uppercase text-gray-400">
            <p class="flex flex-col items-center">
              <span>
                Avoidance
              </span>
              <span class="text-blue-500 font-bold">
                {{ session.result.avoidanceScore }}%
              </span>
            </p>
            <p class="flex flex-col items-center">
              <span>
                Anxiety
              </span>
              <span class="text-red-500 font-bold">
                {{ session.result.anxietyScore }}% 
              </span>
            </p>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- Mes ebooks -->
    <section class="md:max-w-[48%]">
      <h2 class="text-xl font-bold my-8">
        Mes ebooks
      </h2>

      <p v-if="billingStore.isLoadingHistory" class="text-sm text-gray-500">Chargement...</p>
      <p v-else-if="ebookPayments.length === 0" class="text-sm text-gray-500">
        Tu n'as encore aucun ebook disponible.
      </p>

      <div v-else class="space-y-3">
        <div class="rounded-2xl bg-theme-surfaceStaticCard p-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-bold text-gray-800">
                Ebook : Tout comprendre sur la relation anxieux-evitant
              </p>
              <p class="text-xs text-gray-500 mt-1">
                Telechargement disponible depuis ton espace perso.
              </p>
            </div>

            <a
              :href="EBOOK_DOWNLOAD_URL"
              download
              class="inline-flex items-center gap-2 py-3 px-5 text-sm font-semibold bg-theme-button text-theme-buttonText rounded-3xl hover:opacity-90 transition-all"
            >
              <LucideDownload :size="16" />
              Telecharger
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

        <p v-if="billingStore.isLoadingHistory" class="text-sm text-gray-500">Chargement...</p>
        <p v-else-if="billingStore.subscriptions.length === 0" class="text-sm text-gray-500">
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
                <p class="font-bold text-gray-800">
                  {{ accessTypeLabels[sub.metadata.accessType ?? ''] ?? sub.metadata.accessType ?? 'Abonnement' }}
                </p>
                <span
                  class="text-xs font-semibold px-2 py-1 rounded-full"
                  :class="{
                    'bg-green-200 text-green-600': sub.status === 'active' || sub.status === 'trialing',
                    'bg-red-100 text-red-600': sub.status !== 'active' && sub.status !== 'trialing',
                  }"
                >
                  {{ subscriptionStatusLabels[sub.status] ?? sub.status }}
                </span>
              </div>
              <p v-if="sub.metadata.entitySubType" class="text-xs text-gray-500 mt-1">
                {{ entitySubTypeLabels[sub.metadata.entitySubType] ?? sub.metadata.entitySubType }}
              </p>
              <p v-if="sub.cancel_at_period_end" class="text-xs text-red-500 mt-1">
                Annulation prévue à la fin de la période en cours
              </p>
              <p class="text-xs text-gray-400 mt-1">
                <span v-if="formatTimestamp(sub.created)">Depuis le {{ formatTimestamp(sub.created) }}</span>
                <span v-if="formatTimestamp(sub.current_period_end)"> • Prochaine échéance : {{ formatTimestamp(sub.current_period_end) }}</span>
              </p>
            </div>

            <button
              type="button"
              class="flex items-center gap-2 mt-4 py-2 px-5 text-sm font-semibold bg-theme-button text-theme-buttonText rounded-3xl hover:opacity-90 disabled:opacity-60 transition-all"
              :disabled="isPortalLoading"
              @click="handleOpenPortal"
            >
              <LucideLoader2 v-if="isPortalLoading" :size="16" class="animate-spin" />
              {{ isPortalLoading ? 'Redirection...' : 'Gérer mon abonnement sur Stripe' }}
            </button>
            <p v-if="portalError" class="text-xs text-red-500 mt-2">{{ portalError }}</p>
          </div>
        </div>
      </section>

      <!-- Mes achats -->
      <section class="md:w-full">
        <h2 class="text-xl font-bold my-8">
          Mes achats
        </h2>

        <p v-if="billingStore.isLoadingHistory" class="text-sm text-gray-500">Chargement...</p>
        <p v-else-if="oneShotPayments.length === 0" class="text-sm text-gray-500">
          Tu n'as encore aucun achat.
        </p>

        <div v-else class="space-y-3">
          <div
            v-for="payment in oneShotPayments"
            :key="payment.id"
            class="rounded-2xl bg-theme-surfaceStaticCard p-4"
          >
            <div class="flex items-center justify-between">
              <p class="font-bold text-gray-800">
                {{ accessTypeLabels[payment.metadata.accessType ?? ''] ?? payment.metadata.accessType ?? 'Achat' }}
              </p>
              <span class="text-sm font-semibold text-gray-700">
                {{ formatAmount(payment.amount, payment.currency) }}
              </span>
            </div>
            <p v-if="payment.metadata.entitySubType" class="text-xs text-gray-500 mt-1">
              <span class="capitalize">
                {{ payment.metadata.entityType }}
              </span>
              : {{ entitySubTypeLabels[payment.metadata.entitySubType] ?? payment.metadata.entitySubType }}
            </p>
            <p class="text-xs text-gray-400 mt-1">
              <span v-if="formatTimestamp(payment.created)">
                Acheté le : {{ formatTimestamp(payment.created) }}
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>  
</template>

<style lang="scss" scoped>
.bg-white {
  background-color: var(--card);
}

.border-gray-200 {
  border-color: var(--border);
}

.text-gray-800,
.text-gray-700 {
  color: var(--text);
}

.text-gray-500,
.text-gray-400 {
  color: var(--text-muted);
}
</style>
