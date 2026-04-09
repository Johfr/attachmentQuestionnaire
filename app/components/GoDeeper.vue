<script setup lang="ts">
import { useBillingStore } from '~/stores/billing'
const billingStore = useBillingStore()
import type { EntitySubType, EntityType, AccessType } from '~/types/billing'
import Popin from '~/utils/Popin.vue'

const props = defineProps<{
  docId: string
  hasBasicAccess: boolean
  hasResultsAccess: boolean
  hasIaAccess: boolean
  hasMembershipAccess: boolean
  hasFormationAccess: boolean
  hasUsedIa: boolean
}>()

const loading = ref(false)
const errorMessage = ref('')
const hasDetailedResultsAccess = computed(() => {
  return (
    props.hasResultsAccess ||
    props.hasIaAccess ||
    props.hasMembershipAccess ||
    props.hasFormationAccess
  )
})

const checkUserStatus = (actionType: 'ia' | 'results') => {
  if (actionType === 'ia') {
    if (props.hasIaAccess || props.hasMembershipAccess || props.hasFormationAccess) {
      // accès direct à l'ia sans popin car membership
      alert('Accès à l\'IA') // à remplacer par l'appel direct à l'IA
    } else {
      // popin d'incitation à l'achat
      openPopin('ia')
    }
  } else if (actionType === 'results') {
    if (props.hasResultsAccess || props.hasMembershipAccess || props.hasFormationAccess) {
      // accès direct aux résultats sans popin
      openPopin('results')
    } else {
      // popin d'incitation à l'achat
      openPopin('results')
    }
  }
}

// const emit = defineEmits<{
//   (e: 'goToCheckout', payload: { type: 'questionnaire' | 'membership' | 'ia', questionnaireType?: string, key?: string }): void
// }>()

type PopinKey = 'results' | 'ia' | 'membership' | string
const showPopin = ref(false)
const togglePopin = () => {
  showPopin.value = !showPopin.value
}
const popinType = ref<PopinKey>('')
const openPopin = (key: PopinKey) => {
  // log event analytics ouverture popin avec clé
  togglePopin()
  
  popinType.value = key
}


const goToCheckout = async (entityType: EntityType, entitySubType: EntitySubType, accessType: AccessType) => {
  loading.value = true
  try {
    await billingStore.goToCheckout(entityType, entitySubType, accessType, 'v1', 'attachment-questionnaire', props.docId)
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Une erreur est survenue lors de la redirection vers le paiement.'
  } finally {
    loading.value = false
  }
}

// IA
const textarea = ref('')
const minTextareaRequired = 750
const checkTextareaFilled = computed(() => textarea.value.trim().length >= minTextareaRequired)
const textareaLength = computed(() => textarea.value.trim().length)

</script>

