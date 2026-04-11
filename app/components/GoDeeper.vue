<script setup lang="ts">
import { useBillingStore } from '~/stores/billing'
import { firebaseFunctions } from '~/composables/firebase/init'
import { ATTACHMENT_AI_MAX_INPUT_CHARS, ATTACHMENT_AI_MIN_INPUT_CHARS } from '~/constants/attachmentAi'
import { normalizeAiExchange } from '~/utils/aiExchange'
import type { EntitySubType, EntityType, AccessType } from '~/types/billing'
import type { AiExchange } from '~/types/questionnaireSessions'
import Popin from '~/utils/Popin.vue'

const billingStore = useBillingStore()

const props = defineProps<{
  docId: string
  hasBasicAccess: boolean
  hasResultsAccess: boolean
  hasIaAccess: boolean
  hasMembershipAccess: boolean
  hasFormationAccess: boolean
  hasUsedIa: boolean
  aiExchange?: AiExchange | null
  isAiLoading?: boolean
  aiLoadingMessage?: string
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  (e: 'retryIa'): void
  (e: 'forceRegenerateIa'): void
}>()

const checkoutType = ref<AccessType | null>(null)
const preparingIaCheckout = ref(false)
const errorMessage = ref('')
const normalizedAiExchange = computed(() => normalizeAiExchange(props.aiExchange))

const hasDetailedResultsAccess = computed(() => {
  return (
    props.hasResultsAccess ||
    props.hasIaAccess ||
    props.hasMembershipAccess ||
    props.hasFormationAccess
  )
})

const showResultsOffer = computed(() => !props.hasBasicAccess && !props.isAiLoading)
const showIaOffer = computed(() => {
  return !props.hasUsedIa
    && normalizedAiExchange.value.status === 'not_purchased'
    && !props.isAiLoading
})
const showAiGeneratedState = computed(() => {
  return normalizedAiExchange.value.status === 'generated' && Boolean(normalizedAiExchange.value.output)
})
const showAdminForceRegenerate = computed(() => {
  return Boolean(
    props.isAdmin
    && props.hasIaAccess
    && normalizedAiExchange.value.userInput?.trim()
    && !showAiPendingState.value,
  )
})
const showAiFailedState = computed(() => {
  return props.hasIaAccess && normalizedAiExchange.value.status === 'failed' && !normalizedAiExchange.value.output
})
const showAiPendingState = computed(() => {
  return Boolean(props.isAiLoading) || normalizedAiExchange.value.status === 'pending'
})
const showAiSyncingState = computed(() => {
  return props.hasIaAccess
    && normalizedAiExchange.value.status === 'not_purchased'
    && Boolean(normalizedAiExchange.value.userInput?.trim())
    && !showAiPendingState.value
    && !showAiGeneratedState.value
    && !showAiFailedState.value
})

const checkUserStatus = (actionType: 'ia' | 'results') => {
  if (actionType === 'ia') {
    // popin d'incitation a l'achat
    openPopin('ia')
  } else if (actionType === 'results') {
    if (props.hasResultsAccess || props.hasMembershipAccess || props.hasFormationAccess) {
      // acces direct aux resultats sans popin
      openPopin('results')
    } else {
      // popin d'incitation a l'achat
      openPopin('results')
    }
  }
}

type PopinKey = 'results' | 'ia' | 'membership' | string
const showPopin = ref(false)
const togglePopin = () => {
  showPopin.value = !showPopin.value
}
const popinType = ref<PopinKey>('')
const openPopin = (key: PopinKey) => {
  // log event analytics ouverture popin avec cle
  errorMessage.value = ''
  togglePopin()
  popinType.value = key
}

const goToCheckout = async (entityType: EntityType, entitySubType: EntitySubType, accessType: AccessType) => {
  checkoutType.value = accessType

  try {
    await billingStore.goToCheckout(entityType, entitySubType, accessType, 'v1', 'attachment-questionnaire', props.docId)
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Une erreur est survenue lors de la redirection vers le paiement.'
  } finally {
    checkoutType.value = null
  }
}

