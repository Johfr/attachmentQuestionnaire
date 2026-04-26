import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_SITE_CONFIG, normalizeSiteConfig, type SiteConfig, type SiteConfigPatch } from '~/utils/siteConfig'
import { firebaseClient } from '~/composables/firebase/useFirebaseClient.js'

export const useSiteConfigStore = defineStore('siteConfig', () => {
  const config = ref<SiteConfig>(DEFAULT_SITE_CONFIG)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  const isResultsSharingEnabled = computed(() => config.value.features.resultsSharing === true)

  const loadConfig = async (force = false) => {
    if (!force && loaded.value) {
      return config.value
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<SiteConfig>('/api/site-config')
      config.value = normalizeSiteConfig(response)
      loaded.value = true
      return config.value
    } catch (err) {
      config.value = DEFAULT_SITE_CONFIG
      error.value = err instanceof Error
        ? err.message
        : 'Impossible de charger la configuration du site.'
      loaded.value = true
      return config.value
    } finally {
      isLoading.value = false
    }
  }

  const updateConfig = async (patch: SiteConfigPatch) => {
    const token = await firebaseClient.auth.currentUser?.getIdToken()
    if (!token) {
      throw new Error('Impossible de vérifier ton compte pour le moment.')
    }

    isSaving.value = true
    error.value = null

    try {
      const response = await $fetch<SiteConfig>('/api/admin/site-config', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
        },
        body: patch,
      })

      config.value = normalizeSiteConfig(response)
      loaded.value = true
      return config.value
    } catch (err) {
      error.value = err instanceof Error
        ? err.message
        : 'Impossible de mettre à jour la configuration du site.'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  return {
    config,
    isLoading,
    isSaving,
    error,
    loaded,
    isResultsSharingEnabled,
    loadConfig,
    updateConfig,
  }
})
