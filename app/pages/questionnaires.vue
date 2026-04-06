<script setup lang="ts">

const fallbackTagIcon = resolveComponent('LucideCircleHelp') as Component

const questionnaireIcons: Record<string, Component> = {
  Link: resolveComponent('LucideLink') as Component,
  HeartHandshake: resolveComponent('LucideHeartHandshake') as Component,
  Brain: resolveComponent('LucideBrain') as Component,
  Activity: resolveComponent('LucideActivity') as Component,
}

const getQuestionnaireIcon = (profileKey: string) => questionnaireIcons[profileKey] || fallbackTagIcon

const questionnaires = [
  {
    id: 1,
    icon: 'Link',
    title: 'Questionnaire d\'attachement adulte',
    description: 'Découvre ton style d\'attachement et reçois des conseils personnalisés pour mieux comprendre comment tu fonctionnes dans tes relations.',
    image: '',
    link: '',
    duration: '8-15 min',
    isActive: true,
  },
  {
    id: 2,
    icon: 'HeartHandshake',
    title: 'Questionnaire de compatibilité de couple',
    description: 'Évalue la compatibilité de ton couple et reçois des conseils pour renforcer votre relation.',
    image: '',
    link: '',
    duration: '~10 min',
    isActive: false,
  },
  {
    id: 3,
    icon: 'Brain',
    title: 'Questionnaire de niveau de conscience émotionnelle',
    description: 'Évalue ton niveau de conscience émotionnelle et reçois des conseils pour mieux comprendre tes émotions.',
    image: '',
    link: '',
    duration: '~10 min',
    isActive: false,
  },
  {
    id: 4,
    icon: 'Activity',
    title: 'Questionnaire journalier d\'activation de l\'attachement',
    description: 'Tu doutes, tu paniques, tu ressens du manque ou encore tu mets de la distance, tu ne veux pas parler, tu te replies sur toi. À quel point es-tu activé aujourd\'hui ? Passe le test pour le savoir.',
    image: '',
    link: '',
    duration: '~5 min',
    isActive: false,
  }
]
const itemsBackground = ['#fdf1ec', '#f2f7e7', '#f8ebe6'] // 'aliceblue', 'honeydew', 'lavender', antiquewhite, azure]

useSeoMeta({
  title: 'Questionnaires d\'attachement adulte',
  description: 'Explore nos questionnaires sur l\'attachement adulte : style anxieux, évitant, sécure et désorganisé. Identifie tes schémas relationnels et comprends tes réactions face à la distance, l\'abandon ou le silence.',
  keywords: 'questionnaire attachement adulte, test style attachement gratuit, attachement anxieux, attachement évitant, compatibilité couple, anxiété relationnelle, peur de l\'abandon, conscience émotionnelle, test relation amoureuse',
  ogTitle: 'Questionnaires d\'attachement adulte',
  ogDescription: 'Identifie ton style d\'attachement (anxieux, évitant, sécure, désorganisé) et comprends tes schémas relationnels.',
  ogUrl: 'https://relation-anxieux-evitant.web.app/questionnaires',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://relation-anxieux-evitant.web.app/questionnaires' }],
})
</script>

<template>
  <div>
    <DesignSystemPageSectionHeading :isHeading="true" title="Tous les questionnaires" titleSize="text-4xl md:text-3xl" sectionSpacing="mt-8 mb-12" />
    <DesignSystemCardGridList
      :items="questionnaires"
      :itemsBackground="itemsBackground"
      :asItemIcons="true"
      :itemIcons="questionnaireIcons"
    />
  </div>  
</template>

<style lang="scss" scoped>
</style>