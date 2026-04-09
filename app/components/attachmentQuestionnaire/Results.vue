<script setup lang="ts">
import type { Component } from 'vue'
import type {
  AttachmentQuestionnaireResults,
  DoughnutDataset,
  PolarTagDataItem,
  TagsResultsByDimension
} from '~/types/attachmentQuestionnaireResults'
import type { EntitySubType, EntityType, AccessType } from '~/types/billing'
import DoughnutChart from "~/components/attachmentQuestionnaire/DoughnutChart.vue"
import PolarChart from "~/components/attachmentQuestionnaire/PolarChart.vue"
import Accordeon from '~/utils/Accordeon.vue'
import { useBillingStore } from '~/stores/billing'
import Popin from '~/utils/Popin.vue'
import { getProfileLabel } from '~/utils/attachmentProfileTranslations'
import regulationProfilesData from '~/assets/data/regulationProfiles.json'
import globalProfilesData from '~/assets/data/globalProfiles.json'
// import Questionnaire from '~/layouts/questionnaire.vue'

const props = defineProps<{
  docId: string,
  sessionBillingInfo?: {
    hasPaidResults: boolean
    hasPaidIa: boolean
    hasPaidMembership: boolean
    hasPaidFormation: boolean
  }
  computedResults: AttachmentQuestionnaireResults
  tagsResults: TagsResultsByDimension
  tagData: PolarTagDataItem[]
  anxietyAverageScore: number
  avoidanceAverageScore: number
  anxietyDatasets: DoughnutDataset[]
  avoidanceDatasets: DoughnutDataset[]
}>()

// const questionnaireId = 'attachmentQuestionnaire' // à centraliser dans un fichier de constantes si besoin

const graphData = computed(() => props.computedResults)
const tagsResults = computed(() => props.tagsResults)
const tagData = computed(() => props.tagData)
const anxietyAverageScore = computed(() => props.anxietyAverageScore)
const avoidanceAverageScore = computed(() => props.avoidanceAverageScore)
const anxietyDatasets = computed(() => props.anxietyDatasets)
const avoidanceDatasets = computed(() => props.avoidanceDatasets)
const FALLBACK_PROFILE_KEY = 'notSignificant'
const attachmentProfiles = computed(() => {
  return graphData.value?.attachmentProfilesByDimension ?? {
    anxiety: FALLBACK_PROFILE_KEY,
    avoidance: FALLBACK_PROFILE_KEY,
    globalStyle: FALLBACK_PROFILE_KEY,
  }
})
// Billing access
// hasPaidResults and hasPaidIa are per-session: use the session's billingInfo (already loaded),
// NOT the global billing store (which would grant access to ALL sessions if any one was paid).
// hasPaidMembership and hasPaidFormation are user-level so the billing store remains correct.
const billingStore = useBillingStore()
const hasResultsAccess = computed(() => props.sessionBillingInfo?.hasPaidResults ?? false)
const hasIaAccess = computed(() => props.sessionBillingInfo?.hasPaidIa ?? false)
const hasMembershipAccess = computed(() => (props.sessionBillingInfo?.hasPaidMembership ?? false) || billingStore.hasPaidMembership)
const hasFormationAccess = computed(() => (props.sessionBillingInfo?.hasPaidFormation ?? false) || billingStore.hasPaidFormation)
// Access
const hasBasicAccess = computed(() => {
  return (
    hasResultsAccess.value ||
    hasIaAccess.value ||
    hasMembershipAccess.value ||
    hasFormationAccess.value
  )
})

const hasFullAccess = computed(() => {
  return (
    hasIaAccess.value ||
    hasMembershipAccess.value ||
    hasFormationAccess.value
  )
})

const anxietyLabel = ['Anxiety']
const avoidanceLabel = ['Avoidance']
const fallbackTagIcon = resolveComponent('LucideCircleHelp') as Component

