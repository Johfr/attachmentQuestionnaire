<script setup lang="ts">

const elementsEntries = [
  {
    term: 'Mountain',
    definition: 'L\'élément de la montagne symbolise la stabilité, la solidité et la permanence. Il représente les bases solides sur lesquelles nous construisons nos relations, ainsi que les défis que nous devons surmonter pour atteindre une connexion profonde. Il est associé au style d\'attachement sécure, où la confiance et la sécurité sont les fondations de la relation.',
  },
  {
    term: 'Water',
    definition: 'L\'élément de l\'eau symbolise l\'émotion, la fluidité et la transformation. Il représente la capacité à ressentir profondément, à s\'adapter aux changements et à se connecter avec les autres à un niveau émotionnel. Il est associé au style d\'attachement anxieux, où les émotions peuvent être intenses et fluctuantes.',
  },
  {
    term: 'Snow',
    definition: 'L\'élément de la neige est en lien avec le style d\'attachement évitant. Il symbolise la froideur, la distance et la protection. Il représente la tendance à se protéger des blessures émotionnelles en maintenant une certaine distance dans les relations.',
  },
  {
    term: 'Storm',
    definition: 'L\'élément de la tempête est en lien avec le style d\'attachement désorganisé. Il symbolise la puissance, le changement et la transformation. Il représente la capacité à naviguer à travers les turbulences et à s\'adapter aux situations imprévues.',
  },
  {
    term: 'Ether',
    definition: 'L\'élément de l\'éther est en lien avec le style d\'attachement mixte. Ce style peut présenter des caractéristiques de plusieurs styles d\'attachement, notamment dans les cas d\'attachement désorganisé où coexistent des stratégies d\'hyper-activation et de désactivation. Les personnes avec un attachement mixte peuvent osciller entre des comportements anxieux et évitants, ce qui rend leurs relations particulièrement complexes à gérer.',
  }
]
</script>

<template>
  <section class="">
    <DesignSystemPageSectionHeading :isHeading="true" title="Les 4 éléments" titleSize="text-4xl md:text-3xl" sectionSpacing="mt-8 mb-12" />
    
    <p class="mb-5 text-sm text-theme-muted">
      Les éléments sont des concepts symboliques qui représentent les différentes dynamiques et caractéristiques des styles d'attachement. Ils n'ont pas de base scientifique formelle, mais sont utilisés comme des métaphores. La montagne est souvent associée à la stabilité et à la sécurité, l'eau à l'émotion et à la fluidité, la neige à la distance et à la protection, la tempête à la turbulence et au changement, et l'éther à la complexité et à l'ambivalence. Ils sont associés aux différents styles d'attachement.
    </p>
    
    <EntryList :entries="elementsEntries" />
  </section>
</template>