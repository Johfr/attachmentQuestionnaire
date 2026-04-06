<script setup lang="ts">
import { ref, computed, resolveComponent, watch, type Component } from 'vue'
import Popin from '~/utils/Popin.vue'
import { useUserAttachmentProgressStore } from '~/stores/userAttachmentProgress'
import { useAuthStore } from '~/stores/auth'
import { getProfileLabel } from '~/utils/attachmentProfileTranslations'

const authStore = useAuthStore()
const progressStore = useUserAttachmentProgressStore()

watch(
  () => authStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      progressStore.fetchLatestResult()
    } else {
      progressStore.reset()
    }
  },
  { immediate: true },
)

const profileType = computed<string>(() => {
  if (!progressStore.globalProfile) return '...'
  return getProfileLabel(progressStore.globalProfile)
})

const showPopin = ref(false)
const fallbackElementIcon = resolveComponent('LucideCircle') as Component

const profileExplanationOpen = ref<Record<string, boolean>>({
  global: false,
  anxiety: false,
  avoidance: false,
  disorganized: false,
  mixedProfile: false,
})

// Il existe 11 niveaux de progression. Ils sont définis par rapport à des déclencheurs d'attachement. Chaque déclencheur a un score de 0 à 100% qui correspond au pourcentage de réponses du user qui indiquent que ce déclencheur est présent chez lui.
// tous les scores des déclencheurs > 33%  sont des choses à travailler chez le user pour progresser vers le niveau supérieur.
// Les articles, selon le sujet qu'il traite, feront gagner des points grâce au mini quizz en fin d'article. La barre de progression évoluera en fonction du nombre de points gagnés
const levelsDefinitions = [
  {
    level: 1,
    name: 'Niveau 1',
    description: 'Tu es au début de ton parcours de développement personnel. Tu as peut-être récemment découvert ton style d\'attachement et tu commences à comprendre comment il influence tes relations. C\'est une étape importante, car la prise de conscience est la première étape vers le changement.',
  },
  {
    level: 2,
    name: 'Niveau 2',
    description: 'Tu as commencé à travailler sur toi-même et à comprendre les déclencheurs de ton attachement. Tu es capable d\'identifier les situations qui activent ton attachement et tu commences à développer des stratégies pour y faire face. C\'est une étape cruciale, car elle te permet de prendre le contrôle de ton attachement plutôt que de le laisser contrôler tes relations.',
  },
  {
    level: 3,
    name: 'Niveau 3',
    description: 'Tu as commencé à intégrer les stratégies de gestion de ton attachement dans ta vie quotidienne. Tu es capable de reconnaître les schémas récurrents et de les aborder de manière proactive, ce qui te permet de construire des relations plus saines et épanouissantes.',
  },
  {
    level: 4,
    name: 'Niveau 4',
    description: 'Tu as atteint un niveau de compréhension approfondie de ton attachement. Tu es capable de naviguer dans les relations avec une plus grande conscience de toi-même et des autres, ce qui te permet de construire des relations plus authentiques et satisfaisantes.',
  },
  {
    level: 5,
    name: 'Niveau 5',
    description: 'Tu as atteint un niveau de maîtrise de ton attachement. Tu es capable de naviguer dans les relations avec confiance et résilience, même face à des défis ou des conflits. Tu es un exemple de croissance personnelle et tu inspires les autres par ton parcours.',
  },
  {
    level: 6,
    name: 'Niveau 6',
    description: 'Tu as atteint un niveau de sagesse et de compréhension profonde de ton attachement. Tu es capable d\'aider les autres dans leur propre parcours de développement personnel et tu es un leader dans la communauté de l\'attachement.',
  },
  {
    level: 7,
    name: 'Niveau 7',
    description: 'Tu as atteint un niveau de transformation personnelle en ce qui concerne ton attachement. Tu es capable de vivre des relations authentiques et épanouissantes. Tu es un modèle de croissance personnelle pour les autres.',
  },
  {
    level: 8,
    name: 'Niveau 8',
    description: 'Tu as atteint un niveau de réalisation personnelle en ce qui concerne ton attachement. Tu es capable de vivre une vie pleine et satisfaisante, avec des relations saines et épanouissantes, et tu es un exemple de croissance personnelle pour les autres.',
  },
  {
    level: 9,
    name: 'Niveau 9',
    description: 'Tu as atteint un niveau de maîtrise de soi en ce qui concerne ton attachement. Tu es capable de vivre une vie équilibrée et harmonieuse, avec des relations saines et épanouissantes, et tu es un modèle de croissance personnelle pour les autres.',
  },
  {
    level: 10,
    name: 'Niveau 10',
    description: 'Tu as atteint un niveau de sagesse et de compréhension profonde de toi-même en ce qui concerne ton attachement. Tu es capable de vivre une vie pleine et satisfaisante, avec des relations saines et épanouissantes, et tu es un exemple de croissance personnelle pour les autres.',
  },
  {
    level: 11,
    name: 'Niveau 11',
    description: 'Tu as atteint le plus haut niveau de développement personnel en ce qui concerne ton attachement. Tu es capable de vivre une vie pleine et satisfaisante, avec des relations saines et épanouissantes, et tu es un modèle de croissance personnelle pour les autres.',
  }
]

