<script setup lang="ts">
import type { Component } from 'vue'
import type {
  AttachmentQuestionnaireResults,
  DoughnutDataset,
  PolarTagDataItem,
  TagsResultsByDimension
} from '~/types/attachmentQuestionnaireResults'
import type { AiExchange } from '~/types/questionnaireSessions'
import DoughnutChart from '~/components/attachmentQuestionnaire/DoughnutChart.vue'
import PolarChart from '~/components/attachmentQuestionnaire/PolarChart.vue'
import GoDeeper from '~/components/GoDeeper.vue'
import Accordeon from '~/utils/Accordeon.vue'
import { useBillingStore } from '~/stores/billing'
import { useAuthStore } from '~/stores/auth'
import { getProfileLabel } from '~/utils/attachmentProfileTranslations'
import { normalizeAiExchange } from '~/utils/aiExchange'
import regulationProfilesData from '~/assets/data/regulationProfiles.json'
import globalProfilesData from '~/assets/data/globalProfiles.json'

const props = defineProps<{
  docId: string,
  sessionBillingInfo?: {
    hasPaidResults: boolean
    hasPaidIa: boolean
    hasPaidMembership: boolean
    hasPaidFormation: boolean
  }
  computedResults: AttachmentQuestionnaireResults
  aiExchange?: AiExchange | null
  tagsResults: TagsResultsByDimension
  tagData: PolarTagDataItem[]
  anxietyAverageScore: number
  avoidanceAverageScore: number
  anxietyDatasets: DoughnutDataset[]
  avoidanceDatasets: DoughnutDataset[]
  isAiLoading?: boolean
  aiLoadingMessage?: string
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  (e: 'retryIa'): void
  (e: 'forceRegenerateIa'): void
}>()

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

const billingStore = useBillingStore()
const authStore = useAuthStore()
const hasResultsAccess = computed(() => props.sessionBillingInfo?.hasPaidResults ?? false)
const hasIaAccess = computed(() => props.sessionBillingInfo?.hasPaidIa ?? false)
const hasMembershipAccess = computed(() => (props.sessionBillingInfo?.hasPaidMembership ?? false) || billingStore.hasPaidMembership)
const hasFormationAccess = computed(() => (props.sessionBillingInfo?.hasPaidFormation ?? false) || billingStore.hasPaidFormation)

