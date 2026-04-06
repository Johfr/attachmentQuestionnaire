<script setup lang="ts">
const fallbackTagIcon = resolveComponent('LucideCircleHelp') as Component

const blogIcons: Record<string, Component> = {
  Link: resolveComponent('LucideLink') as Component,
  HeartHandshake: resolveComponent('LucideHeartHandshake') as Component,
  Brain: resolveComponent('LucideBrain') as Component,
  Activity: resolveComponent('LucideActivity') as Component,
}

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
  },
  {
    id: 2,
    icon: 'Link',
    title: 'Comment gérer la panique dans une relation amoureuse ?',
    description: 'Découvre des stratégies efficaces pour apaiser ta panique et renforcer ta relation.',
    image: '',
    link: '/blog',
    duration: '8-15 min',
    isActive: false,
  },
  {
    id: 3,
    icon: 'Link',
    title: 'Comment gérer la fuite dans une relation amoureuse ?',
    description: 'Apprends à reconnaître les signes de la fuite et découvre des conseils pour y faire face.',
    image: '',
    link: '/blog',
    duration: '8-15 min',
    isActive: false,
  },
]
const itemsBackground = ['#fdf1ec', '#f2f7e7', '#f8ebe6'] // 'aliceblue', 'honeydew', 'lavender', antiquewhite, azure]

useSeoMeta({
  title: 'Blog | Attachement adulte et relation anxieux-évitant',
  description: 'Articles de fond sur la relation anxieux-évitant, la peur de l\'abandon, l\'isolement affectif, la jalousie, la dépendance affective, l\'insécurité affective et la théorie de l\'attachement adulte.',
  keywords: 'blog attachement adulte, relation anxieux évitant articles, peur de l\'abandon, évitement émotionnel, jalousie relation, dépendance affective, insécurité affective, anxiété relationnelle, rupture, silence, distance, théorie de l\'attachement',
  ogTitle: 'Blog | Attachement adulte et relation anxieux-évitant',
  ogDescription: 'Articles sur la relation anxieux-évitant : peur de l\'abandon, évitement, jalousie, dépendance affective, insécurité affective.',
  ogUrl: 'https://relation-anxieux-evitant.web.app/blog',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://relation-anxieux-evitant.web.app/blog' }],
})

</script>

<template>
  <section>
    <DesignSystemPageSectionHeading :isHeading="true" title="Tous les articles" titleSize="text-4xl md:text-3xl" sectionSpacing="mt-8 mb-12" />
    <DesignSystemCardGridList
      :items="blogArticles"
      :itemIcons="blogIcons"
      :asItemIcons="false"
      :buttonText="'Lire l\'article'"
      buttonType="link"
      :isBlog="true"
    />
  </section>  
</template>