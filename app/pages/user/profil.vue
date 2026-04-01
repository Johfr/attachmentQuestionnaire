<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ["auth"],
  requiresAuth: true
})

const authStore = useAuthStore()
const isLoggedIn = computed(() => authStore.isLoggedIn)
const isSubmitting = ref(false)

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
    <h2>Réussis ta relation ou mets y fin de façon saine</h2>
    <p>Réduis ta panique et/ou ta fuite en adoptant des comportements sains et protecteurs.</p>

    <H1 class="text-lg font-bold">Profil</H1>

    <RouterLink to="/user/attachment-questionnaire/results">
      <button class="py-4 rounded-3xl w-full bg-white text-blue-700" @click="">Voir mes résultats</button>
    </RouterLink>

    <button
      type="button"
      class="mt-4 py-4 px-5 rounded-3xl w-full bg-rust text-white flex items-center justify-center gap-2 disabled:opacity-60"
      :disabled="isSubmitting"
      @click="handleAuthAction"
    >
      <LucidePowerOff v-if="isLoggedIn" :size="18" />
      <LucidePower v-else :size="18" />
      <span>Se deconnecter</span>
    </button>
  </div>  
</template>

<style lang="scss" scoped>
</style>