const hasBasicAccess = computed(() => {
  return (
    hasResultsAccess.value ||
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

type ProfileExplanationKey = 'global' | 'anxiety' | 'avoidance' | string
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

const hasUsedIa = computed(() => {
  return props.sessionBillingInfo?.hasPaidIa ?? false
})
const aiExchange = computed(() => normalizeAiExchange(props.aiExchange))

const billingAccessWarning = ref('')
try {
  await billingStore.checkUserPermissions()
} catch {
  billingAccessWarning.value = 'La verification de tes acces premium est temporairement indisponible. Tes resultats restent consultables.'
}

const scrollToPremiumZone = () => {
  if (!import.meta.client) return

  document.getElementById('premium-zone')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}
</script>

<template>
  <p v-if="billingAccessWarning" class="mb-4 text-xs text-center text-theme-muted">
    {{ billingAccessWarning }}
  </p>
  <p v-if="graphData.completionDate" class="sr-only">
    {{ graphData.completionDate }}
  </p>
  <div class="donuts-container flex justify-evenly rounded-3xl bg-theme-surfaceLinkCard py-8 md:justify-center md:gap-20">
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
        :center-text-font-color="'var(--results-donut-anxiety-text)'"
        :segment-border-color="'var(--results-donut-track)'"
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
        :center-text-font-color="'var(--results-donut-avoidance-text)'"
        :segment-border-color="'var(--results-donut-track)'"
      />
    </div>
  </div>

  <section class="my-8">
    <h2 class="text-xl text-center font-bold my-5 md:text-2xl md:text-left text-theme-text">
      Tes profils d'attachement
    </h2>

    <div class="md:flex md:justify-start md:gap-4">
      <div class="mb-3 rounded-3xl bg-theme-surfaceResultsGlobalProfile p-5 md:flex-1 md:max-w-[48%]">
        <h3 class="text-md mb-3 font-bold text-theme-text">
          <component :is="getProfileIcon(globalProfileKey)" :size="20" class="inline-block mr-2" />
          {{ getProfileLabel(globalProfileKey) }}
        </h3>
        <p
          class="max-h-36 overflow-hidden mb-3 text-sm text-theme-muted line-clamp-4"
          :class="{ 'max-h-full line-clamp-none': isProfileExplanationOpen('global') }"
        >
          {{ profilExplanations[globalProfileKey] ?? '' }}
        </p>
        <span class="block w-full p-3 text-right text-xs cursor-pointer text-theme-button" @click="toggleProfileExplanation('global')">
          {{ isProfileExplanationOpen('global') ? 'Réduire...' : 'Lire la suite...' }}
        </span>
      </div>

      <div
        v-for="dimension in profileDimensions"
        :key="dimension"
        class="flex-1 md:max-w-[48%]"
      >
        <div class="relative">
          <div
            class="mb-3 rounded-3xl p-5 text-theme-text"
            :class="[
              dimension === 'anxiety' ? 'bg-theme-resultsSubprofileAnxietyBg' : 'bg-theme-resultsSubprofileAvoidanceBg',
              !hasBasicAccess ? 'opacity-50 blur-[5px]' : ''
            ]"
          >
            <h3 class="text-md mb-3 font-bold text-theme-text">
              <component :is="getProfileIcon(getSubProfile(dimension))" :size="20" class="inline-block mr-2" />
              Sous profil :
              <span v-if="!hasBasicAccess">
                Debloque l'acces
              </span>
              <span v-else>
                {{ getProfileLabel(getSubProfile(dimension)) }}
              </span>
            </h3>
            <p
              class="max-h-36 overflow-hidden mb-3 text-sm text-theme-muted line-clamp-4"
              :class="{ 'max-h-full line-clamp-none': isProfileExplanationOpen(dimension) }"
            >
              <span v-if="!hasBasicAccess">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quaerat reiciendis quos temporibus voluptatem repudiandae! Enim, aspernatur cupiditate optio possimus necessitatibus dicta iste laborum eligendi perferendis. Veniam quod neque ullam ducimus!
              </span>
              <span v-else>
                {{ profilExplanations[getSubProfile(dimension)] }}
              </span>
            </p>
            <span class="block w-full p-3 text-right text-xs cursor-pointer text-theme-button" @click="toggleProfileExplanation(dimension)">
              {{ isProfileExplanationOpen(dimension) ? 'Réduire...' : 'Lire la suite...' }}
            </span>
          </div>

          <div
            v-if="!hasBasicAccess"
            class="absolute inset-0 flex cursor-pointer items-center justify-center rounded-3xl bg-theme-resultsOverlay backdrop-blur-sm"
            @click.prevent.stop=""
          >
            <button type="button" @click="scrollToPremiumZone">
              <div class="text-center">
                <p class="mb-2 font-bold text-theme-text opacity-35">
                  Debloque l'acces a tes sous profils anxieux et evitants
                  <LucideCornerRightDown :size="24" class="inline-block ml-2 text-theme-text" />
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="mb-3 rounded-3xl border-l-4 border-l-theme-button bg-theme-surfaceStaticCard text-theme-text md:flex-1 md:max-w-[340%]">
    <Accordeon title="Explication des resultats">
      <div class="md:flex md:flex-row-reverse md:justify-between md:items-center">
        <div class="md:max-w-[48%]">
          <p class="mb-3 text-sm text-theme-muted">
            Le type global repose sur deux dimensions principales : l'anxiete et l'evitement. Les reponses au questionnaire permettent d'evaluer le niveau de chacun de ces deux axes, puis de situer le profil general de la personne parmi les grands styles d'attachement : secure, anxieux, evitant ou desorganise, comme l'illustre le graphique ci-dessous.
          </p>

          <p class="mb-3 text-sm text-theme-muted">
            A partir de la on peut definir :
          </p>

          <ul>
            <li class="mb-1 pl-3 text-sm list-disc list-inside">
              Secure = anxiete low + evitement low
            </li>
            <li class="mb-1 pl-3 text-sm list-disc list-inside">
              Anxieux = anxiete high + evitement low
            </li>
            <li class="mb-1 pl-3 text-sm list-disc list-inside">
              Evitant = anxiete low + evitement high
            </li>
            <li class="mb-1 pl-3 text-sm list-disc list-inside">
              Desorganise = anxiete high + evitement high
            </li>
          </ul>
        </div>

        <img
          src="~/assets/img/dimension-anxiety-avoidance-graphique2.png"
          alt="Graphique des dimensions anxiete et evitement"
          class="md:max-w-[48%] h-full my-5 md:my-0 rounded-lg border md:hover:shadow-lg md:hover:scale-[2.1] md:hover:z-10 md:hover:relative md:hover:left-[26%] transition-transform duration-700 "
        />
      </div>

      <div class="my-8">
        <p class="mt-3 mb-3 text-sm text-theme-muted">
          Ce profil global ne suffit pas toujours a decrire precisement le fonctionnement relationnel d'un individu. C'est pourquoi le questionnaire prend aussi en compte des <strong>declencheurs specifiques</strong> : 5 lies a l'anxiete et 5 lies a l'evitement.
        </p>

        <p class="mt-3 mb-3 text-sm text-theme-muted">
          L'objectif principal n'est donc pas de coller une etiquette mais de mieux comprendre ce qui active concretement le systeme d'attachement.
        </p>

        <p class="mt-3 mb-3 text-sm text-theme-muted">
          Une personne globalement secure peut d'ailleurs presenter des scores moderes sur certains declencheurs, ce qui montre que certaines situations la touchent malgre tout.
        </p>
      </div>

      <div class="mt-8 rounded-3xl border-l-4 border-theme-border bg-theme-surfaceStaticCard p-5 md:mt-5">
        <LucideLightbulb :size="20" class="inline-block mr-2" />
        <strong>Note importante</strong>
        <p class="mt-3 text-sm text-theme-muted">
          N'oubliez pas que votre profil d'attachement peut evoluer avec le temps et les experiences. Les resultats de ce questionnaire sont une photographie de votre etat actuel.
        </p>
      </div>
    </Accordeon>
  </div>

  <section v-if="hasBasicAccess" class="my-8">
    <h2 class="text-xl text-center font-bold my-5 md:text-2xl md:text-left text-theme-text">Repartition detaillee des declencheurs</h2>
    <div class="my-12 justify-center md:w-144 md:h-144 mx-auto flex">
      <PolarChart :tags="tagData" :width="'600px'" :height="'600px'" />
    </div>
  </section>

  <section class="my-8">
    <div v-for="dimension in ['anxiety', 'avoidance']" :key="dimension">
      <h2 class="text-xl text-center font-bold my-5 md:text-2xl md:text-left text-theme-text">
        {{ dimension === 'anxiety' ? 'Declencheurs anxieux' : 'Declencheurs evitants' }}
      </h2>

      <div class="md:flex md:flex-wrap md:justify-center md:gap-4">
        <div
          v-for="(tag, tagId) in tagsResults[dimension as 'anxiety' | 'avoidance']"
          :key="tag.label"
          :data-testid="`trigger-card-${tag.key}`"
          class="mb-3 max-h-[60px] overflow-hidden rounded-3xl border-l-4 bg-theme-resultsSurface p-5 text-theme-text md:max-h-[100px] md:w-[48%]"
          :class="[
            dimension === 'anxiety' ? 'border-l-theme-resultsTriggerAnxietyBorder' : 'border-l-theme-resultsTriggerAvoidanceBorder',
            { 'max-h-full md:max-h-full': isProfileExplanationOpen(tag.trigger) },
            { 'relative h-[100px]': !hasBasicAccess && tagId != 0 }
          ]"
        >
          <div
            class="flex justify-between"
            :class="[!hasBasicAccess && tagId != 0 ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer']"
            :title="isProfileExplanationOpen(tag.trigger) ? 'Réduire' : 'Deplier'"
            @click.prevent.stop="toggleProfileExplanation(tag.trigger)"
          >
            <p
              class="p-1 rounded-md text-xs"
              :class="[
                tag.regulationLevel === 'high'
                  ? 'text-theme-resultsTriggerHighText'
                  : tag.regulationLevel === 'medium'
                    ? 'text-theme-resultsTriggerMediumText'
                    : 'text-theme-resultsTriggerLowText'
              ]"
            >
              <LucideMinusCircle v-if="isProfileExplanationOpen(tag.trigger)" :size="14" class="inline-block mr-1" />
              <LucidePlusCircle v-else :size="14" class="inline-block mr-1" />
              Trigger : {{ tag.tag }}
            </p>
            <p
              class="text-white p-1 rounded-md text-xs"
              :class="[
                tag.regulationLevel === 'high'
                  ? 'bg-theme-resultsTriggerHighBg'
                  : tag.regulationLevel === 'medium'
                    ? 'bg-theme-resultsTriggerMediumBg'
                    : 'bg-theme-resultsTriggerLowBg'
              ]"
            >
              {{ tag.regulationLevel }}
            </p>
          </div>

          <div v-if="hasBasicAccess || (!hasBasicAccess && tagId === 0)">
            <h3
              class="text-md font-bold mt-3 mb-5 cursor-pointer text-theme-text"
              @click.prevent.stop="toggleProfileExplanation(tag.trigger)"
            >
              <component :is="getTagIcon(tag.key)" :size="20" class="inline-block mr-2" />
              {{ tag.label }}
            </h3>

            <p class="mb-3 text-sm text-theme-muted">
              <strong>Indicateur :</strong>
              {{ tag.indicator }}
            </p>

            <p class="text-sm text-theme-muted">
              {{ tag.trigger }}
            </p>

            <div class="rounded-3xl p-5 md:flex-1">
              <LucideUserCircle :size="20" class="inline-block mr-2" />
              <strong>Ce genre de profil :</strong>
              <ul
                class="pl-5 max-h-16 overflow-hidden text-sm text-theme-muted line-clamp-2"
                :class="{ 'max-h-full line-clamp-none md:max-h-full': isProfileExplanationOpen(tag.label) }"
              >
                <li
                  v-for="(behavior, index) in tag.associatedBehaviors"
                  :key="index"
                  class="mb-3 text-sm text-theme-muted list-disc list-inside first-letter:uppercase"
                >
                  {{ behavior }}
                </li>
              </ul>
              <p
                :data-testid="`trigger-behaviors-toggle-${tag.key}`"
                class="block w-full p-3 text-right text-xs cursor-pointer text-theme-button"
                @click="toggleProfileExplanation(tag.label)"
              >
                {{ isProfileExplanationOpen(tag.label) ? 'Réduire...' : 'Lire la suite...' }}
              </p>
            </div>

            <p class="text-sm text-theme-muted">
              <strong>Te concernant : </strong>{{ tag.outputText }}
            </p>

            <div class="rounded-3xl p-5 md:flex-1">
              <LucideLightbulb :size="20" class="inline-block mr-2" />
              <strong>Mon conseil</strong>
              <ul
                class="pl-5 max-h-16 overflow-hidden text-sm text-theme-muted line-clamp-2"
                :class="{ 'max-h-full line-clamp-none': isProfileExplanationOpen(tag.key) }"
              >
                <li
                  v-for="(advice, index) in tag.advices"
                  :key="index"
                  class="mb-3 text-sm text-theme-muted list-disc list-inside first-letter:uppercase"
                >
                  {{ advice }}
                </li>
              </ul>
              <p
                :data-testid="`trigger-advices-toggle-${tag.key}`"
                class="block w-full p-3 text-right text-xs cursor-pointer text-theme-button"
                @click="toggleProfileExplanation(tag.key)"
              >
                {{ isProfileExplanationOpen(tag.key) ? 'Réduire...' : 'Lire la suite...' }}
              </p>
            </div>
          </div>

          <div
            v-if="!hasBasicAccess && tagId != 0"
            class="absolute inset-0 flex cursor-pointer items-center justify-center rounded-3xl bg-theme-resultsOverlay backdrop-blur-sm"
            @click.prevent.stop=""
          >
            <button type="button" @click="scrollToPremiumZone">
              <div class="text-sm text-center md:text-md">
                <p class="mb-2 font-bold text-theme-text opacity-35">
                  Debloque l'acces a ce resultat
                  <LucideCornerRightDown :size="24" class="inline-block ml-2 text-theme-text" />
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <!-- GoDeeper -->
  <GoDeeper
    :doc-id="docId"
    :has-basic-access="hasBasicAccess"
    :has-results-access="hasResultsAccess"
    :has-ia-access="hasIaAccess"
    :has-membership-access="hasMembershipAccess"
    :has-formation-access="hasFormationAccess"
    :has-used-ia="hasUsedIa"
    :ai-exchange="aiExchange"
    :is-ai-loading="isAiLoading"
    :ai-loading-message="aiLoadingMessage"
    :is-admin="props.isAdmin ?? authStore.isAdmin"
    @retry-ia="emit('retryIa')"
    @force-regenerate-ia="emit('forceRegenerateIa')"
  />
</template>
