<script setup lang="ts">
import { useQuestionnaireSessionsStore } from '~/stores/questionnaireSessions'
import { useAuthStore } from '~/stores/auth'
import type { AttachmentQuestionnaireDisplayResults } from '~/types/attachmentQuestionnaireResults'
import type { QuestionnaireSession } from '~/types/questionnaireSessions'

definePageMeta({
  middleware: ["auth"],
  requiresAuth: true,
})

const route = useRoute()
const sessionsStore = useQuestionnaireSessionsStore()
const authStore = useAuthStore()
const session = ref<QuestionnaireSession | null>(null)
const loadingError = ref<string | null>(null)
const computedResults = ref<AttachmentQuestionnaireDisplayResults | null>(null)
const isSessionLoading = ref(true)
const sessionLoadingMessage = ref<string | null>(null)
let sessionRefreshTimer: ReturnType<typeof setTimeout> | null = null
let sessionRefreshStopped = false

const hasUnlockedSessionAccess = (currentSession: QuestionnaireSession | null) => {
  if (!currentSession) return false

  return Boolean(
    currentSession.billingInfo?.hasPaidResults ||
    currentSession.billingInfo?.hasPaidIa ||
    currentSession.billingInfo?.hasPaidMembership ||
    currentSession.billingInfo?.hasPaidFormation,
  )
}

const wait = (delayMs: number) => new Promise(resolve => setTimeout(resolve, delayMs))
const SESSION_LOOKUP_ATTEMPTS = 10
const SESSION_LOOKUP_DELAY_MS = 2000

const loadSession = async () => {
  try {
    isSessionLoading.value = true
    loadingError.value = null
    computedResults.value = null
    sessionLoadingMessage.value = typeof route.query.sessionId === 'string'
      ? 'Nous recuperons ta session et tes accès...'
      : 'Chargement de ta session...'

    await sessionsStore.loadSessions()
    const requestedSessionId = typeof route.query.sessionId === 'string' ? route.query.sessionId : null

    if (requestedSessionId) {
      let selectedSession = sessionsStore.getSessionById(requestedSessionId)

      if (!selectedSession && import.meta.client) {
        for (let attempt = 1; attempt <= SESSION_LOOKUP_ATTEMPTS; attempt++) {
          sessionLoadingMessage.value = `Nous recuperons ta sessièn... (${attempt}/${SESSION_LOOKUP_ATTEMPTS})`
          await wait(SESSION_LOOKUP_DELAY_MS)
          await sessionsStore.loadSessions(true)
          selectedSession = sessionsStore.getSessionById(requestedSessionId)

          if (selectedSession) {
            break
          }
        }
      }

      session.value = selectedSession && selectedSession.questionnaireType === 'attachment'
        ? selectedSession
        : null

      if (!session.value) {
        loadingError.value = 'Impossible de recuperer cette session pour le moment. Reessaie dans quelques instants.'
        return
      }
    } else {
      session.value = sessionsStore.latestAttachmentSession

      if (!session.value) {
        loadingError.value = 'Aucune session attachement disponible pour le moment.'
        return
      }
    }

    if (!session.value?.result) {
      loadingError.value = 'Cette session ne contient pas de resultats exploitables.'
      return
    }

    computedResults.value = await $fetch<AttachmentQuestionnaireDisplayResults>('/api/attachment/display-from-session', {
      method: 'POST',
      body: {
        storedResult: session.value.result,
        completedAt: session.value.completedAt,
      },
    })
  } catch (error) {
    loadingError.value = error instanceof Error
      ? error.message
      : 'Impossible de charger la session pour le moment.'
  } finally {
    isSessionLoading.value = false
    sessionLoadingMessage.value = null
  }
}

const scheduleBillingRefresh = (attempt = 0) => {
  const requestedSessionId = typeof route.query.sessionId === 'string' ? route.query.sessionId : null
  const refreshSessionId = requestedSessionId ?? session.value?.id ?? null
  const MAX_ATTEMPTS = 15
  const RETRY_DELAY_MS = 3000

  if (!import.meta.client || !refreshSessionId || sessionRefreshStopped) return
  if (!session.value || attempt >= MAX_ATTEMPTS) return

  const needsBillingRefresh = !hasUnlockedSessionAccess(session.value)
  if (!needsBillingRefresh) return

  sessionRefreshTimer = setTimeout(async () => {
    if (sessionRefreshStopped) return

    try {
      await sessionsStore.loadSessions(true)
      const refreshedSession = sessionsStore.getSessionById(refreshSessionId)
      if (refreshedSession?.questionnaireType === 'attachment') {
        session.value = refreshedSession
      }
    } finally {
      const shouldContinue = !sessionRefreshStopped && !hasUnlockedSessionAccess(session.value)

      if (shouldContinue) {
        scheduleBillingRefresh(attempt + 1)
      }
    }
  }, RETRY_DELAY_MS)
}

if (import.meta.server) {
  sessionLoadingMessage.value = typeof route.query.sessionId === 'string'
    ? 'Nous recuperons ta session et tes accès...'
    : 'Chargement de ta session...'
} else {
  await loadSession()
  scheduleBillingRefresh()
}

const goBack = async () => {
  await navigateTo('/user/profil')
}

onBeforeRouteLeave((to) => {
  if (to.path === '/attachment-questionnaire/questionnaire' || to.path === '/attachment-questionnaire/introduction') {
    return false
  }
})

onBeforeUnmount(() => {
  sessionRefreshStopped = true
  if (sessionRefreshTimer) {
    clearTimeout(sessionRefreshTimer)
    sessionRefreshTimer = null
  }
})
</script>

<template>
  <section>
    <button @click="goBack" class="mt-5 mb-6 flex items-center text-xs text-theme-text md:text-sm">
      <LucideArrowLeft :size="16" />
      Retour au profil
    </button>
    <h1 class="text-center text-xl font-bold text-theme-text md:mx-auto md:max-w-144 md:text-4xl">Tes resultats au Questionnaire d'attachement adulte</h1>
    <p class="text-center text-sm text-theme-muted md:text-base">Decouvre ton style d'attachement</p>
    <p v-if="computedResults" class="text-center text-sm text-theme-muted md:text-base">
      {{ computedResults.completionDate }}
    </p>

    <div class="my-10">
      <div
        v-if="isSessionLoading"
        class="rounded-3xl border-l-4 border-l-theme-resultsTriggerAnxietyBorder bg-theme-resultsSurface p-5"
      >
        <div class="flex items-center text-sm text-theme-link">
          <LucideLoader class="animate-spin inline-block mr-2" :size="18" />
          {{ sessionLoadingMessage }}
        </div>
      </div>

      <p v-else-if="loadingError" class="text-theme-resultsTriggerHighText">{{ loadingError }}</p>

      <AttachmentQuestionnaireResults
        v-if="!isSessionLoading && computedResults && session"
        :docId="session.id"
        :session-billing-info="session.billingInfo"
        :computed-results="computedResults"
        :ai-exchange="session.aiExchange"
        :tags-results="computedResults.tagsResults"
        :tag-data="computedResults.tagData"
        :anxiety-average-score="computedResults.anxietyAverageScore"
        :avoidance-average-score="computedResults.avoidanceAverageScore"
        :anxiety-datasets="computedResults.anxietyDatasets"
        :avoidance-datasets="computedResults.avoidanceDatasets"
        :is-admin="authStore.isAdmin"
      />
    </div>
  </section>
</template>