// IA
const textarea = ref('')
const minTextareaRequired = ATTACHMENT_AI_MIN_INPUT_CHARS
const maxTextareaAllowed = ATTACHMENT_AI_MAX_INPUT_CHARS
const checkTextareaFilled = computed(() => textarea.value.trim().length >= minTextareaRequired)
const textareaLength = computed(() => textarea.value.trim().length)
const remainingTextareaChars = computed(() => maxTextareaAllowed - textareaLength.value)

watch(textarea, (nextValue) => {
  if (nextValue.length > maxTextareaAllowed) {
    textarea.value = nextValue.slice(0, maxTextareaAllowed)
  }
})

watch(
  () => normalizedAiExchange.value.userInput,
  (nextInput) => {
    if (!textarea.value.trim() && nextInput) {
      textarea.value = nextInput
    }
  },
  { immediate: true },
)

const getAuthorizationHeaders = async () => {
  const token = await firebaseFunctions.auth.currentUser?.getIdToken()
  if (!token) {
    throw new Error('Impossible de verifier ton compte pour le moment.')
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

const prepareIaCheckout = async () => {
  errorMessage.value = ''
  preparingIaCheckout.value = true

  try {
    const headers = await getAuthorizationHeaders()

    await $fetch('/api/attachment/ai/prepare', {
      method: 'POST',
      headers,
      body: {
        sessionId: props.docId,
        userInput: textarea.value.trim(),
      },
    })

    await goToCheckout('questionnaire', 'attachment', 'ia')
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Une erreur est survenue lors de la preparation de ton analyse.'
  } finally {
    preparingIaCheckout.value = false
  }
}
</script>

<template>
  <section id="premium-zone" class="my-8 mb-3" v-if="showResultsOffer">
    <h2 class="text-xl text-center font-bold my-5 md:text-2xl md:text-left">
      Aller plus loin
    </h2>

    <!-- admin ia button -->
    <div
      v-if=" false && showAdminForceRegenerate"
      class="mb-5 p-4 rounded-3xl border border-dashed border-gray-400 bg-gray-50"
    >
      <p class="text-xs text-gray-500 mb-3">
        Outil admin de test IA
      </p>
      <button
        class="py-3 px-5 rounded-3xl bg-gray-900 text-white shadow-xl hover:shadow-none transition-shadow duration-300"
        @click="emit('forceRegenerateIa')"
      >
        Regenerer l analyse
      </button>
    </div>

    <div class="md:flex md:items-start md:gap-8">
      <!-- Acces a tous les resultats -->
      <div
        v-if="showResultsOffer"
        data-testid="go-deeper-results-offer"
        class="p-5 rounded-3xl bg-blue-700 text-white bg-gradient-to-tr from-blue-700 to-blue-500 md:max-w-[48%] "
      >
        <div class="flex justify-between items-center mb-5 font-semibold tracking-[.13rem]">
          <h3 class="text-lg">
            Acces complets aux resultats
          </h3>
          <!-- <span class="text-xl">
            1.99EUR
          </span> -->
        </div>

        <p class="mb-2 text-sm">
          Debloque l'acces a :
        </p>
        <ul class="list-disc text-sm pl-4 mb-5">
          <li class="mb-1">
            Tes 2 sous profils : anxieux et evitants
          </li>
          <li class="mb-1">
            1 graphique polar avec la repartition de tes declencheurs en %
          </li>
          <li class="mb-1">
            Tes 6 Declencheurs anxieux
          </li>
          <li class="mb-1">
            Tes 5 Declencheurs evitants
          </li>
          <li class="mb-1">
            Des conseils personnalises ainsi que des recommandations pour travailler sur tes mecanismes d'attachement
          </li>
        </ul>
        <button
          class="py-4 rounded-3xl w-full bg-white text-blue-700 transition-all duration-[400ms] shadow-xl hover:bg-gray-200 hover:shadow-none"
          @click="openPopin('results')"
        >
          Debloquer !
        </button>
      </div>

      <!-- Acces aux resultats et a l'ia -->
      <div
        v-if="false && showIaOffer"
        data-testid="go-deeper-ia-offer"
        class="mt-8 p-5 border-l-4 rounded-3xl md:m-0 bg-white md:max-w-[48%]"
      >
        <div class="md:flex md:justify-between md:items-center mb-5 font-semibold tracking-[.13rem]">
          <h3 class="text-md">
            Analyse sur mesure
          </h3>
          <!-- <span class="text-xl">
            4.99EUR (tout inclus)
          </span> -->
        </div>

        <p class="mb-5 text-sm">
          Detaille ta situation amoureuse*, sois le plus honnete possible. Decris ta situation, tes doutes, tes envies et ton objectif et recois :
        </p>

        <ul class="list-disc text-sm pl-4 mb-5">
          <li v-if="!hasDetailedResultsAccess" data-testid="go-deeper-ia-includes-results" class="mb-1">
            L'ensemble de tes resultats debloques
          </li>
          <li class="mb-1">
            Une analyse personnalisee de tes resultats en fonction de ta situation amoureuse actuelle
          </li>
          <li class="mb-1">
            Une analyse detaillee de ta situation amoureuse
          </li>
          <li class="mb-1">
            Des conseils sur mesure pour avancer vers plus de securite dans ta relation actuelle
          </li>
          <li class="mb-1">
            Une grille de lecture et un plan d'action concret
          </li>
        </ul>
        <span class="text-xs text-gray-500">* Ne transmets aucunes donnees sensibles telles que nom, adresse, numero de telephone, etc.</span>

        <div class="mb-5">
          <textarea
            v-model="textarea"
            class="w-full h-60 p-3 rounded-lg border text-sm md:h-40"
            rows="4"
            :maxlength="maxTextareaAllowed"
            placeholder="Parle-moi un peu de ta situation amoureuse actuelle... Sois le plus explicite et honnete possible pour que mon analyse soit la plus precise possible !"
          ></textarea>

          <span v-if="textareaLength < minTextareaRequired">
            Minimum : {{ minTextareaRequired - textareaLength }}
          </span>
          <span
            v-if="textareaLength < minTextareaRequired "
            class="text-xs text-gray-500"
          >
            Caracteres : {{ textareaLength }}
          </span>
          <span
            v-else
            class="block text-xs text-gray-500"
          >
            Restants : {{ remainingTextareaChars }}
          </span>
        </div>
        <button
          class="py-4 rounded-3xl w-full bg-blue-700 text-white bg-gradient-to-tr from-blue-700 to-blue-500 transition-all duration-[400ms] shadow-xl"
          :class="[!checkTextareaFilled || preparingIaCheckout ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:opacity-90 hover:cursor-pointer hover:shadow-none']"
          @click="checkUserStatus('ia')"
        >
          <span v-if="preparingIaCheckout">
            <LucideLoader class="animate-spin inline-block" :size="20" />
          </span>
          <span v-else>Envoyer !</span>
        </button>
      </div>
    </div>

    <div v-if="false && showAiPendingState" class="mt-8 p-5 rounded-3xl border-l-4 border-blue-700 bg-white">
      <h3 class="text-lg font-bold mb-3">
        Analyse sur mesure en cours
      </h3>
      <p class="text-sm text-gray-600">
        {{ aiLoadingMessage || 'Ton paiement a bien ete pris en compte. Nous generons actuellement ton analyse personnalisee.' }}
      </p>
      <div class="mt-4 flex items-center text-sm text-blue-700">
        <LucideLoader class="animate-spin inline-block mr-2" :size="18" />
        Requete en cours de traitement...
      </div>
    </div>

    <div v-if="false && showAiSyncingState" class="mt-8 p-5 rounded-3xl border-l-4 border-blue-700 bg-white">
      <h3 class="text-lg font-bold mb-3">
        Analyse sur mesure en cours de synchronisation
      </h3>
      <p class="text-sm text-gray-600">
        Ton paiement semble bien en cours de reconciliation avec ta session. Tes resultats restent accessibles et ton analyse devrait apparaitre ici sous peu.
      </p>
      <p class="mt-3 text-sm text-gray-600">
        Si rien ne s affiche apres quelques instants, recharge la page ou reviens depuis ton profil.
      </p>
    </div>

    <div v-if="false && showAiGeneratedState" class="mt-8 p-5 rounded-3xl border-l-4 border-green-700 bg-white">
      <h3 class="text-lg font-bold mb-3">
        Ton analyse sur mesure
      </h3>
      <div class="text-sm text-gray-700 whitespace-pre-line">
        {{ normalizedAiExchange.output }}
      </div>
    </div>

    <div v-if="false && showAiFailedState" class="mt-8 p-5 rounded-3xl border-l-4 border-red-700 bg-white">
      <h3 class="text-lg font-bold mb-3">
        Analyse sur mesure indisponible
      </h3>
      <p class="text-sm text-gray-600">
        Le paiement a bien été pris en compte, mais la génération de ton analyse a rencontré un problème temporaire.
      </p>
      <p class="mt-3 text-sm text-gray-600">
        Pas d'inquiétude : ton texte est bien conservé. Il s'agit probablement d'un problème réseau ou d'un service temporairement indisponible.
      </p>
      <p v-if="normalizedAiExchange.lastErrorMessage" class="mt-3 text-xs text-gray-500">
        Dernière erreur : {{ normalizedAiExchange.lastErrorMessage }}
      </p>
      <button
        class="mt-4 py-3 px-5 rounded-3xl bg-blue-700 text-white shadow-xl hover:shadow-none transition-shadow duration-300"
        @click="emit('retryIa')"
      >
        Relancer
      </button>
    </div>

    <!-- POPIN -->
    <Popin v-model="showPopin">
      <!-- Results -->
      <div v-if="popinType === 'results'" class="md:flex md:justify-between md:gap-5">
        <div class="flex-1 mb-6 border p-5 rounded-3xl md:mb-0">
          <h3 class="text-lg font-bold mb-5">
            <span class="block">Acces aux resultats</span>
            <span class="mr-1">1.99EUR</span>
            <span class="text-xs">(paiement unique)</span>
          </h3>
          <p class="mb-5 text-sm">
            En cliquant sur le bouton ci-dessous, tu seras redirige vers la page de paiement. Une fois ton paiement valide, tu auras un acces immediat a :
          </p>
          <ul class="list-disc list-inside mb-5">
            <li class="mb-1 text-sm">Tous les resultats detailles de ton questionnaire d'attachement</li>
            <li class="mb-1 text-sm">Y compris tes sous-profils anxieux et evitants</li>
            <li class="mb-1 text-sm">La repartition detaillee de tes declencheurs</li>
            <li class="mb-1 text-sm">Des conseils personnalises pour travailler sur tes mecanismes d'attachement</li>
            <li class="mb-1 text-sm"><strong>Un acces a vie</strong> aux resultats des futurs passages du questionnaire</li>
          </ul>

          <p v-if="errorMessage" class="mb-2 px-5 py-2 text-xs bg-red-600 text-white rounded-3xl">
            Une erreur est survenue : {{ errorMessage }}
          </p>

          <button
            class="py-4 rounded-3xl w-full bg-blue-700 text-white shadow-xl hover:shadow-none transition-shadow duration-300"
            @click="goToCheckout('questionnaire', 'attachment', 'results')"
          >
            <span v-if="checkoutType === 'results'">
              <LucideLoader class="animate-spin inline-block" :size="20" />
            </span>
            <span v-else>Debloquer mes resultats</span>
          </button>
        </div>
        <!-- membership V2-V3 uniquement -->
        <div v-if="false" class="flex-1 p-5 border rounded-3xl bg-gradient-to-tr from-yellow-700 to-yellow-200 text-black shadow-xl">
          <h3 class="text-lg font-bold">
            Abonnement Membership - 6.99EUR/mois
            <span class="text-xs">(annulable a tout moment)</span>
          </h3>
          <!-- tag : recommande. le parent a deja un degrade yellow. adapter les couleurs du tag -->
          <span class="inline-block text-xs px-2 py-1 rounded-full mb-2 bg-yellow-700 text-white">Recommande</span>

          <p class="mt-5 mb-5 text-sm">
            En souscrivant a notre abonnement, tu auras :
          </p>
          <ul class="list-disc list-inside mb-5">
            <li class="mb-1 text-sm">Un acces total (resultats detailles, sous profils, repartition des declencheurs, conseils personnalises)</li>
            <li class="mb-1 text-sm">L'acces aux analyses sur mesure personnalisees</li>
            <li class="mb-1 text-sm">Un acces total aux resultats de tous les questionnaires du site</li>
            <li class="mb-1 text-sm">Un acces total et prioritaire a tous les articles du site</li>
          </ul>

          <p v-if="errorMessage" class="mb-2 px-5 py-2 text-xs bg-red-600 text-white rounded-3xl">
            Une erreur est survenue : {{ errorMessage }}
          </p>

          <button
            class="py-4 rounded-3xl w-full bg-white text-blue-700 shadow-xl hover:shadow-none transition-shadow duration-300"
            @click="goToCheckout('questionnaire', 'attachment', 'membership')"
          >
            <span v-if="checkoutType === 'membership'">
              <LucideLoader class="animate-spin inline-block" :size="20" />
            </span>
            <span v-else>Je m'abonne !</span>
          </button>
        </div>
      </div>

      <!-- Ia  -->
      <div v-else class="md:flex md:justify-between md:gap-5">
        <div class="flex-1 mb-6 border p-5 rounded-3xl md:mb-0">
          <h3 class="text-lg font-bold mb-5">
            <span class="block">Analyse sur mesure</span>
            <span class="mr-1">4.99EUR</span>
            <span class="text-xs">(paiement unique)</span>
          </h3>
          <p class="mb-5 text-sm">
            En cliquant sur le bouton ci-dessous, tu seras redirige vers la page de paiement. Une fois ton paiement valide, tu auras un acces immediat a :
          </p>

          <ul class="list-disc text-sm pl-4 mb-5">
            <li v-if="!hasDetailedResultsAccess" class="mb-1">
              L'ensemble de tes resultats debloques
            </li>
            <li class="mb-1">Une analyse personnalisee de ta situation amoureuse actuelle basee sur tes resultats au questionnaire d'attachement</li>
            <li class="mb-1">Des conseils sur mesure pour avancer vers plus de securite dans ta relation actuelle</li>
            <li class="mb-1">Une grille de lecture et un plan d'action concret</li>
            <li class="mb-1 text-sm"><strong>Un acces immediat</strong> aux resultats detailles de cette session</li>
          </ul>

          <p v-if="errorMessage" class="mb-2 px-5 py-2 text-xs bg-red-600 text-white rounded-3xl">
            Une erreur est survenue : {{ errorMessage }}
          </p>

          <button
            class="py-4 rounded-3xl w-full bg-blue-700 text-white shadow-xl hover:shadow-none transition-shadow duration-300"
            @click="prepareIaCheckout"
          >
            <span v-if="preparingIaCheckout || checkoutType === 'ia'">
              <LucideLoader class="animate-spin inline-block" :size="20" />
            </span>
            <span v-else>Recevoir mon analyse personnalisee</span>
          </button>
        </div>

        <!-- membership V2-V3 uniquement -->
        <div v-if="false" class="flex-1 p-5 border rounded-3xl bg-gradient-to-tr from-yellow-700 to-yellow-200 text-black shadow-xl">
          <h3 class="text-lg font-bold">
            Abonnement Membership - 6.99EUR/mois
            <span class="text-xs">(annulable a tout moment)</span>
          </h3>
          <!-- tag : recommande. le parent a deja un degrade yellow. adapter les couleurs du tag -->
          <span class="inline-block text-xs px-2 py-1 rounded-full mb-2 bg-yellow-700 text-white">Recommande</span>

          <p class="mt-5 mb-5 text-sm">
            En souscrivant a notre abonnement, tu auras :
          </p>
          <ul class="list-disc list-inside mb-5">
            <li class="mb-1 text-sm">Un acces total (resultats detailles, sous profils, repartition des declencheurs, conseils personnalises)</li>
            <li class="mb-1 text-sm">L'acces aux analyses sur mesure personnalisees</li>
            <li class="mb-1 text-sm">Un acces total aux resultats de tous les questionnaires du site</li>
            <li class="mb-1 text-sm">Un acces total et prioritaire a tous les articles du site</li>
          </ul>

          <p v-if="errorMessage" class="mb-2 px-5 py-2 text-xs bg-red-600 text-white rounded-3xl">
            Une erreur est survenue : {{ errorMessage }}
          </p>

          <button
            class="py-4 rounded-3xl w-full bg-white text-blue-700 shadow-xl hover:shadow-none transition-shadow duration-300"
            @click="goToCheckout('questionnaire', 'attachment', 'membership')"
          >
            <span v-if="checkoutType === 'membership'">
              <LucideLoader class="animate-spin inline-block" :size="20" />
            </span>
            <span v-else>Je m'abonne !</span>
          </button>
        </div>
      </div>
    </Popin>
  </section>
</template>
