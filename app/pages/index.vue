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
    description: 'Découvre ton style d\'attachement et reçois des conseils personnalisés pour mieux comprendre comment tu fonctionnes dans tes relations.',
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
    duration: '8-15 min',
    isActive: true,
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
        <p class="mt-6 text-sm text-gray-700 md:max-w-[75%]">
          Comprends l'attachement adulte et la dynamique anxieux-évitant. Construis ta relation de rêve. Reconnais tes schémas et ceux de ta partenaire. Apprends à dissocier l'évitement des comportements toxiques.
        </p>
        <p class="mt-2 text-sm text-gray-700 md:max-w-[75%] hidden md:block">
          Passe le questionnaire d'attachement adulte gratuit pour découvrir ton style (anxieux, évitant, sécure, désorganisé) et reçois des conseils personnalisés pour mieux comprendre tes schémas relationnels.
        </p>

      </DesignSystemPageSectionHeading>
      
      <!-- user Progress -->
      <DesignSystemUserProgress />
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
    <section class="mb-14 p-6 bg-white rounded-3xl border-l-4 border-blue-500/50">
      <h2 class="text-xl font-semibold mb-4">La dynamique anxieux-évitant</h2>

      <div :class="{ 'line-clamp-6': !showMore }" class="text-sm text-gray-700 mb-3">
        <p class="">
          Dans de nombreuses relations, un schéma se répète : l'un cherche plus de proximité, l'autre prend de la distance. Ce n'est pas une incompatibilité de caractère, c'est souvent la signature d'une dynamique anxieux-évitant, l'une des configurations relationnelles les plus répandues et les moins comprises.
        </p>
        <p class="">
          La personne avec un attachement anxieux ressent intensément le silence, l'absence de réponse, le retrait. Elle interprète ces signaux comme les preuves d'un désengagement imminent et cherche à rétablir la connexion — parfois au point d'aggraver la situation. De son côté, la personne avec un attachement évitant valorise son espace intérieur, perçoit les demandes de connexion comme oppressantes et se replie davantage. Ce cycle d'activation-fuite peut durer des années sans que ni l'un ni l'autre ne comprenne vraiment ce qui se joue.
        </p>
        <p class="">
          La peur de l'abandon, la jalousie, le besoin de réassurance, la distance émotionnelle, les ruptures à répétition : ces comportements ne sont pas des défauts de caractère. Ils sont souvent le fruit d'un style d'attachement construit tôt, en réponse à ce que l'environnement a appris au système nerveux sur la fiabilité de l'autre.
        </p>
        <p class="">
          Comprendre son profil d'attachement — anxieux activé, anxieux régulé, évitant rigide, évitant flexible, sécure ou désorganisé — est la première étape concrète pour sortir de ces schémas. Ce n'est pas une condamnation. C'est une clé.
        </p>
      </div>

      <button @click="showMore = !showMore">
        <span class="text-sm text-blue-500 hover:underline">
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