const tagsIcons: Record<string, Component> = {
  distanceSilence: resolveComponent('LucideVolumeX') as Component,
  validationRequired: resolveComponent('LucideThumbsUp') as Component,
  quickRepair: resolveComponent('LucideWrench') as Component,
  proximityDiscomfort: resolveComponent('LucideAlertTriangle') as Component,
  conflict: resolveComponent('LucideZap') as Component,
  autonomyNeed: resolveComponent('LucideUserCheck') as Component,
  fearOfLoss: resolveComponent('LucideHeartCrack') as Component,
  overthinking: resolveComponent('LucideLoader2') as Component,
  emotionalContainment: resolveComponent('LucideBox') as Component,
  controlNeed: resolveComponent('LucideSliders') as Component,
  withdrawalUnderStress: resolveComponent('LucideCornerDownLeft') as Component
}

const profileIcons: Record<string, Component> = {
  globallySecure: resolveComponent('LucideShieldCheck') as Component,
  anxious: resolveComponent('LucideShieldAlert') as Component,
  avoidant: resolveComponent('LucideShieldX') as Component,
  disorganized: resolveComponent('LucideShieldOff') as Component,
  notSignificant: resolveComponent('LucideBadgeQuestionMark') as Component
}

const getProfileIcon = (profileKey: string) => profileIcons[profileKey] || fallbackTagIcon
const getTagIcon = (tagKey: string) => tagsIcons[tagKey] || fallbackTagIcon
const profileDimensions: Array<'anxiety' | 'avoidance'> = ['anxiety', 'avoidance']
const getSubProfile = (dimension: 'anxiety' | 'avoidance') => {
  return attachmentProfiles.value[dimension] ?? FALLBACK_PROFILE_KEY
}
const globalProfileKey = computed(() => attachmentProfiles.value.globalStyle ?? FALLBACK_PROFILE_KEY)

const profilExplanations = computed(() => {
  const explanations: Record<string, string> = {}

  globalProfilesData.globalProfiles.forEach(profile => {
    explanations[profile.key] = profile.explanation
  })

  regulationProfilesData.regulationProfiles.forEach(profile => {
    explanations[profile.key] = profile.explanation
  })

  return explanations
})

// ProfileExplanationKey est utilisé pour les dimensions et les tags
type ProfileExplanationKey = 'global' | 'anxiety' | 'avoidance' | string
type PopinKey = 'results' | 'ia' | 'membership' | string

const profileExplanationOpen = ref<Record<ProfileExplanationKey, boolean>>({
  global: false,
  anxiety: false,
  avoidance: false
})

const isProfileExplanationOpen = (key: ProfileExplanationKey) => {
  return profileExplanationOpen.value[key]
}

const toggleProfileExplanation = (key: ProfileExplanationKey) => {
  profileExplanationOpen.value[key] = !profileExplanationOpen.value[key]
}


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


// si le user est premium (membership ou formation) il a accès à tous les résultats et à l'ia. Le block d'achat de résultats ne doit plus apparaitre. En revanche le block d'utilisation de l'ia doit toujours apparaître afin qu'il puisse utiliser la fonctionnalité.
// une fois qu'il a utilisé l'ia en revanche le block doit disparaitre uniquement pour la session concernée.
// il me faut une condition qui vérifie que le user à utiliser l'ia ou pas. hasFullAccess ne peut pas être utilisé pour ça car il me faut différencier les accès résultats et ia. Je vais donc créer une nouvelle computed property hasUsedIa qui vérifie si la session a utilisé l'ia ou pas, et je vais l'utiliser pour afficher ou non le block d'ia.
// Si le user est membership ou formation, le block d'achat disparait. Le block ia reste. Au click sur "envoyer !" ce n'est pas la popin qui doit s'afficher mais directement l'envoi de la requête vers l'api openAi.
// En clair : membership ou formation = accès à tous les résultats + accès à l'ia sans popin. BLock résultat disparait, block ia reste. Si le user a déjà utilisé l'ia alors le block disparait et seule la réponse de l'ia doit rester.
const checkUserStatus = (actionType: 'ia' | 'results') => {
  if (actionType === 'ia') {
    if (hasIaAccess.value || hasMembershipAccess.value || hasFormationAccess.value) {
      // accès direct à l'ia sans popin car membership
      alert('Accès à l\'IA') // à remplacer par l'appel direct à l'IA
    } else {
      // popin d'incitation à l'achat
      openPopin('ia')
    }
  } else if (actionType === 'results') {
    if (hasResultsAccess.value || hasMembershipAccess.value || hasFormationAccess.value) {
      // accès direct aux résultats sans popin
      openPopin('results')
    } else {
      // popin d'incitation à l'achat
      openPopin('results')
    }
  }
}

