# Synthèse métier - Questionnaire d'attachement

> Cette doc donne une vue métier simple du questionnaire d'attachement.
> Elle ne remplace pas les sources détaillées du moteur de calcul, mais sert
> de point d'entrée rapide pour comprendre l'intention produit.

---

## Objectif du questionnaire

Le questionnaire d'attachement adulte aide le user à mieux comprendre
comment il vit le lien amoureux, la proximité, l'incertitude relationnelle
et la régulation émotionnelle dans la relation.

L'objectif n'est pas seulement de produire un score.

Le produit cherche surtout à :

- donner une lecture claire du fonctionnement relationnel global
- distinguer les grandes tendances d'anxiété et d'évitement
- identifier les déclencheurs les plus activants
- proposer une restitution utile, lisible et actionnable

---

## Ce que le questionnaire mesure

Le questionnaire repose sur `2 dimensions principales` :

- `anxiety`
- `avoidance`

Ces deux axes servent de base à toute la lecture du résultat.

- `anxiety` mesure surtout l'hyperactivation du lien, la sensibilité à
  l'incertitude, à la distance, au flou ou à la peur de perdre la relation
- `avoidance` mesure surtout la mise à distance, le besoin d'espace,
  l'inconfort face à l'intimité et certaines formes de fermeture émotionnelle

Le questionnaire contient aujourd'hui :

- `20 questions`
- `10 questions par dimension`
- une échelle de réponse de `0 à 4`

---

## Ce que le moteur calcule

Le moteur de calcul produit plusieurs niveaux de lecture.

### 1. Un profil global

Le profil global donne la lecture principale du fonctionnement relationnel.

Il permet d'indiquer si le user se situe plutôt dans une logique :

- globalement sécure
- anxieuse
- évitante
- doublement insécurisée
- mixte / nuancée

Le profil global est la porte d'entrée principale du résultat.

### 2. Les scores par dimension

Pour chaque dimension, le moteur calcule un score converti en pourcentage.

Cela permet d'obtenir :

- un score `anxiety`
- un score `avoidance`

Ces scores donnent une lecture plus fine de l'intensité de chaque axe.

### 3. Les sous-profils

Au sein de chaque dimension, le moteur identifie un sous-profil.

Exemple d'intention produit :

- un axe anxieux peut s'exprimer de manière activée, régulée ou ambivalente
- un axe évitant peut s'exprimer de manière rigide, flexible ou adaptive

Les sous-profils servent à préciser la façon dont la dimension s'exprime,
pas à remplacer la lecture globale.

### 4. Les déclencheurs

Le questionnaire identifie `11 déclencheurs` :

- `5` déclencheurs anxieux
- `5` déclencheurs évitants
- `1` déclencheur mixte : `conflict`

Les déclencheurs servent à expliquer concrètement ce qui active le système
relationnel du user.

Ils sont calculés à partir des questions associées à chaque tag puis classés
par niveau d'intensité.

L'intérêt produit est fort ici :

- les dimensions disent `sur quel axe` le user est activé
- les déclencheurs disent `comment` cela s'active dans la relation

### Structure métier d'un bloc déclencheur

Dans l'interface, un déclencheur n'est pas affiché comme un simple tag ou un
simple score.

Chaque carte déclencheur est pensée comme un mini module de lecture
relationnelle qui aide le user à comprendre :

- ce qui s'active
- ce que cela raconte de sa dynamique affective
- en quoi cela le concerne concrètement
- quoi en faire de manière utile

Le bloc trigger peut contenir `4 sections principales` :

- `Indicateur`
- `Ce genre de profil`
- `Te concernant`
- `Mon conseil`

#### 1. Indicateur

La section `Indicateur` sert à nommer clairement le sens du trigger.

Elle formule de manière simple ce que le déclencheur semble pointer dans la
relation :

- besoin de réassurance
- peur de la perte
- inconfort de la proximité
- besoin de contrôle
- etc.

Cette section joue un rôle de synthèse immédiate.
Elle aide le user à comprendre rapidement `de quoi parle` le trigger avant de
descendre dans les explications plus fines.

#### 2. Ce genre de profil

La section `Ce genre de profil` contextualise le déclencheur à un niveau plus
général.

Elle explique comment un profil ayant ce type d'activation relationnelle a
tendance à fonctionner :

