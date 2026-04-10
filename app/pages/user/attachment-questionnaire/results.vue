<script setup lang="ts">
import { useQuestionnaireSessionsStore } from '~/stores/questionnaireSessions'
import { firebaseFunctions } from '~/composables/firebase/init'
import type { AttachmentQuestionnaireDisplayResults } from '~/types/attachmentQuestionnaireResults'
import type { QuestionnaireSession } from '~/types/questionnaireSessions'
import { normalizeAiExchange } from '~/utils/aiExchange'

definePageMeta({
  middleware: ["auth"],
  requiresAuth: true,
})

const route = useRoute()
const sessionsStore = useQuestionnaireSessionsStore()
const session = ref<QuestionnaireSession | null>(null)
const loadingError = ref<string | null>(null)
const computedResults = ref<AttachmentQuestionnaireDisplayResults | null>(null)
let sessionRefreshTimer: ReturnType<typeof setTimeout> | null = null
let sessionRefreshStopped = false
const aiGenerationStarted = ref(false)

const hasUnlockedSessionAccess = (currentSession: QuestionnaireSession | null) => {
  if (!currentSession) return false

  return Boolean(
    currentSession.billingInfo?.hasPaidResults ||
    currentSession.billingInfo?.hasPaidIa ||
    currentSession.billingInfo?.hasPaidMembership ||
    currentSession.billingInfo?.hasPaidFormation,
  )
}

const hasPendingAiExchange = (currentSession: QuestionnaireSession | null) => {
  if (!currentSession) return false
  return normalizeAiExchange(currentSession.aiExchange).status === 'pending'
}

const refreshCurrentSessionFromStore = (sessionId: string) => {
  const refreshedSession = sessionsStore.getSessionById(sessionId)
  if (refreshedSession?.questionnaireType === 'attachment') {
    session.value = refreshedSession
  }
}

const loadSession = async () => {
  try {
    loadingError.value = null
    computedResults.value = null

    await sessionsStore.loadSessions()
    const requestedSessionId = typeof route.query.sessionId === 'string' ? route.query.sessionId : null

    if (requestedSessionId) {
      const selectedSession = sessionsStore.getSessionById(requestedSessionId)
      session.value = selectedSession && selectedSession.questionnaireType === 'attachment'
        ? selectedSession
        : null

      if (!session.value) {
        loadingError.value = 'La session demandee est introuvable.'
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
      loadingError.value = 'Cette session ne contient pas de résultats exploitables.'
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
  }
}

const maybeStartAiGeneration = async () => {
  const currentSession = session.value
  if (!import.meta.client || !currentSession || aiGenerationStarted.value) return
  if (!currentSession.billingInfo?.hasPaidIa) return

  const aiExchange = normalizeAiExchange(currentSession.aiExchange)
  if (aiExchange.status !== 'pending' || aiExchange.requestId || aiExchange.output) return

  aiGenerationStarted.value = true

  try {
    const token = await firebaseFunctions.auth.currentUser?.getIdToken()
    await $fetch('/api/attachment/ai/generate', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        sessionId: currentSession.id,
      },
    })
  } catch (error) {
    console.error('Error while generating AI attachment analysis:', error)
  } finally {
    try {
      await sessionsStore.loadSessions(true)
      refreshCurrentSessionFromStore(currentSession.id)
    } finally {
      aiGenerationStarted.value = false
    }
  }
}

await loadSession()

const scheduleBillingRefresh = (attempt = 0) => {
  const requestedSessionId = typeof route.query.sessionId === 'string' ? route.query.sessionId : null
  const refreshSessionId = requestedSessionId ?? session.value?.id ?? null
  const MAX_ATTEMPTS = 15
  const RETRY_DELAY_MS = 3000

  if (!import.meta.client || !refreshSessionId || sessionRefreshStopped) return
  if (!session.value || attempt >= MAX_ATTEMPTS) return

  const needsBillingRefresh = !hasUnlockedSessionAccess(session.value)
  const needsAiRefresh = hasPendingAiExchange(session.value)
  if (!needsBillingRefresh && !needsAiRefresh) return

  sessionRefreshTimer = setTimeout(async () => {
    if (sessionRefreshStopped) return

    try {
      await sessionsStore.loadSessions(true)
      refreshCurrentSessionFromStore(refreshSessionId)
      await maybeStartAiGeneration()
    } finally {
      const shouldContinue = !sessionRefreshStopped
        && (!hasUnlockedSessionAccess(session.value) || hasPendingAiExchange(session.value))

      if (shouldContinue) {
        scheduleBillingRefresh(attempt + 1)
      }
    }
  }, RETRY_DELAY_MS)
}

if (import.meta.client) {
  await maybeStartAiGeneration()
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
    <button @click="goBack" class="text-blue-700 text-xs md:text-sm flex items-center">
      <LucideArrowLeft :size="16" />
      Retour au profil
    </button>
    <h1 class="text-xl font-bold text-center md:text-4xl md:max-w-144 md:mx-auto">Tes résultats au Questionnaire d'attachement adulte</h1>
    <p class="text-sm md:text-base text-center text-gray-600">Découvre ton style d'attachement</p>
    <p v-if="computedResults" class="text-sm md:text-base text-center text-gray-600">
      {{ computedResults.completionDate }}
    </p>

    <div class="my-10">
      <p v-if="loadingError" class="text-red-600">{{ loadingError }}</p>

      <AttachmentQuestionnaireResults
        v-if="computedResults && session"
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
      />
    </div>
  </section>
</template>

<style>
</style>