const definitions = [
  {
    key: 'secure',
    type: 'Sécure',
    elements: 'mountain',
    elementDefinition: 'L\'élément montagne représente la stabilité, la solidité et la résilience. Les personnes avec un attachement sécure ont souvent une base solide dans leurs relations, ce qui leur permet de faire face aux défis avec confiance et de construire des relations durables. Il est associé au style sécure.',
    explanation: 'Tu as un attachement sécure ce qui signifie que tu es à l\'aise avec l\'intimité et la dépendance et que tu as une bonne estime de toi-même. Tu es capable de faire confiance aux autres et de gérer les conflits de manière saine.'
  },
  {
    key: 'anxious',
    type: 'Anxieux',
    elements: 'water',
    elementDefinition: 'L\'élément eau représente la sensibilité, la fragilité et la réceptivité. Les personnes avec un attachement anxieux peuvent être très sensibles aux signes de rejet ce qui peut les amener à rechercher une validation constante de la part de leurs partenaires. Il est associé au style anxieux.',
    explanation: 'Tu as un attachement anxieux, ce qui signifie que tu as tendance à être préoccupé par la peur de l\'abandon et à rechercher une validation constante de la part de tes partenaires. Tu peux être très sensible aux signes de rejet et avoir du mal à faire confiance aux autres.'
  },
  {
    key: 'avoidant',
    type: 'Evitant',
    elements: 'snow',
    elementDefinition: 'L\'élément neige représente la froideur, l\'isolement et la distance. Les personnes avec un attachement évitant ont souvent du mal à faire confiance aux autres et à exprimer leurs émotions, préférant souvent garder une certaine distance dans leurs relations. Il est associé au style évitant.',
    explanation: 'Tu as un attachement évitant, ce qui signifie que tu as tendance à éviter l\'intimité et à te sentir mal à l\'aise avec la dépendance. Tu peux avoir du mal à faire confiance aux autres et à exprimer tes émotions, préférant souvent garder une certaine distance dans tes relations.'
  },
  {
    key: 'disorganized',
    type: 'Désorganisé',
    elements: 'storm',
    elementDefinition: 'L\'élément tempête représente la confusion, le chaos et l\'instabilité. Les personnes avec un attachement désorganisé peuvent avoir des comportements contradictoires dans leurs relations, oscillant entre l\'attachement anxieux et évitant. Il est associé au style désorganisé.',
    explanation: 'Tu as un attachement désorganisé, ce qui signifie que tu peux avoir des comportements contradictoires dans tes relations, oscillant entre l\'attachement anxieux et évitant. Tu peux avoir du mal à gérer tes émotions et à établir des relations stables.'
  },
  {
    key: 'mixedProfile',
    type: 'Profil mixte',
    elements: 'ether',
    elementDefinition: 'L\'élément éther représente la complexité, la fluidité et l\'interconnexion. Les personnes avec un profil mixte peuvent présenter des caractéristiques de plusieurs styles d\'attachement, ce qui rend leur expérience relationnelle plus nuancée. Il est associé au profil mixte.',
    explanation: 'Tu as un profil mixte, ce qui signifie que tu peux présenter des caractéristiques de plusieurs styles d\'attachement. Il est important de comprendre les différentes facettes de ton attachement pour mieux gérer tes relations et progresser vers un attachement plus sécure.',
    caracteristics: 'Attention, ce profil n\'est pas considéré comme un style d\'attachement. Il peut présenter des caractéristiques de plusieurs styles d\'attachement. Il définit une personne qui tombe entre plusieurs zones ou qui a des scores modérés/intermédiaires sur les deux axes. Par exemple, une personne peut avoir des scores modérés à la fois sur l\'anxiété et l\'évitement, ce qui signifie qu\'elle ne correspond pas clairement à un style d\'attachement spécifique. Il est important de comprendre que le profil mixte peut être complexe et que les individus peuvent présenter des comportements variés dans leurs relations.'
  },
]

