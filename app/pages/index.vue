<script setup lang="ts">
// import bgQuestionnaire from '~/assets/img/bg-questionnaire.png'

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
    title: 'Questionnaire de compatibilité de couple',
    description: 'Évalue la compatibilité de ton couple et reçois des conseils pour renforcer votre relation.',
    image: '',
    link: '/compatibility-questionnaire/introduction',
    duration: '~10 min',
    isActive: false,
  },
]

const blogArticles = [
  {
    id: 2,
    icon: '',
    title: 'La vérité crue sur les évitants',
    description: 'Découvre les mécanismes d\'évitement et comment les surmonter pour construire des relations plus saines.',
    image: '',
    link: '/blog/comment-gerer-la-fuite-dans-une-relation-amoureuse',
    duration: '5 min',
    isActive: true,
  }
]
const itemsBackground = ['rust', 'softGreen', 'softPeach']

// simule la récupération du type du user depuis une API ou une base de données
type UserType = 'secure' | 'anxious' | 'avoidant' | 'disorganized' | 'mixedProfile'
const userType: UserType = 'secure'

const typesElements: Record<UserType, string> = {
  secure: 'mountain',
  anxious: 'water',
  avoidant: 'snow',
  disorganized: 'storm',
  mixedProfile: 'ether',
}

// Il existe 11 niveaux de progression. Ils sont définis par rapport à des déclencheurs d'attachement. Chaque déclencheur a un score de 0 à 100% qui correspond au pourcentage de réponses du user qui indiquent que ce déclencheur est présent chez lui.
// tous les scores des déclencheurs > 33%  sont des choses à travailler chez le user pour progresser vers le niveau supérieur.
// Les articles, selon le sujet qu'il traite, feront gagner des points grâce au mini quizz en fin d'article. La barre de progression évoluera en fonction du nombre de points gagnés
// Le user pourra repasser un test après 1 mois et vérifier son évolution
// partage le site à 3 personnes et débloque un accès gratuit à l'ia
const generateUserStats = (type: UserType) => {
  // générer dynamiquement la clé de l'élément en fonction du type d'attachement
  let level = 1
  switch (type) {
    case 'secure':
      level = 7
      break
    case 'anxious':
    case 'avoidant':
      level = 3
      break
    case 'mixedProfile':
      level = 2
      break
    case 'disorganized':
      level = 1
      break
  }
  return {
    id: 1,
    level: level,
    type,
    element: typesElements[type],
    progress: (level / 11) * 100
  }
}
const userStats: ReturnType<typeof generateUserStats> = generateUserStats(userType)
</script>

<template>
  <div>
    <!-- <h1>Home</h1>
    <h2>Réussis ta relation ou mets y fin de façon saine</h2>
    <p>Réduis ta panique et/ou ta fuite en adoptant des comportements sains et protecteurs.</p> -->

    <div class="md:flex justify-between mt-10 mb-16">
      <HomeArticlesAndQuestionnairesHomeHeroes :user="{ id: 1, name: 'John Doe' }" />
      <HomeArticlesAndQuestionnairesHomeUserProgress :userStats="userStats" />
    </div>
    
    <div class="mb-14">
      <h2 class="text-2xl font-bold">Les derniers questionnaires</h2>
      <div class="flex h-1 mt-1 mb-6">
        <span class=" h-1 w-14 mr-2 bg-rust"></span>
        <span class=" h-1 w-4 mr-2 bg-rust"></span>
        <span class=" h-1 w-2 bg-rust"></span>
      </div>
      <!-- <h2 class="text-lg font-bold">Les derniers questionnaires</h2> -->
      <HomeArticlesAndQuestionnairesList
        :items="questionnaires"
        :itemsBackground="itemsBackground"
        :itemIcons="questionnaireIcons"
      />
    </div>
    
    
    <div class="mb-4">
      <h2 class="text-2xl font-bold">Les derniers articles</h2>
      <div class="flex h-1 mt-1 mb-6">
        <span class=" h-1 w-14 mr-2 bg-rust"></span>
        <span class=" h-1 w-4 mr-2 bg-rust"></span>
        <span class=" h-1 w-2 bg-rust"></span>
      </div>
      <HomeArticlesAndQuestionnairesList
        :items="blogArticles"
        :itemsBackground="itemsBackground"
        :itemIcons="questionnaireIcons"
        :buttonText="'Lire l\'article'"
      />
    </div>
  </div>  
</template>

<style lang="scss" scoped>
</style>