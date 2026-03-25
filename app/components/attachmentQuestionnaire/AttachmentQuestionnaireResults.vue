<script setup lang="ts">
import type { Component } from 'vue'
import type {
  AttachmentQuestionnaireResults,
  DoughnutDataset,
  PolarTagDataItem,
  TagsResultsByDimension
} from '~/types/attachmentQuestionnaireResults'
import DoughnutChart from "~/components/attachmentQuestionnaire/DoughnutChart.vue"
import PolarChart from "~/components/attachmentQuestionnaire/PolarChart.vue"
import regulationProfilesData from '~/assets/data/regulationProfiles.json'
import globalProfilesData from '~/assets/data/globalProfiles.json'
import Accordeon from '~/utils/Accordeon.vue'

const props = defineProps<{
  computedResults: AttachmentQuestionnaireResults
  tagsResults: TagsResultsByDimension
  tagData: PolarTagDataItem[]
  anxietyAverageScore: number
  avoidanceAverageScore: number
  anxietyDatasets: DoughnutDataset[]
  avoidanceDatasets: DoughnutDataset[]
}>()

const graphData = computed(() => props.computedResults)
const tagsResults = computed(() => props.tagsResults)
const tagData = computed(() => props.tagData)
const anxietyAverageScore = computed(() => props.anxietyAverageScore)
const avoidanceAverageScore = computed(() => props.avoidanceAverageScore)
const anxietyDatasets = computed(() => props.anxietyDatasets)
const avoidanceDatasets = computed(() => props.avoidanceDatasets)
// const hasPremiumResults = computed(() => {
//   return false
//   // return billingStore.hasAccess('questionnaire', questionnaireId, 'premium_report')
// })
const hasPremiumResults = ref(false)

const regulationProfileTranslations = Object.fromEntries(
  ((regulationProfilesData.regulationProfiles || []) as Array<{ key: string; label: string }>)
    .map(profile => [profile.key, profile.label])
) as Record<string, string>

const globalProfileTranslations = Object.fromEntries(
  ((globalProfilesData.globalProfiles || []) as Array<{ key: string; label: string }>)
    .map(profile => [profile.key, profile.label])
) as Record<string, string>

const profileTranslations: Record<string, string> = {
  ...regulationProfileTranslations,
  ...globalProfileTranslations,
  notSignificant: 'Non significatif'
}

const getProfileLabel = (profileKey: string) => profileTranslations[profileKey] || profileKey

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
  return graphData.value.attachmentProfilesByDimension[dimension]
}

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

// créer un code couleur pour les tags high, medium, low
// const getRegulationLevelColor = (level: string) => {
//   switch (level) {
//     case 'high':
//       return 'text-red-600'
//     case 'medium':
//       return 'text-yellow-600'
//     case 'low':
//       return 'text-green-600'
//     default:
//       return 'text-gray-600'
//   }
// }
</script>

