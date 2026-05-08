<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

const questionnaireIcons: Record<string, Component> = {
  Link: resolveComponent('LucideLink') as Component,
  HeartHandshake: resolveComponent('LucideHeartHandshake') as Component,
  Brain: resolveComponent('LucideBrain') as Component,
  Activity: resolveComponent('LucideActivity') as Component,
}

const questionnaires = [
  {
    id: 1,
    icon: 'Link',
    title: 'Questionnaire d\'attachement adulte',
    description: 'Découvre ton style d\'attachement en 10 minutes. Reçois des explications claires sur tes schémas + des conseils précis pour arrêter de reproduire les mêmes erreurs.',
    image: '/img/bg-questionnaire.png',
    link: '/attachment-questionnaire/introduction',
    duration: '8-15 min',
    isActive: true,
  },
  {
    id: 2,
    icon: 'HeartHandshake',
    title: 'Questionnaire de niveau de conscience',
    description: 'Évalue la compatibilité de ton couple et reçois des conseils pour renforcer votre relation.',
    image: '',
    link: '',
    duration: '~10 min',
    isActive: false,
  },
]

const blogArticles = [
  {
    id: 1,
    icon: 'Link',
    title: 'Pourquoi tu cherches la considération chez ta partenaire ?',
    description: 'Découvre les raisons profondes de ce comportement et comment y remédier pour construire une relation plus saine.',
    image: '',
    link: '/blog',
    duration: '5-8 min',
    isActive: false,
  }
]
const itemsBackground = ['rust', 'softGreen', 'softPeach']

useSeoMeta({
  title: 'Test de style d\'attachement adulte gratuit',
  description: 'Découvre ton style d\'attachement (anxieux, évitant, sécure, désorganisé) avec notre test gratuit. Comprends tes mécanismes relationnels : peur de l\'abandon, silence, distance, anxiété, rupture.',
  keywords: 'relation anxieux évitant, test attachement adulte gratuit, style d\'attachement, peur de l\'abandon, anxiété relationnelle, attachement anxieux, attachement évitant, insécurité affective, dépendance affective, rupture, abandon, distance, silence, attachement désorganisé, attachement sécure, théorie de l\'attachement, jalousie, fuite émotionnelle, besoin de réassurance',
  ogTitle: 'Test de style d\'attachement adulte gratuit',
  ogDescription: 'Découvre ton style d\'attachement et comprends tes comportements en relation : peur de l\'abandon, silence, distance, anxiété relationnelle.',
  ogUrl: 'https://relation-anxieux-evitant.web.app/',
  twitterTitle: 'Test de style d\'attachement adulte gratuit',
  twitterDescription: 'Découvre ton style d\'attachement et comprends tes mécanismes relationnels.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://relation-anxieux-evitant.web.app/' }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Relation anxieux-évitant',
      url: 'https://relation-anxieux-evitant.web.app/',
      description: 'Comprends l\'attachement adulte et la dynamique anxieux-évitant. Test gratuit et ressources pour mieux vivre tes relations.',
      inLanguage: 'fr-FR',
    }),
  }],
})

const showMore = ref(false)
</script>

<template>
  <div>
    <!-- Entete -->
    <div class="mt-10 mb-16 md:flex md:justify-between">
      <DesignSystemPageSectionHeading
        :isHeading="true"
        title="Relation"
        :highlight="'anxieux-évitant'"
        sectionSpacing="my-10"
      >
        <p class="mt-6 text-sm text-theme-text md:max-w-[75%]">
          Comprends enfin pourquoi tu tournes en rond dans tes relations.
          L'un cherche désespérément de la proximité pendant que l'autre s'éloigne.
          Ce n'est pas un problème de caractère, c'est un schéma d'attachement anxieux-évitant.
        </p>
        <p class="mt-2 text-sm text-theme-text md:max-w-[75%] hidden md:block">
          Passe le questionnaire gratuit et découvre ton style d'attachement (anxieux, évitant, sécurisé ou désorganisé).
          Reçois des conseils concrets et personnalisés pour briser ce cycle et construire une relation plus saine et apaisée.
        </p>

      </DesignSystemPageSectionHeading>
      
      <!-- user Progress -->
      <DesignSystemUserProgress v-if="authStore?.questionnaireAccess?.attachment?.lastCompletedAt?.seconds" />
    </div>

    <!-- derniers questionnaires -->
    <div class="mb-14">
      <DesignSystemPageSectionHeading title="Les derniers questionnaires" />

      <DesignSystemCardGridList
        :items="questionnaires"
        :asItemIcons="true"
        :itemIcons="questionnaireIcons"
        :itemsBackground="itemsBackground"
      />
    </div>
    
    <!-- encart seo -->
    <section class="mb-14 rounded-3xl border-l-4 border-theme-button bg-theme-surfaceStaticCard p-6">
      <h2 class="text-xl font-semibold mb-4">La dynamique anxieux-évitant</h2>

      <div :class="{ 'line-clamp-6': !showMore }" class="text-sm text-theme-muted mb-3">
        <p class="mb-3">
          Dans beaucoup de couples le même scénario se répète sans fin :
          L'un a constamment peur d'être abandonné et cherche plus de proximité tandis que l'autre se sent étouffé et prend de la distance.
        </p>
        <p class="mb-3">
          Ce n'est pas une simple incompatibilité de caractères. C'est le cycle classique <strong>anxieux-évitant</strong>, l'une des dynamiques relationnelles les plus fréquentes et les plus destructrices.
        </p>
        <p class="mb-3">
          La personne anxieuse vit le silence ou le retrait comme une menace vitale. Elle poursuit, questionne, a besoin d'être rassurée.
          De l'autre côté, la personne évitante perçoit ces demandes comme oppressantes et se referme encore plus.
        </p>
        <p class="mb-3">
          Ce cercle vicieux de poursuite-fuite peut durer des années, générant frustration, ressentiment et épuisement des deux côtés.
        </p>
        <p class="mb-3">
          La peur de l'abandon, le besoin incessant de réassurance, la distance émotionnelle, les ruptures à répétition… tous ces comportements ne sont pas des « défauts » ou des caprices. Ils sont le résultat d'un système nerveux qui a appris très tôt comment l'autre allait (ou non) répondre à ses besoins.
        </p>
        <p class="mb-3">
          Comprendre ton profil d'attachement — que tu sois <strong>anxieux activé</strong>, <strong>anxieux régulé</strong>, <strong>évitant rigide</strong>, <strong>évitant flexible</strong>, <strong>sécure</strong> ou <strong>désorganisé</strong> — est la première étape concrète pour sortir de ce schéma.        
        </p>
        <p class="mb-3">
          Ce n'est pas une condamnation.
          C'est une explication. Et surtout, c'est une clé.
        </p>
      </div>

      <button @click="showMore = !showMore">
        <span class="text-sm text-theme-button hover:underline">
          {{ showMore ? 'Voir moins' : 'lire plus' }}
        </span>
      </button>
    </section>

     <!-- derniers articles -->
    <div class="mb-14">
      <DesignSystemPageSectionHeading title="Les derniers articles" />
      
      <DesignSystemCardGridList
        :items="blogArticles"
        :asItemIcons="false"
        :itemIcons="questionnaireIcons"
        :itemsBackground="['white']"
        :buttonText="'Lire l\'article'"
        buttonType="link"
        :isBlog="true"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
</style>
