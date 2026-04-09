# Parcours utilisateur

> Cette doc decrit les parcours reels attendus par le produit.
> Elle sert de garde-fou quand une implementation "logique" risque de casser
> une attente UX ou metier implicite.

---

## Objectif

Ce document couvre :

- le parcours questionnaire d'attachement
- le comportement attendu du contexte partenaire
- le passage hot results -> paiement -> retour Stripe
- les regles de navigation et de protection de routes
- les cas limites a ne pas casser lors de futurs refactors

---

## Parcours 1 - Premier passage questionnaire

### Situation

Utilisateur non connecte ou connecte, arrive sur :

`/attachment-questionnaire/introduction`

### Attendu

1. Le user voit l'introduction du questionnaire.
2. Les champs partenaire peuvent etre vides au premier passage.
3. Si le user n'est pas connecte, il se connecte ou cree un compte depuis l'intro.
4. Au clic sur "Commencer le questionnaire", le wizard demarre.
5. Le user complete le questionnaire.
6. La page results affiche les resultats "chauds" sans avoir besoin d'un query param.

### Regles importantes

- Les reponses du wizard ne sont pas sauvegardees en cours de route.
- Les resultats du premier passage doivent s'afficher meme si `sessionId` est temporairement absent.
- Une erreur de lecture billing ne doit pas casser l'affichage des resultats deja calcules.
- L'acces au questionnaire peut etre soumis a un cooldown par type de questionnaire.
- Le check de cooldown se fait au clic sur le bouton de lancement, avec loader.
- Si le user est bloque, on masque formulaires et bouton, puis on affiche un message du type :
  `Encore X jours avant de pouvoir passer de nouveau le formulaire.`

---

## Parcours 2 - Contexte partenaire

### Source de verite

Le contexte partenaire est stocke dans :

`users/{uid}.currentPartnerContext`

Le droit de repasser un questionnaire est mirror dans :

`users/{uid}.questionnaireAccess`

Champs utiles aujourd'hui :

- `firstName`
- `age`

### Attendu

1. Premier passage sans partenaire renseigne :
   aucun pre-remplissage, comportement normal.
2. Si un partenaire a deja ete renseigne lors d'un passage precedent :
   l'introduction doit pre-remplir les inputs avec les valeurs presentes dans `users/{uid}`.
3. Si le user relance le questionnaire plus tard sans modifier ces champs :
   les valeurs existantes doivent etre conservees.
4. Si le user change le nom du partenaire :
   on considere qu'il teste une nouvelle relation.
   La logique back associe alors la nouvelle session au nouveau contexte.

### Regles a ne pas casser

- Champ vide sur un user deja connu ne veut pas dire "effacer automatiquement le partenaire".
- Le pre-remplissage doit fonctionner au retour sur l'introduction.
- Le store auth peut charger le contexte partenaire depuis Firestore, mais l'intro doit toujours refleter la valeur du store une fois disponible.
- Le store auth peut aussi charger `questionnaireAccess` depuis Firestore des la connexion pour eviter de relire tout l'historique des sessions au clic.

---

## Parcours 3 - Results chauds

### Route

`/attachment-questionnaire/results`

### Attendu

1. Cette page n'est accessible qu'apres completion du wizard.
2. Elle consomme les resultats du wizard, appelle l'API serveur, puis affiche les resultats.
3. Elle ne depend pas d'un query `sessionId` pour le premier affichage.
4. En cas de persistance reussie, le miroir `users/{uid}.questionnaireAccess.{questionnaireType}` est mis a jour.

### Regles a ne pas casser

- Si la persistance Firestore echoue, les resultats restent visibles.
- Un message de sauvegarde ou d'erreur peut s'afficher, mais il ne doit pas bloquer le rendu principal.
- Quitter cette page doit reset le wizard pour eviter les doublons de session en navigation SPA.

---

## Parcours 4 - Achat des resultats

### Situation

Depuis les hot results ou depuis une session du profil, le user debloque :

- les resultats detailles
- ou l'analyse IA
- ou un membership

### Attendu

1. Le clic achat cree une session Stripe Checkout.
2. Le user est redirige vers Stripe.
3. En cas d'annulation, le retour se fait vers :
   `/user/profil/`
