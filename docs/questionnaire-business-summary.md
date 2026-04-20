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
- `app/assets/data/attachment/tagsProfils.json`
- `docs/business-rules.md`
- `docs/backend-questionnaires.md`
