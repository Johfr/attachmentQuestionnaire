<script setup lang="ts">

const glossaryEntries = [
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

    <div class="flex flex-col gap-4">
      <div v-for="(entry, index) in glossaryEntries" :key="index" class="glossary-entry">
        <h2 class="text-lg font-semibold">
          {{ entry.term }}
        </h2>
        <p class="text-sm text-gray-600">
          {{ entry.definition }}
        </p>
      </div>
    </div>
  </section>
</template>