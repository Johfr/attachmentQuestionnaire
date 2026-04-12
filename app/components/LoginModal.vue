<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import LoginForm from "~/utils/LoginForm.vue"
import type { AuthFormPayload } from '~/types/User'

const authStore = useAuthStore()

type LoginFormExpose = {
  submit: () => { isValid: boolean, payload?: AuthFormPayload }
}

const loginFormData = ref<LoginFormExpose | null>(null)
const authErrorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const handleLogin = async () => {
  authErrorMessage.value = null

  const submitResult = loginFormData.value?.submit()
  if (!submitResult?.isValid || !submitResult.payload) return

  isSubmitting.value = true

  try {
    const result = await authStore.authenticateForQuestionnaire(submitResult.payload)
    if (!result.success) {
      authErrorMessage.value = result.errorMessage || 'Impossible de se connecter pour le moment.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="fixed top-0 left-0 flex h-full w-full items-center justify-center bg-theme-modalOverlay px-4" @click.self="authStore.closeLoginModal()">
    <div class="max-h-128 w-full max-w-80 overflow-auto rounded-3xl bg-theme-modalBg p-6 text-theme-modalText shadow-lg md:max-w-md">

      <p v-if="authErrorMessage" class="mt-3 text-xs text-red-600">
        {{ authErrorMessage }}
      </p>

      <LoginForm ref="loginFormData" />

      <div class="flex items-center mt-5">
        <button :disabled="isSubmitting" class="mr-3 flex items-center gap-2 rounded-3xl bg-theme-button px-4 py-3 text-xs text-theme-primaryText disabled:opacity-60 md:text-sm" @click="handleLogin">
          <LucideLoader v-if="isSubmitting" :size="14" class="loader-spin" />
          {{ isSubmitting ? 'Verification...' : 'Se connecter' }}
        </button>
        <button class="text-theme-muted" @click="authStore.closeLoginModal()">
          Fermer
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loader-spin {
  animation: loader-rotate 0.8s linear infinite;
}

@keyframes loader-rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
