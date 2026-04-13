<script setup lang="ts">
useSeoMeta({
  title: 'Les styles d\'attachement adulte | Anxieux, évitant, sécure, désorganisé',
  description: 'Comprends les 4 styles d\'attachement adulte : anxieux-préoccupé, évitant-détaché, sécure-autonome et désorganisé-craintif. Origines, comportements en relation amoureuse et pistes de travail thérapeutique.',
  keywords: 'styles d\'attachement adulte, attachement anxieux, attachement évitant, attachement sécure, attachement désorganisé, préoccupé, craintif, détaché, théorie de l\'attachement, relation amoureuse, blessure enfance',
  ogTitle: 'Les styles d\'attachement adulte',
  ogDescription: 'Découvre les 4 styles d\'attachement adulte et comprends leur origine et leurs manifestations en relation amoureuse.',
  ogUrl: 'https://relation-anxieux-evitant.web.app/attachement-styles',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://relation-anxieux-evitant.web.app/attachement-styles' }],
})


const attachmentStyles = [
  {
    term: 'Attachement adulte',
    definition: 'La théorie de l\'attachement adulte décrit la façon dont nos expériences relationnelles précoces façonnent notre manière de vivre l\'intimité, la confiance et la séparation dans nos relations amoureuses. Développée par John Bowlby pour l\'enfance et adaptée à l\'adulte par Hazan et Shaver, elle identifie plusieurs styles — sécure, anxieux, évitant, désorganisé — qui influencent nos comportements relationnels tout au long de la vie.',
  },
  {
    term: 'Attachement sécure',
    definition: 'Style d\'attachement caractérisé par une confiance fondamentale en soi et en l\'autre. Les personnes avec un attachement sécure se sentent à l\'aise avec l\'intimité émotionnelle, savent exprimer leurs besoins sans escalade et supportent la séparation temporaire sans craindre l\'abandon. Il est associé à des relations plus stables et épanouissantes, et peut s\'acquérir au fil d\'expériences thérapeutiques ou relationnelles sécurisantes.',
  },
  {
    term: 'Attachement anxieux',
    definition: 'Style d\'attachement caractérisé par une peur chronique de l\'abandon et un besoin intense de réassurance. Les personnes avec un attachement anxieux interprètent souvent le silence, la distance ou l\'indisponibilité de leur partenaire comme un signe de rejet imminent. Elles peuvent surveiller les signaux du partenaire, chercher à maintenir une proximité constante et ressentir une détresse intense lors des séparations. Ce style est souvent associé à une hyper-activation du système d\'attachement.',
  },
  {
    term: 'Attachement évitant',
    definition: 'Style d\'attachement caractérisé par une valorisation de l\'indépendance et une tendance à minimiser les besoins émotionnels, les siens comme ceux de l\'autre. Les personnes avec un attachement évitant mettent souvent de la distance dans les moments d\'intensité émotionnelle, ont du mal à exprimer leur vulnérabilité et peuvent se sentir envahies par les demandes d\'intimité. Ce n\'est pas un manque d\'amour : c\'est une stratégie de régulation apprise.',
  },
  {
    term: 'Attachement désorganisé',
    definition: 'Style d\'attachement caractérisé par des comportements contradictoires : la figure d\'attachement est à la fois source de réconfort désirée et source de peur. Il est souvent associé à des expériences traumatiques précoces. En relation amoureuse, il peut se manifester par des cycles d\'idéalisation et de dévalorisation, une ambivalence intense, une difficulté à faire confiance et des comportements imprévisibles.',
  },
  {
    term: 'Attachement mixte',
    definition: 'Il est possible d\'avoir des caractéristiques de plusieurs styles d\'attachement, notamment dans les cas d\'attachement désorganisé où coexistent des stratégies d\'hyper-activation et de désactivation. Les personnes avec un attachement mixte peuvent osciller entre des comportements anxieux et évitants, ce qui rend leurs relations particulièrement complexes à gérer.',
  }
]
</script>

<template>
  <section class="">
    <DesignSystemPageSectionHeading :isHeading="true" title="Les différents styles d'attachement" titleSize="text-4xl md:text-3xl" sectionSpacing="mt-8 mb-12" />
    
    <EntryList :entries="attachmentStyles" />
  </section>
</template>
