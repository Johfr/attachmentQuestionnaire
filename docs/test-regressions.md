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

## IA flow

Fichiers de test :

- `test/unit/attachmentAi.prepare.test.ts`
- `test/unit/attachmentAi.generate.test.ts`
- `test/nuxt/pages.userResults.aiFlow.test.ts`

Objectif :

- verrouiller le pipeline minimal `prepare -> paiement -> pending -> generation -> generated`

Ces tests couvrent :

- validation serveur de l'input IA avant checkout
- stockage de `aiExchange.userInput` sur la session
- refus des cas limites critiques : texte trop court, texte trop long, session d'un autre user, IA deja debloquee
- demarrage de la generation serveur apres retour sur la page user results quand la session est `pending` sans `requestId`
- absence de redemarrage inutile quand une generation est deja en cours
- stockage du resultat OpenAI et passage en `generated`
- bascule en `failed` si la generation serveur echoue

## Ebook checkout auth

Fichier de test :

- `test/nuxt/ebook.checkoutAuth.test.ts`

Objectif :

- verrouiller le garde-fou UX sur `/ebook` quand le user n'est pas connecte

Ce test couvre :

- clic sur le CTA ebook en etant non connecte
- ouverture de la popin de connexion
- absence de creation de checkout session tant que le user n'est pas authentifie

## Questionnaire submit flow

Fichier de test :

- `test/nuxt/questionnaire.submitFlow.test.ts`

Objectif :

- verrouiller l'UX de validation du questionnaire au dernier clic

Ce test couvre :

- affichage d'un loader pendant la validation / navigation vers les hot results
- affichage d'un message d'erreur si la transition echoue

## Payment trigger sync

Fichier de test :

- `test/unit/paymentSync.test.ts`

Objectif :

- verrouiller la propagation du paiement Stripe vers `questionnaireSessions/{id}.billingInfo`

Ce test couvre :

- extraction de metadata meme si elles arrivent dans `payment_intent.metadata`
- mise a jour de `billingInfo.hasPaidResults` lors d'un paiement `results` reussi

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