4. En cas de succes, le retour se fait vers :
   `/user/attachment-questionnaire/results?sessionId={docId}`

### Regles a ne pas casser

- Le retour de paiement ne doit pas obliger le user a repasser par la home.
- Le deblocage peut arriver avec un petit delai de propagation Cloud Function.
- La page user results doit donc rafraichir la session pendant un court laps de temps apres retour Stripe.

---

## Parcours 4 bis - Niveaux d'acces et strategie billing

### Niveaux

Le produit distingue aujourd'hui 3 grands niveaux d'acces :

1. Utilisateur limite
2. Achat one-shot
3. Abonnement

### Detail attendu

#### 1. Utilisateur limite

Le user non abonne et sans achat conserve un acces limite :

- resultats globaux visibles selon les regles du questionnaire
- pas d'acces automatique aux resultats detailles
- pas d'acces automatique aux analyses IA
- pas d'acces premium global aux articles

#### 2. Achat one-shot

Deux familles de one-shot doivent etre distinguees :

- achat de resultats de questionnaire
- achat d'article

Regle metier importante :

- si le user achete une fois les resultats d'un type de questionnaire, toutes les sessions passees et futures de ce meme questionnaire deviennent accessibles sans repayer

Exemple :

- achat des resultats du questionnaire d'attachement une fois
- toutes les sessions `attachment` du user doivent avoir `hasPaidResults = true`
- les futures sessions `attachment` creees apres cet achat doivent aussi etre creees avec acces resultats actif

Cette regle ne s'applique pas a l'IA :

- `hasPaidIa` reste lie a une session et a une demande ponctuelle
- une nouvelle session ou une nouvelle situation relationnelle ne doit pas heriter automatiquement de l'IA

#### 3. Abonnement

Deux niveaux d'abonnement sont prevus :

- membership 1 mois
- formation 1 an

Regle metier importante :

- si le user est membership, il a acces a tous les resultats de tous les questionnaires passes + aux articles du site -> géré côté front
- si le user perd son abonnement, il perd cet avantage global
- seuls les achats one-shot deja payes restent acquis

### Regles a ne pas casser

- `hasPaidMembership` et `hasPaidFormation` sont des droits temporaires, dependants du statut d'abonnement
- `hasPaidResults` peut etre un droit durable pour un type de questionnaire si l'achat one-shot l'accorde a toutes les sessions de ce type
- `hasPaidIa` ne doit jamais etre promu en droit global durable par type de questionnaire

---

## Parcours 5 - Resultats depuis le profil

### Routes

- `/user/profil`
- `/user/attachment-questionnaire/results?sessionId=...`

### Attendu

1. Le profil liste les sessions completes.
2. Le clic sur une session ouvre la page detail avec le `sessionId`.
3. Si aucun `sessionId` n'est fourni, la page user results peut retomber sur la derniere session attachement disponible.

### Regles a ne pas casser

- Une lecture Firestore temporairement indisponible ne doit pas faire planter la page profil.
- Une lecture billing indisponible ne doit pas masquer les resultats deja recuperes.

---

## Parcours 6 - Protection de routes

### Routes protegees

- `/attachment-questionnaire/questionnaire`
- `/attachment-questionnaire/results`
- `/user/profil`
- `/user/attachment-questionnaire/results`

### Attendu

1. Un user non connecte est bloque sur les routes privees.
2. Un user connecte ne doit pas etre ejecte au refresh a cause d'un init auth trop tardif.
3. La page hot results doit en plus verifier que le wizard est bien complete.

### Regles a ne pas casser

- Le middleware auth doit attendre l'initialisation client avant de conclure qu'il n'y a pas d'utilisateur.
- Le guard results ne doit pas laisser acceder a la page hot results en acces direct sans wizard complete.

---

## Cas limites importants

- Firestore indisponible pendant `checkUserPermissions()`
- Firestore indisponible pendant le chargement du profil
- Firestore indisponible pendant le chargement du miroir `questionnaireAccess`
- Persistance session echouee mais calcul des resultats reussi
- Retour Stripe avec propagation billingInfo retardee
- User deja connecte qui relance le questionnaire
- User deja connecte avec ancien partenaire deja renseigne
- Retour manuel via historique navigateur sur la page hot results
- User bloque par cooldown au clic sur l'introduction
- User qui a achete une fois les resultats d'un questionnaire puis cree une nouvelle session de ce meme questionnaire
- User qui perd son membership mais doit conserver ses achats one-shot
- User avec achat results durable mais sans acces IA durable

