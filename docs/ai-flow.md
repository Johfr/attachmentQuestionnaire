# Flow IA - Questionnaire d'attachement

> Cette doc decrit le flow cible pour l'integration OpenAI dans la section
> "Analyse sur mesure" du questionnaire d'attachement.
> Elle complete `user-flows.md` et `business-rules.md` sans les reecrire.

## Statut actuel - module en pause

Au `11/04/2026`, le module IA est volontairement mis en pause pour la V1 / MVP.

Concretement :

- le masquage visuel reste en place dans `GoDeeper.vue`
- la page `app/pages/user/attachment-questionnaire/results.vue` ne declenche plus automatiquement l'IA
- la page results ne poll plus l'etat IA
- un user peut consulter ses results sans appel OpenAI, sans ecriture Firestore liee a l'IA et sans perception visible de ce module

Important :

- le code IA backend et les composants associes sont conserves
- la doc ci-dessous decrit toujours le flow cible attendu quand le chantier IA reprendra
- pour reactiver l'IA plus tard, le point d'entree principal a revoir sera `app/pages/user/attachment-questionnaire/results.vue`
- avant la mise en pause, c'etait cette page results user qui rechargeait la session apres retour Stripe, evaluait l'etat `aiExchange` puis pouvait declencher `/api/attachment/ai/generate`

---

## Objectif

Permettre au user :

- de rediger sa situation amoureuse dans `GoDeeper`
- de conserver son texte temporairement meme s'il recharge la page
- de payer l'acces IA
- de revenir sur sa page results
- de voir un loader pendant la generation
- puis de voir la reponse IA stockee en base

---

## Regles produit

- le texte libre du user est lie a une `session` questionnaire precise
- le draft peut etre garde en `localStorage` pour le confort UX
- la source de verite finale reste `questionnaireSessions/{sessionId}.aiExchange`
- l'achat IA est `ponctuel` et `lie a une session`
- il ne cree pas un droit global durable sur les autres sessions
- si l'offre IA inclut les resultats detailles pour cette session, alors le paiement IA doit aussi donner `billingInfo.hasPaidResults = true` sur cette session
- ce deblocage des resultats via IA reste `session-scoped`, il ne doit pas etre propage comme un entitlement global durable

---

## LocalStorage

### Usage

Le `localStorage` reste une option UX pour plus tard.

Dans l'implementation actuelle, il n'est pas utilise.

### Cle recommande

```txt
attachment-questionnaire:ai-draft:{sessionId}
```

### Contenu recommande

```json
{
  "text": "contenu du textarea",
  "updatedAt": 1712660000000
}
```

### Pourquoi

- le user peut revenir sur la page sans perdre son texte
- plusieurs sessions questionnaire peuvent coexister cote local
- chaque draft reste isole par `sessionId`

---

## Point important - ne pas envoyer le texte a Stripe

Le texte libre du user ne doit pas transiter dans les metadata Stripe :

- taille non garantie
- mauvais emplacement pour un texte long
- exposition inutile a un service tiers
- non adapte a un prompt libre potentiellement volumineux

Le paiement Stripe ne doit transporter que des metadata courtes :

- `docId`
- `accessType`
- `entityType`
- `entitySubType`
- `entityVersion`

---

## Source de verite en base

Le plus coherent est d'utiliser le type `AiExchange` directement dans le document :

`questionnaireSessions/{sessionId}`

Exemple cible :

```ts
aiExchange: {
  unlocked: boolean
  purchasedAt: Timestamp | null
  userInput: string | null
  output: string | null
  generatedAt: Timestamp | null
  lastAttemptAt: Timestamp | null
  retryCount: number
  lastErrorCode: string | null
  lastErrorMessage: string | null
  status: 'not_purchased' | 'pending' | 'generated' | 'failed'
  model: string | null
  requestId: string | null
}
```

Ce choix est preferable a une collection separee car :

- l'IA est directement liee a une session
- l'affichage results / paiement / loader depend deja du document de session
- la lecture du profil user reste simple

---

## Flow recommande

### 1. Saisie cote client

Dans `GoDeeper.vue` :

- le user saisit son texte
- le textarea est synchronise dans `localStorage` par `sessionId`

### 2. Preparation serveur avant checkout

Avant de rediriger vers Stripe, le client appelle un endpoint Nuxt dedie.

Exemple :

`POST /api/attachment/ai/prepare`

Payload minimal :

```json
{
  "sessionId": "abc123",
  "userInput": "..."
}
```

Cet endpoint :

