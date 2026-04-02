<script setup lang="ts">
import UserProgress from '~/components/designSystem/UserProgress.vue'
import { useAuthStore } from '~/stores/auth'
import { useQuestionnaireSessionsStore } from '~/stores/questionnaireSessions'
import type { QuestionnaireSession } from '~/types/questionnaireSessions'

definePageMeta({
  middleware: ["auth"],
  requiresAuth: true
})

const authStore = useAuthStore()
const sessionsStore = useQuestionnaireSessionsStore()
const isLoggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.user)
const isSubmitting = ref(false)

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
      await sessionsStore.loadSessions()
      return
    }

    sessionsStore.reset()
  },
  { immediate: true },
)

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
</script>

<template>
  <div>
    <!-- <h2>Réussis ta relation ou mets y fin de façon saine</h2>
    <p>Réduis ta panique et/ou ta fuite en adoptant des comportements sains et protecteurs.</p> -->
    
    <DesignSystemPageSectionHeading :isTitleH1="true" title="Mon profil" sectionSpacing="mt-8 mb-12" />

    <!-- userInfos flex justify-between items-start -->
    <section class="">
      <h2 class="text-xl font-bold my-8">
        Informations personnelles
      </h2>

      <div class="flex items-center">
        <p class="font-bold">
          {{ user?.name }}, {{ user?.age }} ans
        </p>

        <button
          type="button"
          class="flex items-center justify-center gap-2 ml-5 py-2 px-4 text-xs text-white  disabled:opacity-60 rounded-3xl bg-rust"
          title="Se déconnecter"
          :disabled="isSubmitting"
          @click="handleAuthAction"
        >
          <span>Déconnection</span>
          <LucidePowerOff v-if="isLoggedIn" :size="18" />
          <LucidePower v-else :size="18" />
        </button>
      </div>

      <UserProgress />
    </section>

    <section class="max-w-[48%]">
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
          class="block p-4 rounded-2xl bg-white border border-gray-200 hover:border-rust transition-colors"
        >
          <p class="font-bold text-gray-800 mt-1">{{ session.summary?.title }}</p>
          <p class="text-xs uppercase text-gray-400">
            {{ session.questionnaireType }} • {{ formatSessionDate(session) }}
          </p>
          <p class="text-xs uppercase text-gray-400">
            {{ user?.name }} • {{ session.relationContext.partnerFirstName }}
          </p>
          <p class="text-xs uppercase text-gray-400">
            Avoidance : {{ session.result.avoidanceScore }}% • Anxiety : {{ session.result.anxietyScore }}%
          </p>
        </RouterLink>
      </div>
    </section>

    <section>
      <h2 class="text-xl font-bold my-8">
        Gérer mon abonnement
      </h2>

    </section>
  </div>  
</template>

<style lang="scss" scoped>
</style>