<template>
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
          <component :is="getProfileIcon(graphData.attachmentProfilesByDimension.globalStyle)" :size="20" class="inline-block mr-2" />
          <!-- Style :  -->
          {{ getProfileLabel(graphData.attachmentProfilesByDimension.globalStyle) }}
        </h3>
        <p
          class="max-h-36 overflow-hidden mb-3 text-sm text-gray-600 line-clamp-4"
          :class="{ 'max-h-full line-clamp-none': isProfileExplanationOpen('global') }"
        >
          {{ profilExplanations[graphData.attachmentProfilesByDimension.globalStyle] }}
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
            :class="[ dimension === 'anxiety' ? 'bg-primary' : 'bg-secondary', !hasPremiumResults ? 'opacity-50 blur-[5px]' : '' ]"
          >
            <h3 class="text-md mb-3 font-bold">
              <component :is="getProfileIcon(getSubProfile(dimension))" :size="20" class="inline-block mr-2" />
              Sous profil :
              <span v-if="!hasPremiumResults">
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
              <span v-if="!hasPremiumResults">
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
            v-if="!hasPremiumResults"
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
  <div class="mb-3 bg-white rounded-3xl border-l-4 text-gray-600 border-gray-200 md:flex-1 md:max-w-[340%]">
    <Accordeon title="Explication des résultats" >
      <p class="mb-3 text-sm text-gray-600">
        Le type global repose sur deux dimensions principales : l'anxiété et l'évitement. Les réponses au questionnaire permettent d'évaluer le niveau de chacun de ces deux axes, puis de situer le profil général de la personne parmi les grands styles d'attachement : sécure, anxieux, évitant ou désorganisé, comme l'illustre le graphique ci-dessous.
      </p>

      <img
        src="~/assets/img/dimension-anxiety-avoidance-graphique2.png"
        alt="Graphique des dimensions anxiété et évitement"
        class="mb-3 rounded-lg border"
      />
      
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
      
      <p class="mt-3 mb-3 text-sm">
        Mais ce profil global ne suffit pas toujours à décrire précisément le fonctionnement relationnel d'un individu. C'est pourquoi le questionnaire prend aussi en compte des <strong>déclencheurs spécifiques</strong> : 5 liés à l'anxiété et 5 liés à l'évitement. Ce sont ces déclencheurs, ainsi que leurs associations qui permettent d'identifier des sous-profils plus nuancés, comme par exemple un profil anxieux-régulé ou évitant-adaptatif.
      </p>
      
      <p class="mt-3 mb-3 text-sm">
        L'objectif principal n'est donc pas de coller une étiquette mais de mieux comprendre ce qui active concrètement le système d'attachement. 
      </p>
        
      <p class="mt-3 mb-3 text-sm">
        Une personne globalement sécure peut d'ailleurs présenter des scores modérés sur certains déclencheurs, ce qui montre que certaines situations la touchent malgré tout. Lire ses résultats de cette manière permet surtout d'identifier les mécanismes à travailler pour gagner en stabilité relationnelle.
      </p>        
        
      <div class="bg-white p-5 rounded-3xl border-l-4 border-gray-500 md:flex-1">
        <LucideLightbulb :size="20" class="inline-block mr-2" />
        <strong>Note importante</strong>
        <p class="mt-3 text-sm text-gray-600">
          N'oubliez pas que votre profil d'attachement peut évoluer avec le temps et les expériences. Les résultats de ce questionnaire sont une photographie de votre état actuel, mais avec du travail sur soi et des expériences relationnelles positives, il est tout à fait possible de développer un attachement plus sécure.
        </p>
      </div>
    </Accordeon>
  </div>

  <!-- Polar chart -->
  <section class="my-8" v-if="hasPremiumResults">
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
            { 'relative h-[100px]': !hasPremiumResults && tagId != 0 }
          ]"
        >
          <div
            class="flex justify-between"
            @click.prevent.stop="toggleProfileExplanation(tag.trigger)"
            :class="[!hasPremiumResults && tagId != 0 ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer']"
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

          <div v-if="hasPremiumResults || (!hasPremiumResults && tagId === 0)">
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
                <li v-for="(behavior, index) in tag.associatedBehaviors" :key="index" class="mb-3 text-sm text-gray-600 list-disc list-inside first-letter:uppercase">
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
            v-if="!hasPremiumResults && tagId != 0"
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
        <div
          v-if="!hasPremiumResults"
          class="p-5 rounded-3xl bg-blue-700 text-white bg-gradient-to-tr from-blue-700 to-blue-500 md:max-w-[48%] "
        >
          <div class="flex justify-between items-center mb-5 font-semibold tracking-[.13rem]">
            <h3 class="text-lg">
              Accès complets aux résultats
            </h3>
            <span class="text-xl">
              1.99€
            </span>
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
              Obtiens des conseils personnalisés pour chacun d'eux ainsi que des recommandations pour travailler sur tes mécanismes d'attachement.
            </li>
          </ul>
          
          <button class="py-4 rounded-3xl w-full bg-white text-blue-700" @click="hasPremiumResults = true">Débloquer !</button>
        </div>
        
        <div class="mt-8 p-5 border-l-4 rounded-3xl md:m-0 bg-white md:max-w-[48%]">
          <div class="flex justify-between items-center mb-5 font-semibold tracking-[.13rem]">
            <h3 class="text-md">
              Analyse sur mesure
            </h3>
            <span class="text-xl">
              4.99€
            </span>
          </div>

          <p class="mb-5 text-sm">
            Détaille ta situation amoureuse et reçois :
          </p>
          
          <ul class="list-disc text-sm pl-4 mb-5">
            <li class="mb-1">
              Une analyse personnalisée de tes résultats en fonction de ta situation amoureuse actuelle
            </li>
            <li class="mb-1">
              Des conseils sur mesure pour avancer vers plus de sécurité dans ta relation actuelle
            </li>
          </ul>

          <textarea
            class="w-full mb-5 p-3 rounded-lg border text-sm h-40" rows="4" placeholder="Parle-moi un peu de ta situation amoureuse actuelle..."></textarea>
          <button class="py-4 rounded-3xl w-full bg-blue-700 text-white bg-gradient-to-tr from-blue-700 to-blue-500">Envoyer !</button>
        </div>
      </div>
    </section>
</template>

<style lang="scss" scoped>
a {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>