- verifie que la session appartient bien au user
- valide la longueur minimale du texte
- stocke `aiExchange.userInput`
- initialise ou met a jour `aiExchange.status = 'not_purchased'`

Le checkout Stripe ne part qu'apres succes de cette etape.

### 3. Paiement reussi

Quand le paiement IA reussit :

- `billingInfo.hasPaidIa = true`
- `billingInfo.hasPaidResults = true` pour cette session si l'offre IA inclut les resultats
- `aiExchange.purchasedAt = now`
- `aiExchange.status = 'pending'`

### 4. Retour sur la page results user

Le user revient sur :

`/user/attachment-questionnaire/results?sessionId={docId}`

La page :

- affiche d'abord un loader de reconciliation plutot qu'un message d'erreur anxiogene
- reessaie de retrouver la session pendant quelques instants si elle n'apparait pas immediatement
- recharge la session
- voit `hasPaidIa = true`
- voit `aiExchange.status = 'pending'` ou un etat intermediaire equivalent
- declenche l'endpoint Nuxt de generation si aucune requete n'est encore partie
- affiche un loader / message du type :
  `Analyse sur mesure en cours de generation...`

### 5. Generation OpenAI cote serveur

Un endpoint Nuxt dedie genere la reponse a partir :

- du texte libre du user
- du contexte relationnel
- des resultats du questionnaire

Exemple :

`POST /api/attachment/ai/generate`

Il :

- relit la session Firestore
- reconstruit le prompt
- appelle OpenAI
- stocke `aiExchange.output`
- stocke `aiExchange.generatedAt`
- stocke `aiExchange.model`
- stocke `aiExchange.requestId`
- passe `aiExchange.status = 'generated'`

En cas d'erreur :

- `aiExchange.status = 'failed'`
- `aiExchange.lastErrorCode`
- `aiExchange.lastErrorMessage`
- `aiExchange.lastAttemptAt`
- incrementation de `aiExchange.retryCount`

### 6. Rafraichissement UI

La page results user doit :

- poller ou recharger la session pendant que `aiExchange.status === 'pending'`
- afficher la reponse quand `status === 'generated'`
- afficher un bloc d'erreur explicite quand `status === 'failed'`
- proposer un bouton `Relancer`
- masquer les blocs d'achat quand la reponse est disponible
- ne jamais laisser une zone vide a la place de l'IA

### 6.b Regeneration admin

Pour les besoins de test interne, l'administration peut disposer d'un bouton de regeneration forcee :

- visible uniquement pour un compte portant la claim Firebase `admin`
- il doit relancer OpenAI sur une session deja `generated` ou `failed`
- il ne doit pas etre visible pour les users classiques
- il ne remplace pas le bouton `Relancer` destine au cas `failed`

---

## Strategie recommandee

### LocalStorage = draft UX

Le `localStorage` sert uniquement a :

- eviter la perte du texte avant paiement
- restaurer le textarea a l'ecran

### Firestore = source de verite

L'input a utiliser pour la generation doit vivre en base avant ou au plus tard au moment du paiement reussi.

Sinon :

- si le user change de device
- si le localStorage est vide
- si le user revient plus tard

la generation ne peut pas repartir proprement.

### Donc

La meilleure approche est :

- `localStorage` pour le draft
- `Firestore aiExchange.userInput` pour la source de verite

---

## Points a rajouter / ne pas oublier

- ajouter une validation serveur de la longueur minimale du textarea
- versionner le prompt (`promptVersion`) ou le deduire du code si besoin
- choisir un modele explicite et le stocker dans `aiExchange.model`
- rendre l'appel idempotent pour eviter 2 generations concurrentes
- definir un comportement de retry si `status = 'failed'`
- nettoyer le draft `localStorage` quand la generation est terminee
- ne jamais bloquer l'affichage des resultats classiques si la generation IA echoue
- stocker une observabilite minimale dans `aiExchange` pour comprendre si l'echec vient de l'acces, du reseau, d'OpenAI ou d'un etat de session incomplet

---

## Contrat de sortie IA

### Niveaux a prendre en compte

L'IA doit prendre plusieurs niveaux en compte :

- Etat emotionnel actuel du user
- Lecture de la situation
- Ce que fait le user en ce moment
- Ce que fait probablement le partenaire
- Besoins reels des deux cotes
- Signaux d’alerte / toxicite / trauma bond / ambiguites
- Ce qu’il ne faut pas faire maintenant
- Plan d’action sur 24h / 72h / 7 jours
- Avis objectif
- Note d’apaisement