<template>  
  <section id="premium-zone" class="my-8 mb-3" >
    <h2 class="text-xl text-center font-bold my-5 md:text-2xl md:text-left">
      Aller plus loin
    </h2>
    
    <div class="md:flex md:items-start md:gap-8">
      <!-- Accès à tous les résultats -->
      <div
        v-if="!hasBasicAccess"
        data-testid="go-deeper-results-offer"
        class="p-5 rounded-3xl bg-blue-700 text-white bg-gradient-to-tr from-blue-700 to-blue-500 md:max-w-[48%] "
      >
        <div class="flex justify-between items-center mb-5 font-semibold tracking-[.13rem]">
          <h3 class="text-lg">
            Accès complets aux résultats
          </h3>
          <!-- <span class="text-xl">
            1.99€
          </span> -->
        </div>

        <p class="mb-2 text-sm">
          Débloque l'accès à :
        </p>
        <ul class="list-disc text-sm pl-4 mb-5">
          <li class="mb-1">
            Tes 2 sous profils : anxieux et évitants
          </li>
          <li class="mb-1">
            1 graphique polar avec la répartition de tes déclencheurs en %
          </li>
          <li class="mb-1">
            Tes 6 Déclencheurs anxieux
          </li>
          <li class="mb-1">
            Tes 5 Déclencheurs évitants
          </li>
          <li class="mb-1">
            Des conseils personnalisés ainsi que des recommandations pour travailler sur tes mécanismes d'attachement
          </li>
        </ul>
        <button
          class="py-4 rounded-3xl w-full bg-white text-blue-700 transition-all duration-[400ms] shadow-xl hover:bg-gray-200 hover:shadow-none"
          @click="openPopin('results')"
        >
          Débloquer !            
        </button>
      </div>
      
      <!-- Accès aux résultats et à l'ia -->
      <!-- {{ !hasUsedIa }}
      {{ (hasIaAccess || hasMembershipAccess || hasFormationAccess) }}
        {{ !hasUsedIa && (hasIaAccess || hasMembershipAccess || hasFormationAccess) }} -->
      <div
        v-if="!hasUsedIa"
        data-testid="go-deeper-ia-offer"
        class="mt-8 p-5 border-l-4 rounded-3xl md:m-0 bg-white md:max-w-[48%]"
      >
        <div class="md:flex md:justify-between md:items-center mb-5 font-semibold tracking-[.13rem]">
          <h3 class="text-md">
            Analyse sur mesure
          </h3>
          <!-- <span class="text-xl">
            4.99€ (tout inclus)
          </span> -->
        </div>

        <p class="mb-5 text-sm">
          Détaille ta situation amoureuse*, sois le plus honnête possible. Décris ta situation, tes doutes, tes envies et ton objectif et reçois :
        </p>
        
        <ul class="list-disc text-sm pl-4 mb-5">
          <li v-if="!hasDetailedResultsAccess" data-testid="go-deeper-ia-includes-results" class="mb-1">
            L'ensemble de tes résultats débloqués
          </li>
          <li class="mb-1">
            Une analyse personnalisée de tes résultats en fonction de ta situation amoureuse actuelle
          </li>
          <li class="mb-1">
            Une analyse détaillée de ta situation amoureuse
          </li>
          <li class="mb-1">
            Des conseils sur mesure pour avancer vers plus de sécurité dans ta relation actuelle
          </li>
          <li class="mb-1">
            Une grille de lecture et un plan d'action concret
          </li>
        </ul>
        <span class="text-xs text-gray-500">* Ne transmets aucunes données sensibles telles que nom, adresse, numéro de téléphone, etc.</span>

        <div class="mb-5">
          <textarea
            class="w-full h-60 p-3 rounded-lg border text-sm md:h-40" rows="4" placeholder="Parle-moi un peu de ta situation amoureuse actuelle... Sois le plus explicite et honnête possible pour que mon analyse soit la plus précise possible !"
            v-model="textarea"
          ></textarea>

          <span v-if="textareaLength < minTextareaRequired">
            Minimum : {{ minTextareaRequired - textareaLength }}
          </span>
          <span
            v-if="textareaLength < minTextareaRequired "
            class="text-xs text-gray-500"
          >
            Caractères : {{ textareaLength }}
          </span>
        </div>
        <button
          class="py-4 rounded-3xl w-full bg-blue-700 text-white bg-gradient-to-tr from-blue-700 to-blue-500 transition-all duration-[400ms] shadow-xl"
          :class="[!checkTextareaFilled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:opacity-90 hover:cursor-pointer hover:shadow-none']"
          @click="checkUserStatus('ia')"
        >
          Envoyer !
        </button>
      </div>
    </div>
    <!-- POPIN -->
    <Popin v-model="showPopin">
      <!-- Results -->
      <div v-if="popinType === 'results'" class="md:flex md:justify-between md:gap-5">
        <div class="flex-1 mb-6 border p-5 rounded-3xl md:mb-0">
          <h3 class="text-lg font-bold mb-5">
            <span class="block">Accès aux résultats</span>
            <span class="mr-1">1.99€</span>
            <span class="text-xs">(paiement unique)</span>
          </h3>
          <p class="mb-5 text-sm">
            En cliquant sur le bouton ci-dessous, tu seras redirigé vers la page de paiement. Une fois ton paiement validé, tu auras un accès immédiat à : 
          </p>
          <ul class="list-disc list-inside mb-5">
            <li class="mb-1 text-sm">Tous les résultats détaillés de ton questionnaire d'attachement</li>
            <li class="mb-1 text-sm">Y compris tes sous-profils anxieux et évitants</li>
            <li class="mb-1 text-sm">La répartition détaillée de tes déclencheurs</li>
            <li class="mb-1 text-sm">Des conseils personnalisés pour travailler sur tes mécanismes d'attachement</li>
            <li class="mb-1 text-sm"><strong>Un accès à vie</strong> aux futurs passages du questionnaire</li>
          </ul>

          <p v-if="errorMessage" class="mb-2 px-5 py-2 text-xs bg-red-600 text-white rounded-3xl">
            Une erreur est survenue : {{ errorMessage }}
          </p>
          
          <button
            class="py-4 rounded-3xl w-full bg-blue-700 text-white shadow-xl hover:shadow-none transition-shadow duration-300" @click="goToCheckout('questionnaire', 'attachment', 'results')"
            :class="[errorMessage ? 'hidden cursor-not-allowed opacity-50' : '']"
          >
            <span v-if="loading">
              <LucideLoader class="animate-spin inline-block" :size="20" />
            </span>
            <span v-else>Débloquer mes résultats</span>
          </button>
        </div>
        <!-- membership V2-V3 uniquement -->
        <div v-if="false" class="flex-1 p-5 border rounded-3xl bg-gradient-to-tr from-yellow-700 to-yellow-200 text-black shadow-xl">
          <h3 class="text-lg font-bold">
            Abonnement Membership - 6.99€/mois
            <span class="text-xs">(annulable à tout moment)</span>
          </h3>
          <!-- tag : recommandé. le parent a déjà un dégradé yellow. adapter les couleurs du tag -->
          <span class="inline-block text-xs px-2 py-1 rounded-full mb-2 bg-yellow-700 text-white">Recommandé</span>

          <p class="mt-5 mb-5 text-sm">
            En souscrivant à notre abonnement, tu auras :
          </p>
          <ul class="list-disc list-inside mb-5">
            <li class="mb-1 text-sm">Un accès total (résultats détaillés, sous profils, répartition des déclencheurs, conseils personnalisés)</li>
            <li class="mb-1 text-sm">L'accès aux analyses sur mesure personnalisées</li>
            <li class="mb-1 text-sm">Un accès total aux résultats de tous les questionnaires du site</li>
            <li class="mb-1 text-sm">Un accès total et prioritaire à tous les articles du site</li>
          </ul>

          <p v-if="errorMessage" class="mb-2 px-5 py-2 text-xs bg-red-600 text-white rounded-3xl">
            Une erreur est survenue : {{ errorMessage }}
          </p>

          <button
            class="py-4 rounded-3xl w-full bg-white text-blue-700 shadow-xl hover:shadow-none transition-shadow duration-300" @click="goToCheckout('questionnaire', 'attachment', 'membership')"
            :class="[errorMessage ? 'hidden cursor-not-allowed opacity-50' : '']"
          >
            <span v-if="loading">
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
            <span class="mr-1">4.99€</span>
            <span class="text-xs">(paiement unique)</span>
          </h3>
          <p class="mb-5 text-sm">
            En cliquant sur le bouton ci-dessous, tu seras redirigé vers la page de paiement. Une fois ton paiement validé, tu auras un accès immédiat à : 
          </p>
          
          <ul class="list-disc text-sm pl-4 mb-5">
            <li v-if="!hasResultsAccess" class="mb-1">
              L'ensemble de tes résultats débloqués
            </li>
            <li class="mb-1">Une analyse personnalisée de ta situation amoureuse actuelle basée sur tes résultats au questionnaire d'attachement</li>
            <li class="mb-1">Des conseils sur mesure pour avancer vers plus de sécurité dans ta relation actuelle</li>
              <li class="mb-1">Une grille de lecture et un plan d'action concret</li>
              <li class="mb-1 text-sm"><strong>Un accès à vie</strong> aux futurs passages du questionnaire</li>
          </ul>

          <p v-if="errorMessage" class="mb-2 px-5 py-2 text-xs bg-red-600 text-white rounded-3xl">
            Une erreur est survenue : {{ errorMessage }}
          </p>

          <button
            class="py-4 rounded-3xl w-full bg-blue-700 text-white shadow-xl hover:shadow-none transition-shadow duration-300" @click="goToCheckout('questionnaire', 'attachment', 'ia')"
            :class="[errorMessage ? 'hidden cursor-not-allowed opacity-50' : '']"
          >
            <span v-if="loading">
              <LucideLoader class="animate-spin inline-block" :size="20" />
            </span>
            <span v-else>Recevoir mon analyse personnalisée</span>
          </button>
        </div>

        <!-- membership V2-V3 uniquement -->
        <div v-if="false" class="flex-1 p-5 border rounded-3xl bg-gradient-to-tr from-yellow-700 to-yellow-200 text-black shadow-xl">
          <h3 class="text-lg font-bold">
            Abonnement Membership - 6.99€/mois
            <span class="text-xs">(annulable à tout moment)</span>
          </h3>
          <!-- tag : recommandé. le parent a déjà un dégradé yellow. adapter les couleurs du tag -->
          <span class="inline-block text-xs px-2 py-1 rounded-full mb-2 bg-yellow-700 text-white">Recommandé</span>

          <p class="mt-5 mb-5 text-sm">
            En souscrivant à notre abonnement, tu auras :
          </p>
          <ul class="list-disc list-inside mb-5">
            <li class="mb-1 text-sm">Un accès total (résultats détaillés, sous profils, répartition des déclencheurs, conseils personnalisés)</li>
            <li class="mb-1 text-sm">L'accès aux analyses sur mesure personnalisées</li>
            <li class="mb-1 text-sm">Un accès total aux résultats de tous les questionnaires du site</li>
            <li class="mb-1 text-sm">Un accès total et prioritaire à tous les articles du site</li>
          </ul>

          <p v-if="errorMessage" class="mb-2 px-5 py-2 text-xs bg-red-600 text-white rounded-3xl">
            Une erreur est survenue : {{ errorMessage }}
          </p>
          
          <button
            class="py-4 rounded-3xl w-full bg-white text-blue-700 shadow-xl hover:shadow-none transition-shadow duration-300" @click="goToCheckout('questionnaire', 'attachment', 'membership')"
            :class="[errorMessage ? 'hidden cursor-not-allowed opacity-50' : '']"
          >
            <span v-if="loading">
              <LucideLoader class="animate-spin inline-block" :size="20" />
            </span>
            <span v-else>Je m'abonne !</span>
          </button>
        </div>
      </div>
    </Popin>
  </section>
</template>