- ce qu'il recherche
- ce qui l'active
- ce qu'il perçoit plus fortement
- les besoins implicites que cela peut révéler

Cette section n'est pas centrée uniquement sur la situation actuelle du user.
Elle donne une lecture plus structurelle du fonctionnement relationnel associé
au trigger.

#### 3. Te concernant

La section `Te concernant` ramène l'analyse au user.

Elle sert à personnaliser la lecture :

- ce que ce trigger semble dire de sa façon de vivre le lien
- ce que cela produit dans ses réactions
- comment cela peut se manifester dans sa relation actuelle

L'objectif est de faire le pont entre :

- une logique générale de profil
- et l'expérience concrète du user

#### 4. Mon conseil

La section `Mon conseil` traduit la lecture du trigger en utilité pratique.

Elle ne sert pas à donner une injonction abstraite.
Elle doit plutôt aider le user à :

- prendre du recul sur l'activation
- mieux nommer ce qui se joue
- éviter certaines erreurs classiques
- adopter une piste plus ajustée à son fonctionnement relationnel

L'intention produit est que le trigger ne soit pas seulement descriptif, mais
qu'il devienne actionnable.

### Variation des sections selon le niveau du trigger

Toutes les cartes trigger ne s'affichent pas de la même façon.

Le contenu dépend du niveau d'intensité du trigger :

- `low`
- `medium`
- `high`

Le principe métier est le suivant :

- un trigger `low` ne doit pas produire la même densité de lecture qu'un
  trigger `high`
- plus l'intensité est forte, plus la restitution peut être précise,
  incarnée et utile
- à l'inverse, un niveau faible doit rester plus léger et plus prudent

Concrètement :

- un `low` peut avoir un texte plus court, plus sobre, parfois avec moins de
  matière ou une formulation plus prudente
- un `medium` peut proposer une lecture plus installée, avec davantage de
  contexte
- un `high` peut déployer une lecture plus affirmée, plus fouillée et plus
  riche en conseils

Cela signifie que :

- toutes les sections ne sont pas forcément remplies avec la même profondeur
- certaines sections peuvent être plus courtes selon le niveau
- le texte d'un même trigger n'est pas identique entre un niveau faible et un
  niveau élevé

Cette logique est importante pour l'expérience utilisateur :

- elle évite de surinterpréter un signal faible
- elle donne plus de valeur aux activations les plus significatives
- elle rend la restitution plus nuancée et plus crédible

### 5. Les niveaux d'intensité

Les dimensions et les déclencheurs sont classés selon des niveaux
d'intensité du type :

- `low`
- `medium`
- `high`

Ces niveaux servent ensuite à alimenter :

- la lecture du profil global
- la sélection des sous-profils
- la restitution des déclencheurs les plus importants

---

## Ce que le user voit dans les résultats

La restitution n'est pas limitée à un score brut.

Le user peut recevoir, selon son niveau d'accès :

- un profil global
- les scores `anxiety` et `avoidance`
- les sous-profils associés
- la répartition détaillée des déclencheurs
- des explications textuelles sur le sens des résultats
- des conseils et pistes de compréhension

L'intention UX est de proposer une lecture progressive :

1. comprendre le fonctionnement global
2. voir l'intensité par dimension
3. comprendre les sous-profils
4. identifier les déclencheurs dominants
5. recevoir des conseils ou explications adaptées

---

## Valeur produit du questionnaire

Le questionnaire ne cherche pas uniquement à "classer" le user.

Sa valeur métier repose sur la combinaison de plusieurs couches :

- une lecture simple avec le profil global
- une lecture structurelle avec les 2 dimensions
- une lecture fine avec les sous-profils
- une lecture concrète avec les déclencheurs

Autrement dit :

- le `profil global` donne la direction générale
- les `dimensions` donnent l'intensité
- les `déclencheurs` donnent la matière relationnelle concrète
- les `conseils` aident à transformer cette lecture en utilité pour le user

---

## Sources détaillées

Pour le détail du moteur de calcul et des règles métier associées, voir aussi :

- `app/assets/data/attachment/tagsDocumentation.json`
- `app/assets/data/attachment/questions.json`
- `server/data/attachment/tagProfiles.json`
- `docs/business-rules.md`
- `docs/backend-questionnaires.md`