### Niveaux d'etat du user

Le prompt doit distinguer trois niveaux d’etat du user au minimum :

- active / en crise / impulsif
- lucide mais douloureux / ambivalent
- plus regule / capable de strategie

Parce qu’un meme diagnostic peut conduire a trois recommandations tres differentes.
Si le user est active, le bon conseil n’est pas le “bon conseil theorique”, c’est le bon conseil praticable.

### Sections obligatoires

Toutes les sections sont obligatoires pour garantir une coherence et une qualite de l'experience utilisateur, ainsi que pour assurer que les resultats fournis par l'IA soient pertinents et utiles.

### Ton attendu

- tutoiement
- bienveillance
- encouragement a l’exploration personnelle
- eviter les formulations trop categoriques ou definitives

### Regles sur les red flags

Se baser sur les reponses de l'utilisateur pour identifier les eventuels signaux d'alerte (`red flags`) et prendre appui sur les recommandations d'experts en psychologie pour formuler des conseils adaptes, tout en restant dans les limites de ce que l'IA peut affirmer.

Il faut rester prudent ici sans affirmer categoriquement mais en montrant une tendance potentielle :

- ensemble de comportements douteux
- dynamique relationnelle preoccupante
- confusion repetee
- chaud / froid destabilisant
- maintien du lien sans engagement reel

### Format du plan d'action

Le plan d’action doit etre :

- progressif
- adapte a l’etat emotionnel du user
- concret
- realiste
- oriente comportement observable
- sans injonctions brutales

Le plan d’action doit etre structure en 3 temporalites :

- `24h`
- `72h`
- `7 jours`

Pour chaque etape, l’IA doit fournir :

- un objectif clair
- `1 a 3 actions maximum`
- des actions concretes, realistes et adaptees a l’etat emotionnel actuel du user
- si necessaire, les erreurs a eviter a cette etape

### Limites de ce que l'IA peut affirmer

L’IA doit analyser la situation avec precision sans surinterpreter.

Elle peut :

- identifier des tendances relationnelles
- proposer des hypotheses plausibles
- signaler des indices compatibles avec une dynamique toxique, un trauma bond ou une forte insecurite relationnelle
- distinguer ce qui est probable, possible ou incertain

Elle ne doit pas :

- poser de diagnostic clinique ou psychiatrique
- attribuer avec certitude une intention psychologique au partenaire
- qualifier categoriquement une personne de toxique, perverse, manipulatrice ou narcissique sans nuance
- transformer un ensemble d’indices en verite absolue

Quand l’information est partielle, l’IA doit employer des formulations prudentes :

- “cela peut indiquer…”
- “cela semble compatible avec…”
- “au vu de ce que tu decris…”
- “sans pouvoir l’affirmer avec certitude…”

### Prudence sur les dynamiques toxiques

Le modele doit empecher la surinterpretation.

Par exemple, sur “relation toxique”, “trauma bond”, “pervers”, etc., la bonne posture est :

- signaler des indices compatibles
- dire quand quelque chose est possible mais non certain
- distinguer une dynamique toxique repetee d’un simple evitement relationnel
- eviter les diagnostics psychologiques sauvages

---

## Impact billing

Si l'achat IA inclut l'acces aux resultats detailles de la session :

- `billingInfo.hasPaidIa = true`
- `billingInfo.hasPaidResults = true`

Mais :

- cet achat IA ne doit pas etre traite comme un entitlement durable pour toutes les futures sessions
- il faut donc bien distinguer :
  - `results` = achat durable potentiel par type de questionnaire
  - `ia` = achat ponctuel, session-scoped

---

## Estimation de chantier

### Code produit

Ordre de grandeur :

- `8 a 12 fichiers` de prod

Probablement :

- `app/components/GoDeeper.vue`
- `app/components/attachmentQuestionnaire/Results.vue`
- `app/pages/user/attachment-questionnaire/results.vue`
- `app/types/questionnaireSessions.ts`
- `app/stores/billing.ts`
- `server/api/attachment/ai/prepare.post.ts`
- `server/api/attachment/ai/generate.post.ts`
- `server/utils/attachment/*` pour construire le prompt / orchestrer la generation
- `functions/index.js` si la logique de paiement doit enrichir `billingInfo` pour l'IA

### Tests

- `3 a 5 fichiers` de tests

Minimum utile :

- unit / integration sur le flow `prepare`
- integration sur `generate`
- Nuxt test sur le loader pending -> generated
- test de matrice d'acces `GoDeeper` une fois le rendu IA branche
