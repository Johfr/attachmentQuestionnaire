<script setup lang="ts">
import NumberDrawPyramid from '~/components/NumberDrawPyramid.vue'
import { useAuthStore } from '~/stores/auth'
import { useBillingStore } from '~/stores/billing'
import { useSiteConfigStore } from '~/stores/siteConfig'

definePageMeta({
  middleware: ['auth'],
  requiresAuth: true,
})

const route = useRoute()
const authStore = useAuthStore()
const billingStore = useBillingStore()
const siteConfigStore = useSiteConfigStore()
const runtimeConfig = useRuntimeConfig()

const isLoadingCheckout = ref(false)
const checkoutError = ref('')
const featureFlagsError = ref('')
const appEnv = computed(() => (runtimeConfig.public.appEnv || 'prod').toUpperCase())
const firebaseProjectId = computed(() => runtimeConfig.public.firebaseProjectId || 'non configure')
const stripeMode = computed(() => appEnv.value === 'TEST' ? 'Stripe test' : 'Stripe live')
const isResultsSharingEnabled = computed(() => siteConfigStore.isResultsSharingEnabled)

const startLiveCheckoutTest = async () => {
  checkoutError.value = ''
  isLoadingCheckout.value = true

  try {
    await billingStore.goToCheckout('other', 'other', 'testLive', 'v1', 'admin', 'admin-live-checkout')
  } catch (error) {
    checkoutError.value = error instanceof Error
      ? error.message
      : 'Impossible de creer la checkout session de test pour le moment.'
  } finally {
    isLoadingCheckout.value = false
  }
}

const toggleResultsSharing = async () => {
  featureFlagsError.value = ''

  try {
    await siteConfigStore.updateConfig({
      features: {
        resultsSharing: !isResultsSharingEnabled.value,
      },
    })
  } catch (error) {
    featureFlagsError.value = error instanceof Error
      ? error.message
      : 'Impossible de mettre à jour cette feature pour le moment.'
  }
}

await siteConfigStore.loadConfig()
</script>

<template>
  <section>
    <DesignSystemPageSectionHeading :isHeading="true" title="Admin panel" titleSize="text-4xl md:text-3xl" sectionSpacing="mt-8 mb-12" />

    <div v-if="authStore.isAdmin" class="border-none">
      <section class="mb-6 rounded-3xl border-l-4 border-theme-button bg-theme-surfaceStaticCard p-6">
        <h2 class="mb-3 text-xl font-semibold text-theme-text">
          Environnement courant
        </h2>
        <p class="text-sm text-theme-muted">
          Mode : <span class="font-semibold text-theme-text">{{ appEnv }}</span>
        </p>
        <p class="text-sm text-theme-muted">
          Firebase : <span class="font-semibold text-theme-text">{{ firebaseProjectId }}</span>
        </p>
        <p class="text-sm text-theme-muted">
          Stripe attendu : <span class="font-semibold text-theme-text">{{ stripeMode }}</span>
        </p>
      </section>

      <section class="mb-6 rounded-3xl border-l-4 border-theme-button bg-theme-surfaceStaticCard p-6">
        <h2 class="mb-3 text-xl font-semibold text-theme-text">
          Feature flags
        </h2>
        <p class="mb-2 text-sm text-theme-muted">
          Partage des résultats partenaire :
          <span class="font-semibold text-theme-text">
            {{ isResultsSharingEnabled ? 'activé' : 'désactivé' }}
          </span>
        </p>
        <p class="mb-4 text-sm text-theme-muted">
          Si la feature est désactivée, le bouton de partage et l’icône entre les résultats sont masqués, et les endpoints de partage refusent les requêtes.
        </p>
        <p v-if="featureFlagsError" class="mb-4 rounded-3xl bg-red-700 px-4 py-2 text-sm text-white">
          {{ featureFlagsError }}
        </p>

        <button
          class="bg-theme-button text-theme-buttonText inline-flex items-center gap-2 rounded-3xl px-5 py-3 text-sm"
          :disabled="siteConfigStore.isSaving"
          @click="toggleResultsSharing"
        >
          <LucideLoader v-if="siteConfigStore.isSaving" :size="18" class="animate-spin" />
          <span>
            {{ siteConfigStore.isSaving
              ? 'Mise à jour en cours...'
              : isResultsSharingEnabled
                ? 'Désactiver le partage'
                : 'Activer le partage' }}
          </span>
        </button>
      </section>

      <section class="rounded-3xl border-l-4 border-theme-button bg-theme-surfaceStaticCard p-6">
        <h2 class="mb-3 text-xl font-semibold text-theme-text">
          Test achat produit Stripe en PROD
        </h2>
        <p class="mb-4 text-sm text-theme-muted">
          Ce bouton permet de vérifier la page Stripe Checkout et l'écriture Firestore dans `customers/{uid}/checkout_sessions`.
        </p>

        <p v-if="route.query.checkout === 'success'" class="mb-4 rounded-3xl bg-green-700 px-4 py-2 text-sm text-white">
          Retour checkout détecté. Tu peux maintenant vérifier Stripe et Firestore.
        </p>

        <p v-if="checkoutError" class="mb-4 rounded-3xl bg-red-700 px-4 py-2 text-sm text-white">
          {{ checkoutError }}
        </p>

        <button
          class="bg-theme-button text-theme-buttonText inline-flex items-center gap-2 rounded-3xl px-5 py-3 text-sm"
          :disabled="isLoadingCheckout"
          @click="startLiveCheckoutTest"
        >
          <LucideLoader v-if="isLoadingCheckout" :size="18" class="animate-spin" />
          <span>{{ isLoadingCheckout ? 'Redirection en cours...' : 'Lancer un test checkout' }}</span>
        </button>
      </section>
    </div>

    <div v-else class="rounded-3xl border-l-4 border-theme-button bg-theme-surfaceStaticCard p-6">
      <p class="text-sm text-theme-muted">
        Cette page est réservée à l'administration.
      </p>
    </div>
  </section>
</template>
