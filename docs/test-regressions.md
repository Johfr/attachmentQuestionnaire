# Regressions tests

## Results premium-zone

Fichier de test :

- `test/nuxt/results.premiumZone.e2e.test.ts`

Objectif :

- verrouiller le comportement de la page results autour des charts et du scroll vers la zone premium

Ce test couvre :

- montage des charts sans mock
- clic sur le CTA qui amene vers `premium-zone`
- verification que le scroll se fait en local
- verification que la page reste interactive ensuite
- verification que les cartes de declencheurs restent depliables / repliables
- verification que les "Lire la suite..." internes aux declencheurs restent interactifs
- protection contre les erreurs deja rencontrees :
  - `Canvas is already in use`
  - `"doughnut" is not a registered controller`

## GoDeeper access states

Fichier de test :

- `test/nuxt/goDeeper.accessStates.test.ts`

Objectif :

- verrouiller la matrice d'affichage de la section "Aller plus loin" selon les droits du user

Ce test couvre :

- user limite -> bloc resultats + bloc IA visibles
- achat one-shot des resultats -> bloc resultats masque, bloc IA visible
- achat IA deja utilise -> les 2 blocs d'achat sont masques
- membership / formation -> bloc resultats masque, bloc IA visible
- absence de promesse "resultats debloques" dans le bloc IA quand les resultats sont deja accessibles par un autre droit

## Memoire projet

Bug deja rencontre :

- clic sur la zone premium depuis une carte verrouillee
- erreur runtime Chart.js
- page results ensuite partiellement casse
- interactions basiques qui ne repondaient plus correctement

Ca venait de 2 causes :

- ancre geree comme une navigation router au lieu d'un scroll local
- cycle de vie Chart.js fragile lors d'un remount / recreate du canvas

Garde-fous a conserver :

- scroll local JS plutot qu'un `NuxtLink` hash pour cette zone
- destruction explicite des instances Chart.js dans les composants chart
- test de regression dedie
