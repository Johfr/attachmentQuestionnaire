import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

type User = {
  id: string
  email: string
  displayName?: string
  age?: number
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoginModalOpen = ref(false)
  const redirectAfterLogin = ref<string | null>(null)
  const hasInitialized = ref(false)

  const isLoggedIn = computed(() => !!user.value)

  const openLoginModal = () => {
    isLoginModalOpen.value = true
  }

  const closeLoginModal = () => {
    isLoginModalOpen.value = false
  }

  const login = async (payload: User) => {
    // ici tu remplaceras par Firebase/Auth plus tard
    user.value = payload
    isLoginModalOpen.value = false
  }

  const logout = async () => {
    user.value = null
  }

  const initAuth = async () => {
    // plus tard : lire le user Firebase / cookie / token
    // ici on simule juste une init unique
    if (hasInitialized.value) return
    hasInitialized.value = true
  }

  return {
    user,
    isLoggedIn,
    isLoginModalOpen,
    redirectAfterLogin,
    hasInitialized,
    openLoginModal,
    closeLoginModal,
    login,
    logout,
    initAuth
  }
})