const elementIcons: Record<string, Component> = {
  mountain: resolveComponent('LucideMountain') as Component,
  water: resolveComponent('LucideDroplet') as Component,
  snow: resolveComponent('LucideSnowflake') as Component,
  storm: resolveComponent('LucideTornado') as Component,
  ether: resolveComponent('LucideThermometerSnowflake') as Component,
}
const bgColorByElement: Record<string, string> = {
  mountain: 'bg-green-500',
  water: 'bg-blue-500',
  snow: 'bg-indigo-500',
  storm: 'bg-red-500',
  ether: 'bg-zinc-500',
}
const colorByElement: Record<string, string> = {
  mountain: 'text-green-500',
  water: 'text-blue-500',
  snow: 'text-indigo-500',
  storm: 'text-red-500',
  ether: 'text-zinc-500',
}

const isProfileExplanationOpen = (key: string) => {
  return profileExplanationOpen.value[key]
}

const toggleProfileExplanation = (key: string) => {
  profileExplanationOpen.value[key] = !profileExplanationOpen.value[key]
}
</script>

<template>
  <section class="p-5 mt-6 mb-6 bg-[#f1e2dd] rounded-3xl w-full md:max-w-[40%]">
    <p
      class="flex justify-between items-center text-xs uppercase text-gray-400"
      :title="progressStore.hasResult ? `Voir les caractéristiques de l\'élément ${progressStore.element}` : 'Etat actuel'"
    >
      Etat actuel
      <component
        :is="progressStore.hasResult ? (elementIcons[progressStore.element] || fallbackElementIcon) : fallbackElementIcon"
        :size="40"
        class="inline-block min-w-10 ml-2 p-2 rounded-full text-white shadow-none hover:shadow-lg shadow-slate-300 transition-shadow duration-500 cursor-pointer"
        :class="progressStore.hasResult ? bgColorByElement[progressStore.element] : 'bg-gray-300'"
        @click.self="showPopin = !showPopin"
      />
    </p>
    <h2 class="mb-6 text-lg font-serif font-bold">
      <template v-if="progressStore.hasResult">Niveau {{ progressStore.level }}</template>
      <template v-else>...</template>
    </h2>

    <div class=" mb-6" @click="showPopin = !showPopin">
      <p
        v-if="progressStore.hasResult"
        class="mb-2 px-4 py-2 text-sm inline-block rounded-3xl text-white shadow-none hover:shadow-lg shadow-slate-300 transition-shadow duration-500 cursor-pointer"
        :class="bgColorByElement[progressStore.element]"
        title="Voir les éléments de ce niveau"
      >
        Element
        <span class="font-bold capitalize">{{ progressStore.element }}</span>
      </p>
      
      <p v-if="progressStore.hasResult" class="mr-3 px-4 py-2 text-sm bg-red-100 inline-block rounded-3xl shadow-none hover:shadow-lg shadow-slate-300 transition-shadow duration-500 cursor-pointer" title="Voir les différents types d'attachement">
        Type
        <span class="font-bold">{{ profileType }}</span>
      </p>

      <p v-if="!progressStore.hasResult && !progressStore.isLoading" class="text-sm text-gray-400">
        Passe le questionnaire pour découvrir ton niveau.
      </p>
    </div>

    <!-- progress bar  -->
    <div class="w-full bg-[#d5d5d5] rounded-full h-2">
      <div
        class="h-2 rounded-full"
        :class="progressStore.hasResult ? bgColorByElement[progressStore.element] : 'bg-gray-400'"
        :style="{ width: progressStore.progress + '%' }"
      ></div>
    </div>
    <p v-if="progressStore.hasResult" class="text-xs text-gray-500">
      <template v-if="progressStore.level < 11">Progression vers le niveau {{ progressStore.level + 1 }}</template>
      <template v-else>Félicitation, tu as atteint un attachement sécure de haut niveau !</template>
    </p>

    <!-- Popin -->
    <Popin v-model="showPopin">
      <div class="mb-8">
        <div class="mb-8">
          <DesignSystemPageSectionHeading title="Définitions" sectionSpacing="mt-0 mb-12"/>
        </div>
      </div>

      <!-- Elements -->
      <div v-if="progressStore.hasResult" class="mb-8">
        <h3 class="md:text-lg font-bold mb-3 text-gray-700">
          Caractéristiques de l'élément {{ progressStore.element }}
          <component
            :is="elementIcons[progressStore.element] || fallbackElementIcon"
            :size="20"
            class="inline-block rounded-full"
            :class="colorByElement[progressStore.element]"
          />
        </h3>
        <p class="text-sm text-gray-500 ">{{ definitions.find(def => def.elements === progressStore.element)?.explanation }}</p>
      </div>

      <!-- Levels -->
      <div v-if="progressStore.hasResult" class="mb-8">
        <h3 class="md:text-lg font-bold mb-3 text-gray-700">
          Tu es au niveau {{ progressStore.level }}/{{ levelsDefinitions.length }}
        </h3>
        <p class="text-sm text-gray-500 ">{{ levelsDefinitions.find(l => l.level === progressStore.level)?.description }}</p>
      </div>

      <!-- Style d'attachement -->
      <div class="mb-8">
        <h3 class="md:text-lg font-bold mb-3 text-gray-700">Il existe en tout 4 types d'attachement</h3>
        <ul class="list-disc list-inside">
          <li v-for="def in definitions" :key="def.key" class="text-sm text-gray-500 mb-2 last:mb-0">
            <span>{{ def.type }}</span>
            <span v-if="def.key === 'mixedProfile'" class="text-xs p-2 cursor-pointer" @click="toggleProfileExplanation(def.key)">
              {{ isProfileExplanationOpen(def.key) ? 'Réduire' : 'Lire plus ...' }}
            </span>
            <Transition name="fade">
              <p v-if="isProfileExplanationOpen(def.key)" class="mt-2 pl-5 text-xs leading-relaxed text-gray-400">
                {{ def.caracteristics }}
              </p>
            </Transition>
          </li>
        </ul>
      </div>

      <!-- Elements définitions -->
      <div class="mb-8">
        <h3 class="md:text-lg font-bold mb-3 text-gray-700">
          Il existe 1 élément pour chaque type d'attachement
        </h3>
        <ul class="list-inside">
          <li v-for="def in definitions" :key="def.key" class="text-sm text-gray-500 mb-4 last:mb-0">
            <span>
              <component
                :is="elementIcons[def.elements]"
                :size="25"
                class="inline-block mr-2 p-1 rounded-full text-white"
                :class="bgColorByElement[def.elements]"
              />
              {{ def.elementDefinition }}
            </span>
          </li>
        </ul>
      </div>
    </Popin>
  </section>
</template>

<style lang="scss" scoped>
</style>