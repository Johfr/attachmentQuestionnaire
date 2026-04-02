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

</script>

<template>
  <section>
    <DesignSystemPageSectionHeading :isTitleH2="true" title="Tous les articles" sectionSpacing="mt-8 mb-12" />
    <DesignSystemCardGridList
      :items="blogArticles"
      :itemsBackground="itemsBackground"
      :itemIcons="blogIcons"
    />
  </section>  
</template>