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


</script>

<template>
  <div>
    <!-- <h1>Home</h1>
    <h2>Réussis ta relation ou mets y fin de façon saine</h2>
    <p>Réduis ta panique et/ou ta fuite en adoptant des comportements sains et protecteurs.</p> -->
    <div class="md:flex justify-between mt-10 mb-16">
      <DesignSystemPageSectionHeading :asTag="true" :isTitleH1="true" title="Bienvenue," :userName="authStore?.user?.name" />
      <DesignSystemUserProgress />
    </div>
    
    <div class="mb-14">
      <DesignSystemPageSectionHeading :isTitleH2="true" title="Les derniers questionnaires" />

      <DesignSystemCardGridList
        :items="questionnaires"
        :asItemIcons="true"
        :itemIcons="questionnaireIcons"
        :itemsBackground="itemsBackground"
      />
    </div>
    
    
    <div class="mb-4">
      <DesignSystemPageSectionHeading :isTitleH2="true" title="Les derniers articles" />
      
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