const hasUsedIa = computed(() => {
  return props.sessionBillingInfo?.hasPaidIa ?? false
})

// IA
const textarea = ref('')
const minTextareaRequired = 750
const checkTextareaFilled = computed(() => textarea.value.trim().length >= minTextareaRequired)
const textareaLength = computed(() => textarea.value.trim().length)

/****** */
// BILLING 
/****** */
const billingAccessWarning = ref('')
try {
  await billingStore.checkUserPermissions()
} catch {
  billingAccessWarning.value = 'La verification de tes acces premium est temporairement indisponible. Tes resultats restent consultables.'
}
const loading = ref(false)
const errorMessage = ref('')
// goToCheckout('questionnaire', 'attachment', 'results', 'attachment-questionnaire', 'docId')
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
</script>

<template>
  <p v-if="billingAccessWarning" class="mb-4 text-xs text-amber-700 text-center">
    {{ billingAccessWarning }}
  </p>
  <p v-if="graphData.completionDate" class="sr-only">
    {{ graphData.completionDate }}
  </p>
  <div class="donuts-container flex justify-evenly bg-white py-8 rounded-3xl md:justify-center md:gap-20">
    <div class="w-[125px] h-[125px] md:w-[250px] md:h-[250px]">
      <DoughnutChart
        :labels="anxietyLabel"
        :datasets="anxietyDatasets"
        :legend="{ display: false }"
        :cutout="'80%'"
        :width="'125px'"
        :height="'125px'"
        :center-text="`Anxiety\n${anxietyAverageScore}%`"
        :center-text-font-size="14"
        :center-text-font-color="'#0369a1'" 
      />
    </div>
    <div class="w-[125px] h-[125px] md:w-[250px] md:h-[250px]">
      <DoughnutChart
        :labels="avoidanceLabel"
        :datasets="avoidanceDatasets"
        :legend="{ display: false }"
        :cutout="'80%'"
        :width="'125px'"
        :height="'125px'"
        :center-text="`Avoidance\n${avoidanceAverageScore}%`"
        :center-text-font-size="14"
        :center-text-font-color="'#be123c'" 
      />
    </div>
  </div>
  
  <section class="my-8">
    <h2 class="text-xl text-center font-bold my-5 md:text-2xl md:text-left">Tes profils d'attachement</h2>

    <div class="md:flex md:justify-start md:gap-4">
      <!-- Global profil -->
      <div 
        class="mb-3 bg-white p-5 rounded-3xl border-l-4 border-blue-700 md:flex-1 md:max-w-[48%]"
      >
        <h3 class="text-md mb-3 font-bold">
          <component :is="getProfileIcon(globalProfileKey)" :size="20" class="inline-block mr-2" />
          <!-- Style :  -->
          {{ getProfileLabel(globalProfileKey) }}
        </h3>
        <p
          class="max-h-36 overflow-hidden mb-3 text-sm text-gray-600 line-clamp-4"
          :class="{ 'max-h-full line-clamp-none': isProfileExplanationOpen('global') }"
        >
          {{ profilExplanations[globalProfileKey] ?? '' }}
        </p>
        <span class="block w-full p-3 text-right text-xs cursor-pointer" @click="toggleProfileExplanation('global')">
          {{ isProfileExplanationOpen('global') ? 'Réduire...' : 'Lire la suite...' }}          
        </span>
      </div>

      <!-- Sub profils -->
      <div
        v-for="dimension in profileDimensions"
        :key="dimension"
        class="flex-1 md:max-w-[48%]"
        >
        <!-- a rajouter si on ne veut pas afficher les sous profils non significatifs -->
        <!-- :class="[(getSubProfile(dimension)) !== 'notSignificant' ? 'flex-1 md:max-w-[48%]' : '']" -->
        <!-- v-if="(getSubProfile(dimension)) !== 'notSignificant'" -->
        <div class="relative">
          <div
            class="mb-3 p-5 rounded-3xl"
            :class="[ dimension === 'anxiety' ? 'bg-primary' : 'bg-secondary', !hasBasicAccess ? 'opacity-50 blur-[5px]' : '' ]"
          >
            <h3 class="text-md mb-3 font-bold">
              <component :is="getProfileIcon(getSubProfile(dimension))" :size="20" class="inline-block mr-2" />
              Sous profil :
              <span v-if="!hasBasicAccess">
                Débloque l'accès
              </span>
              <span v-else>
                {{ getProfileLabel(getSubProfile(dimension)) }}
              </span>
            </h3>
            <p
              class="max-h-36 overflow-hidden mb-3 text-sm text-gray-600 line-clamp-4"
              :class="{ 'max-h-full line-clamp-none': isProfileExplanationOpen(dimension) }"
            >
              <span v-if="!hasBasicAccess">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quaerat reiciendis quos temporibus voluptatem repudiandae! Enim, aspernatur cupiditate optio possimus necessitatibus dicta iste laborum eligendi perferendis. Veniam quod neque ullam ducimus!
              </span>
              <span v-else>
                {{ profilExplanations[getSubProfile(dimension)] }}
              </span>
            </p>
            <span class="block w-full p-3 text-right text-xs cursor-pointer" @click="toggleProfileExplanation(dimension)">
              {{ isProfileExplanationOpen(dimension) ? 'Réduire...' : 'Lire la suite...' }}
            </span>
          </div>

          <!-- Overlay de paiement non premium -->
          <div
            v-if="!hasBasicAccess"
            class="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center rounded-3xl cursor-pointer"
            @click.prevent.stop=""
          >
            <NuxtLink :to="'#premiumZone'">
              <div class="text-center">
                <p class="mb-2 font-bold text-gray-700 opacity-35">
                  Débloque l'accès à tes sous profils anxieux et évitants
                  <LucideCornerRightDown :size="24" class="inline-block ml-2 text-gray-700" />
                </p>
                <!-- <button class="px-4 py-2 bg-blue-700 text-white rounded-3xl">Débloquer !</button> -->
              </div>
            </NuxtLink>
          </div>          
        </div>
      </div>
    </div>
  </section>

  <!-- Explication des résultats -->
  <div class="mb-3 bg-white rounded-3xl border-l-4 text-gray-800 border-gray-200 md:flex-1 md:max-w-[340%]">
    <Accordeon title="Explication des résultats">
      <div class="md:flex md:flex-row-reverse md:justify-between md:items-center">
        <div class="md:max-w-[48%]">
          <p class="mb-3 text-sm">
            Le type global repose sur deux dimensions principales : l'anxiété et l'évitement. Les réponses au questionnaire permettent d'évaluer le niveau de chacun de ces deux axes, puis de situer le profil général de la personne parmi les grands styles d'attachement : sécure, anxieux, évitant ou désorganisé, comme l'illustre le graphique ci-dessous.
          </p>
          
          <p class="mb-3 text-sm">
            A partir de là on peut définir :
          </p>

          <ul>
            <li class="mb-1 pl-3 text-sm list-disc list-inside">
              Sécure = anxiété low + évitement low
            </li>
            <li class="mb-1 pl-3 text-sm list-disc list-inside">
              Anxieux = anxiété high + évitement low
            </li>
            <li class="mb-1 pl-3 text-sm list-disc list-inside">
              Évitant = anxiété low + évitement high
            </li>
            <li class="mb-1 pl-3 text-sm list-disc list-inside">
              Désorganisé = anxiété high + évitement high
            </li>
          </ul>
        </div>

        <img
          src="~/assets/img/dimension-anxiety-avoidance-graphique2.png"
          alt="Graphique des dimensions anxiété et évitement"
          class="md:max-w-[48%] h-full my-5 md:my-0 rounded-lg border md:hover:shadow-lg md:hover:scale-[2.1] md:hover:z-10 md:hover:relative md:hover:left-[26%] transition-transform duration-700 "
        />
      </div>
        
      <div class="my-8">
        <p class="mt-3 mb-3 text-sm">
          Ce profil global ne suffit pas toujours à décrire précisément le fonctionnement relationnel d'un individu. C'est pourquoi le questionnaire prend aussi en compte des <strong>déclencheurs spécifiques</strong> : 5 liés à l'anxiété et 5 liés à l'évitement. Ce sont ces déclencheurs, ainsi que leurs associations qui permettent d'identifier des sous-profils plus nuancés, comme par exemple un profil anxieux-régulé ou évitant-adaptatif.
        </p>
        
        <p class="mt-3 mb-3 text-sm">
          L'objectif principal n'est donc pas de coller une étiquette mais de mieux comprendre ce qui active concrètement le système d'attachement. 
        </p>
          
        <p class="mt-3 mb-3 text-sm">
          Une personne globalement sécure peut d'ailleurs présenter des scores modérés sur certains déclencheurs, ce qui montre que certaines situations la touchent malgré tout. Lire ses résultats de cette manière permet surtout d'identifier les mécanismes à travailler pour gagner en stabilité relationnelle.
        </p>
      </div>

      <div class="bg-white mt-8 p-5 rounded-3xl border-l-4 border-gray-500 md:mt-5">
        <LucideLightbulb :size="20" class="inline-block mr-2" />
        <strong>Note importante</strong>
        <p class="mt-3 text-sm text-gray-600">
          N'oubliez pas que votre profil d'attachement peut évoluer avec le temps et les expériences. Les résultats de ce questionnaire sont une photographie de votre état actuel, mais avec du travail sur soi et des expériences relationnelles positives, il est tout à fait possible de développer un attachement plus sécure.
        </p>
      </div>
    </Accordeon>
  </div>

  <!-- Polar chart -->
  <section class="my-8" v-if="hasBasicAccess">
    <h2 class="text-xl text-center font-bold my-5 md:text-2xl md:text-left">Répartition détaillée des déclencheurs</h2>
    <div class="my-12 justify-center md:w-144 md:h-144 mx-auto flex">
      <PolarChart :tags="tagData" :width="'600px'" :height="'600px'" />
    </div>
  </section>

  <!-- Déclencheurs anxieux / Déclencheurs évitants -->
  <section class="my-8">
    <div v-for="dimension in ['anxiety', 'avoidance']" :key="dimension">
      <h2 class="text-xl text-center font-bold my-5 md:text-2xl md:text-left">
        {{ dimension === 'anxiety' ? 'Déclencheurs anxieux' : 'Déclencheurs évitants' }}
      </h2>

      <!-- Déclencheurs -->
      <div class="md:flex md:flex-wrap md:justify-center md:gap-4">
        <div
          v-for="(tag, tagId) in tagsResults[dimension as 'anxiety' | 'avoidance']"
          :key="tag.label"
          class="max-h-[60px] overflow-hidden mb-3 bg-white p-5 border-l-4 rounded-3xl md:w-[48%] md:max-h-[100px]"
          :class="[
            dimension === 'anxiety' ?  'border-primary' : 'border-secondary', 
            {'max-h-full md:max-h-full': isProfileExplanationOpen(tag.trigger)},
            { 'relative h-[100px]': !hasBasicAccess && tagId != 0 }
          ]"
        >
          <div
            class="flex justify-between"
            @click.prevent.stop="toggleProfileExplanation(tag.trigger)"
            :class="[!hasBasicAccess && tagId != 0 ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer']"
            :title="isProfileExplanationOpen(tag.trigger) ? 'Réduire' : 'Déplier'"
          >
            <p :class="tag.regulationLevel === 'high' ? 'text-red-600' : tag.regulationLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'" class="p-1 rounded-md text-xs">
              <LucideMinusCircle :size="14" class="inline-block mr-1" v-if="isProfileExplanationOpen(tag.trigger)"/>
              <LucidePlusCircle :size="14" class="inline-block mr-1" v-else/>
              Trigger : {{ tag.tag }}
            </p>
            <p class="text-white p-1 rounded-md text-xs" :class="tag.regulationLevel === 'high' ? 'bg-red-600' : tag.regulationLevel === 'medium' ? 'bg-yellow-600' : 'bg-green-600'">
              {{ tag.regulationLevel }}
            </p>
          </div>

          <div v-if="hasBasicAccess || (!hasBasicAccess && tagId === 0)">
            <h3
              class="text-md font-bold mt-3 mb-5 cursor-pointer"
              @click.prevent.stop="toggleProfileExplanation(tag.trigger)"
            >
              <component :is="getTagIcon(tag.key)" :size="20" class="inline-block mr-2" />
              <!-- {{ tag.tag }} :  -->
              {{ tag.label }}
            </h3>

            <p class="mb-3 text-sm text-gray-600">
              <strong>Indicateur :</strong>
              {{ tag.indicator }}
            </p>
            
            <p class="text-sm text-gray-600">
              {{ tag.trigger }}
            </p>
            
            <div class="bg-white p-5 rounded-3xl md:flex-1">
              <LucideUserCircle :size="20" class="inline-block mr-2" />
              <strong>Ce genre de profil :</strong>
              <ul
                class="pl-5 max-h-16 overflow-hidden text-sm text-gray-600 line-clamp-2"
                :class="{ 'max-h-full line-clamp-none md:max-h-full': isProfileExplanationOpen(tag.label) }"
              >
                <li
                  v-for="(behavior, index) in tag.associatedBehaviors"
                  :key="index"
                  class="mb-3 text-sm text-gray-600 list-disc list-inside first-letter:uppercase"
                >
                  {{ behavior }}
                </li>
              </ul>
              <p class="block w-full p-3 text-right text-xs cursor-pointer" @click="toggleProfileExplanation(tag.label)">
                {{ isProfileExplanationOpen(tag.label) ? 'Réduire...' : 'Lire la suite...' }}
              </p>
            </div>

            <p class=" text-sm text-gray-600">
              <strong>Te concernant : </strong>{{ tag.outputText }}
            </p>
            
            <div class="bg-white p-5 rounded-3xl md:flex-1">
              <LucideLightbulb :size="20" class="inline-block mr-2" />
              <strong>Mon conseil</strong>
              <ul
                class="pl-5 max-h-16 overflow-hidden text-sm text-gray-600 line-clamp-2"
                :class="{ 'max-h-full line-clamp-none': isProfileExplanationOpen(tag.key) }"
              >
                <li
                  v-for="(advice, index) in tag.advices"
                  :key="index"
                  class="mb-3 text-sm text-gray-600 list-disc list-inside first-letter:uppercase"
                >
                  {{ advice }}
                </li>
              </ul>
              <p class="block w-full p-3 text-right text-xs cursor-pointer" @click="toggleProfileExplanation(tag.key)">
                {{ isProfileExplanationOpen(tag.key) ? 'Réduire...' : 'Lire la suite...' }}
              </p>
            </div>
          </div>

          <!-- Overlay de paiement non premium -->
          <div
            v-if="!hasBasicAccess && tagId != 0"
            class="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center rounded-3xl cursor-pointer"
            @click.prevent.stop=""
          >
            <NuxtLink :to="'#premiumZone'">
              <div class="text-sm text-center md:text-md">
                <p class="mb-2 font-bold text-gray-700 opacity-35">
                  Débloque l'accès à ce résultat
                  <LucideCornerRightDown :size="24" class="inline-block ml-2 text-gray-700" />
                </p>
                <!-- <button class="px-4 py-2 bg-blue-700 text-white rounded-3xl">Débloquer !</button> -->
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Go deeper -->
   <section id="premiumZone" class="my-8 mb-3" >
      <h2 class="text-xl text-center font-bold my-5 md:text-2xl md:text-left">
        Aller plus loin
      </h2>
      
      <div class="md:flex md:items-start md:gap-8">
        <!-- Accès à tous les résultats -->
        <div
          v-if="!hasBasicAccess"
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
            <li v-if="!hasResultsAccess" class="mb-1">
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
              <span class="mr-1">5.99€</span>
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
