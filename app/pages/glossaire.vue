<script setup lang="ts">
useSeoMeta({
  title: 'Glossaire de l\'attachement adulte | Définitions',
  description: 'Définitions des concepts clés de la théorie de l\'attachement : style anxieux, évitant, sécure, désorganisé, activation du système d\'attachement, régulation émotionnelle, blessure d\'abandon, dépendance affective.',
  keywords: 'glossaire attachement adulte, définition style attachement, attachement anxieux définition, attachement évitant définition, activation attachement, régulation émotionnelle, blessure d\'abandon, figure d\'attachement, dépendance affective, insécurité affective',
  ogTitle: 'Glossaire de l\'attachement adulte',
  ogDescription: 'Définitions des termes clés de la théorie de l\'attachement adulte : anxieux, évitant, sécure, désorganisé et plus.',
  ogUrl: 'https://relation-anxieux-evitant.web.app/glossaire',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://relation-anxieux-evitant.web.app/glossaire' }],
})

const glossaryEntries = [
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
    term: 'Dynamique anxieux-évitant',
    definition: 'Schéma relationnel fréquent où une personne avec un attachement anxieux et une personne avec un attachement évitant forment un couple. La personne anxieuse cherche davantage de proximité lorsqu\'elle perçoit de la distance ; cette demande accentue le sentiment d\'envahissement chez la personne évitante, qui s\'éloigne davantage, ce qui renforce l\'anxiété de l\'autre. Ce cycle d\'activation-fuite peut être épuisant et difficile à briser sans compréhension mutuelle des mécanismes en jeu.',
  },
  {
    term: 'Activation du système d\'attachement',
    definition: 'Processus par lequel une situation — séparation, conflit, silence prolongé, sentiment d\'être ignoré — déclenche les besoins d\'attachement et génère des comportements visant à rétablir la proximité avec la figure d\'attachement. Chez les personnes avec un attachement anxieux, ce système s\'active facilement, reste actif longtemps et mobilise beaucoup d\'énergie émotionnelle et cognitive.',
  },
  {
    term: 'Hyper-activation',
    definition: 'Stratégie de régulation typique de l\'attachement anxieux : amplification des signaux de détresse pour forcer la proximité du partenaire. Elle se manifeste par la rumination, l\'hypervigilance aux comportements du partenaire, les comportements de contrôle ou de protestation (messages répétés, besoin de vérifier, jalousie). Elle est souvent vécue comme de l\'intensité ou du harcèlement par la personne évitante, qui s\'en éloigne d\'autant plus.',
  },
  {
    term: 'Désactivation',
    definition: 'Stratégie de régulation typique de l\'attachement évitant : suppression ou minimisation des besoins émotionnels pour éviter la dépendance et l\'intimité perçue comme menaçante. Elle se manifeste par le repli, le silence, le besoin d\'espace et une apparente indifférence. Elle protège de la peur d\'être envahi, mais creuse la distance ressentie par le partenaire anxieux.',
  },
  {
    term: 'Blessure d\'abandon',
    definition: 'Peur profonde, souvent ancrée dans l\'enfance, d\'être laissé seul, rejeté ou quitté par les personnes importantes. En relation amoureuse, elle se manifeste par une vigilance excessive aux signes de désintérêt du partenaire, une tolérance basse à la séparation, et parfois des comportements d\'accrochage ou de protestation qui peuvent paradoxalement accélérer la rupture redoutée.',
  },
  {
    term: 'Dépendance affective',
    definition: 'État dans lequel le bien-être émotionnel d\'une personne est excessivement conditionné par la présence, l\'approbation ou l\'amour de son partenaire. La personne dépendante peut tolérer des comportements blessants pour éviter la séparation, perdre ses repères personnels dans la relation et avoir des difficultés à exister en dehors du couple. Elle diffère de l\'attachement anxieux, dont elle est souvent une intensification.',
  },
  {
    term: 'Insécurité affective',
    definition: 'État psychologique caractérisé par le doute sur sa propre valeur dans la relation et sur la fiabilité de l\'autre. Elle peut alimenter la jalousie, le besoin de contrôle, la peur du conflit ou au contraire l\'hyper-adaptation pour ne pas déplaire. Elle est souvent le terreau commun des styles d\'attachement anxieux, évitant et désorganisé.',
  },
  {
    term: 'Régulation émotionnelle',
    definition: 'Capacité à identifier, moduler et gérer ses états émotionnels, en particulier dans les situations relationnelles difficiles. Une bonne régulation émotionnelle permet de ressentir une émotion sans en être débordé, de communiquer ses besoins sans escalade et de traverser des périodes de tension sans catastrophiser. Elle s\'apprend et se développe, notamment à travers la thérapie et les relations sécurisantes.',
  },
  {
    term: 'Figure d\'attachement',
    definition: 'Personne vers laquelle un individu se tourne instinctivement en cas de détresse, de menace ou d\'insécurité. Dans l\'enfance, il s\'agit généralement d\'un parent ou d\'un soignant principal. À l\'âge adulte, le partenaire amoureux devient souvent la principale figure d\'attachement, ce qui explique pourquoi les conflits de couple activent des réactions aussi intenses.',
  },
  {
    term: 'Rupture et attachement',
    definition: 'Une rupture amoureuse est vécue différemment selon le style d\'attachement. Les personnes anxieuses tendent à ruminer, à idéaliser l\'ex-partenaire et à chercher le contact. Les personnes évitantes peuvent sembler indifférentes en surface mais vivent souvent une détresse intériorisée. Comprendre son style d\'attachement aide à traverser une rupture de façon plus consciente et à éviter les patterns de retour compulsif.',
  },
]
</script>

<template>
  <section class="">
    <DesignSystemPageSectionHeading :isHeading="true" title="Glossaire" titleSize="text-4xl md:text-3xl" sectionSpacing="mt-8 mb-12" />
    
    <EntryList :entries="glossaryEntries" />
  </section>
</template>
