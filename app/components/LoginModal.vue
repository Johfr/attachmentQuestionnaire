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
  <div class="modal fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50" @click.self="authStore.closeLoginModal()">
    <div class="max-w-80 w-full max-h-128 overflow-auto bg-white p-6 rounded-3xl shadow-lg md:max-w-md">

      <p v-if="authErrorMessage" class="mt-3 text-xs text-red-600">
        {{ authErrorMessage }}
      </p>

      <LoginForm ref="loginFormData" />

      <div class="flex items-center mt-5">
        <button :disabled="isSubmitting" class="px-4 py-3 mr-3 rounded-3xl bg-blue-500 text-white text-xs md:text-sm disabled:opacity-60 flex items-center gap-2" @click="handleLogin">
          <LucideLoader v-if="isSubmitting" :size="14" class="loader-spin" />
          {{ isSubmitting ? 'Verification...' : 'Se connecter' }}
        </button>
        <button @click="authStore.closeLoginModal()">
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