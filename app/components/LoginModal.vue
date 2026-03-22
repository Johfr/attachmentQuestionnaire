<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

const handleLogin = async () => {
  await authStore.login({
    id: '1',
    email: 'user@test.com',
    displayName: 'John'
  })

  // const target = authStore.redirectAfterLogin || '/'
  // authStore.redirectAfterLogin = null

  // await navigateTo(target)
}
</script>

<template>
  <div class="modal">
    <button @click="handleLogin">
      Se connecter
    </button>

    <button @click="authStore.closeLoginModal()">
      Fermer
    </button>
  </div>
</template>