---

## Tests a garder

### Unit

- conservation du `currentPartnerContext` existant si un user relance le questionnaire sans modifier les champs
- validation serveur des reponses du questionnaire
- arrondi des scores stockes pour les triggers

### Integration Nuxt

- affichage des hot results sans query `sessionId`
- affichage maintenu si la persistance echoue
- fallback non bloquant si billing/profile Firestore echoue
- reset du wizard en quittant la page results
- blocage de l'introduction questionnaire si `questionnaireAccess.nextAllowedAt` est dans le futur

### E2E / parcours

- questionnaire -> results -> achat -> retour Stripe -> acces direct a `/user/.../results`
- refresh sur route protegee avec user deja connecte
- re-passage du questionnaire avec partenaire pre-rempli
- user connecte avec cooldown actif -> blocage sur l'introduction avec message et sans bouton
- achat one-shot des resultats d'un questionnaire -> nouvelle session du meme questionnaire automatiquement accessible
- fin d'abonnement membership -> perte des acces globaux mais conservation des achats one-shot

---

## Strategie d'implementation recommandee

### Source de verite

La source de verite des droits doit reposer sur les metadata Stripe :

- `entityType`
- `entitySubType`
- `accessType`
- `entityVersion`
- `docId`

Ces metadata permettent de distinguer :

- achat one-shot lie a un type de questionnaire
- achat IA lie a une session precise
- abonnement membership
- abonnement formation

### Ou appliquer la regle

La bonne strategie n'est pas de recalculer ces droits uniquement au rendu front.

Il faut 2 niveaux :

1. **Cloud Function au paiement**
   Quand un paiement `results` reussi pour `entityType='questionnaire'` et `entitySubType='attachment'` :
   - mettre a jour la session cible
   - mettre a jour toutes les autres sessions du user pour ce meme type de questionnaire

2. **Hydratation des nouvelles sessions au moment de leur creation**
   A la fin d'un nouveau passage questionnaire, lors de la creation du doc `questionnaireSessions`, il faut interroger la source d'entitlements du user pour savoir si ce type de questionnaire est deja debloque en one-shot

### Recommandation concrete

La solution la plus propre est :

- utiliser les metadata Stripe comme base
- materialiser ensuite un etat d'entitlements par user et par type de contenu

Exemple cible :

`users/{uid}/entitlements/questionnaires_attachment`

ou equivalent, avec au minimum :

- `hasPaidResults`
- `hasPaidMembership`
- `hasPaidFormation`
- `updatedAt`

Puis :

- la Cloud Function de paiement met a jour cet entitlement
- la Cloud Function backfill toutes les sessions existantes concernees
- la creation d'une nouvelle session lit cet entitlement pour initialiser `billingInfo`

### Pourquoi eviter une verif front uniquement

Verifier uniquement cote front "est-ce que ce user a deja paye ce questionnaire ?" au moment de finir le questionnaire serait insuffisant :

- la source de verite resterait dispersee
- les sessions existantes ne seraient pas backfill proprement
- les acces dependraient trop du moment de consultation
- les Cloud Functions Stripe resteraient sous-utilisees alors qu'elles sont le bon point de synchronisation metier

### Script de rattrapage

Oui, un script de backfill est pertinent pour l'existant.

But :

- retrouver les paiements one-shot `results` par questionnaire
- retrouver les users concernes
- mettre `hasPaidResults = true` sur toutes leurs sessions du meme questionnaire

Ce script est de migration / rattrapage.
Pour le fonctionnement futur, c'est la Cloud Function + l'initialisation des nouvelles sessions qui doivent porter la logique.

---

## Note produit

Quand un comportement a l'air ambigu cote technique, la priorite est :

1. respecter le parcours attendu par le user
2. conserver la coherence des donnees
3. seulement ensuite simplifier l'implementation

Autrement dit :

une implementation "plus propre" techniquement ne doit pas supprimer une subtilite UX/metier si cette subtilite fait partie du comportement attendu.
