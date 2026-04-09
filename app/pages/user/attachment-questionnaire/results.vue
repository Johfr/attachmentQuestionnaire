<script setup lang="ts">
import { useQuestionnaireSessionsStore } from '~/stores/questionnaireSessions'
import type { AttachmentQuestionnaireDisplayResults } from '~/types/attachmentQuestionnaireResults'
import type { QuestionnaireSession } from '~/types/questionnaireSessions'

definePageMeta({
  middleware: ["auth"],
  requiresAuth: true,
})

const route = useRoute()
const router = useRouter()
const sessionsStore = useQuestionnaireSessionsStore()
const session = ref<QuestionnaireSession | null>(null)
const loadingError = ref<string | null>(null)
const computedResults = ref<AttachmentQuestionnaireDisplayResults | null>(null)
let billingRefreshTimer: ReturnType<typeof setTimeout> | null = null
let billingRefreshStopped = false

const hasUnlockedSessionAccess = (currentSession: QuestionnaireSession | null) => {
  if (!currentSession) return false

  return Boolean(
    currentSession.billingInfo?.hasPaidResults ||
    currentSession.billingInfo?.hasPaidIa ||
    currentSession.billingInfo?.hasPaidMembership ||
    currentSession.billingInfo?.hasPaidFormation,
  )
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

await loadSession()

const scheduleBillingRefresh = (attempt = 0) => {
  const requestedSessionId = typeof route.query.sessionId === 'string' ? route.query.sessionId : null
  const MAX_ATTEMPTS = 5
  const RETRY_DELAY_MS = 2000

  if (!import.meta.client || !requestedSessionId || billingRefreshStopped) return
  if (!session.value || hasUnlockedSessionAccess(session.value) || attempt >= MAX_ATTEMPTS) return

  billingRefreshTimer = setTimeout(async () => {
    if (billingRefreshStopped) return

    try {
      await sessionsStore.loadSessions(true)
      const refreshedSession = sessionsStore.getSessionById(requestedSessionId)
      if (refreshedSession?.questionnaireType === 'attachment') {
        session.value = refreshedSession
      }
    } finally {
      if (!billingRefreshStopped && !hasUnlockedSessionAccess(session.value)) {
        scheduleBillingRefresh(attempt + 1)
      }
    }
  }, RETRY_DELAY_MS)
}

if (import.meta.client) {
  scheduleBillingRefresh()
}

const goBack = async () => {
  await navigateTo('/user/profil')
}

onBeforeRouteLeave((to, from, next) => {
  if (to.path === '/attachment-questionnaire/questionnaire' || to.path === '/attachment-questionnaire/introduction') {
    next(false)
  } else {
    next()
  }
})

onBeforeUnmount(() => {
  billingRefreshStopped = true
  if (billingRefreshTimer) {
    clearTimeout(billingRefreshTimer)
    billingRefreshTimer = null
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
