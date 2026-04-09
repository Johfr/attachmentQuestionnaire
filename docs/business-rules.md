# Regles metier

> Cette doc capture les regles produit a ne pas casser.
> Elle complete `user-flows.md` quand un comportement doit etre preserve
> meme si l'implementation technique evolue.

---

## Objectif

Documenter les regles metier explicites du produit pour eviter :

- les regressions UX
- les interpretations techniques trop libres
- les refactors qui cassent un comportement voulu

---

## Questionnaire d'attachement - Cooldown de repassage

### Regle metier

Un utilisateur ne peut pas repasser le questionnaire d'attachement librement.

Le cooldown actuel attendu est :

- `30 jours` entre deux passages completes du questionnaire

Cette regle existe pour :

- limiter les abus
- preserver la valeur du questionnaire
- eviter des repetitions incoherentes a la suite

---

## Cas 1 - Utilisateur deja connecte

### Situation

Le user est connecte et arrive sur :

`/attachment-questionnaire/introduction`

### Regle attendue

1. Le user clique sur le bouton de lancement du questionnaire.
2. Un loader s'affiche pendant la verification.
3. L'application verifie s'il existe une session questionnaire en BDD pour ce user.
4. Si aucune session n'existe :
   acces autorise.
5. Si une session existe mais que la derniere session complete date de plus de `30 jours` :
   acces autorise.
6. Si une session existe et que la derniere session complete date de moins de `30 jours` :
   acces refuse.

### Comportement UX attendu si acces refuse

- masquer le bouton de lancement
- masquer les formulaires
- afficher un message de type :
  `Encore X jour(s) avant de pouvoir passer de nouveau le formulaire.`

---

## Cas 2 - Utilisateur non connecte

### Situation

Le user arrive non connecte sur :

`/attachment-questionnaire/introduction`

### Regle attendue

1. Le user clique sur le bouton de lancement.
2. Il doit d'abord saisir ses informations pour se connecter ou creer son compte.
3. Il valide le formulaire.
4. Un loader s'affiche.
5. Une fois l'authentification reussie, on applique exactement la meme verification que pour un user deja connecte.

### Decision attendue

- aucune session ou derniere session > `30 jours` :
  acces autorise
- derniere session < `30 jours` :
  acces refuse

### Comportement UX attendu si acces refuse

- masquer le bouton
- masquer les formulaires
- afficher :
  `Encore X jour(s) avant de pouvoir passer de nouveau le formulaire.`

---

## Regles UX obligatoires

Les points suivants font partie du comportement produit attendu :

- le check se fait au clic sur le bouton de lancement
- un loader est visible pendant ce check
- si le user est autorise, il accede au questionnaire
- si le user n'est pas autorise, on n'affiche plus un CTA qui laisse penser qu'il peut continuer
- le message de blocage doit etre clair et actionnable

---

## Source de verite

La decision de blocage s'appuie sur les donnees BDD du user et/ou de ses sessions questionnaire.

Le produit peut utiliser un miroir dans `users/{uid}` pour accelerer la decision cote front,
mais la regle metier a retenir est simplement :

- on autorise si le dernier passage complete date de plus de `30 jours`
- on bloque sinon

Autrement dit :

la structure technique peut evoluer, mais pas cette regle.

---

## Extension future

Cette logique doit pouvoir etre appliquee a plusieurs questionnaires.

Le cooldown peut donc, a terme :

- etre defini par type de questionnaire
- varier selon le questionnaire
- etre stocke de facon centralisee dans le profil user

Mais pour le questionnaire d'attachement, la regle actuelle a conserver est :

- `1 passage maximum tous les 30 jours`

---

## Regles business - Acces payants

### Achat one-shot des resultats d'un questionnaire

Regle metier :

- `1 achat de resultats` pour un type de questionnaire donne
- donne acces a vie a `toutes les sessions` de ce meme type de questionnaire

Exemple :

- le user achete une fois les resultats du questionnaire d'attachement
- toutes ses sessions passees `attachment` deviennent accessibles
- toutes ses futures sessions `attachment` doivent aussi etre accessibles sans repayer

Cette regle s'applique par type de questionnaire.

Autrement dit :

- un achat `attachment` ne debloque pas automatiquement un autre questionnaire
- mais il debloque durablement toutes les sessions `attachment`

### Membership et formation

Les abonnements donnent des droits temporaires.

Regles metier :

- `membership` :
  acces a toutes les informations couvertes par ce niveau tant que l'abonnement est actif
- `formation` :
  acces a toutes les informations couvertes par ce niveau tant que l'abonnement est actif

Quand l'abonnement expire :

- le user perd les acces globaux lies a cet abonnement
- seuls les contenus deja achetes en one-shot restent accessibles

### Bloc IA

Le bloc IA suit une regle differente.

Regle metier :

- le bloc IA est un achat unique
- il est independant
- il ne cree pas un droit global durable
- il ne doit pas etre propage automatiquement aux autres sessions

Autrement dit :

- l'achat IA ne transforme pas toutes les sessions du meme questionnaire en sessions avec IA debloquee
- l'achat IA reste lie a la session / demande concernee

### Matrice UI - section "Aller plus loin"

Pour la section `GoDeeper` / "Aller plus loin", le rendu attendu est :

- user limite :
  bloc resultats visible + bloc IA visible
- achat one-shot des resultats uniquement :
  bloc resultats masque + bloc IA visible
- achat IA deja utilise sur la session :
  les 2 blocs d'achat sont masques
- membership ou formation actif :
  bloc resultats masque + bloc IA visible tant que l'IA n'a pas deja ete utilisee

Point important :

- si les resultats detailles sont deja accessibles via `results`, `membership`, `formation` ou `ia`,
  le bloc IA ne doit plus promettre "L'ensemble de tes resultats debloques"

---

## Ce qu'il ne faut pas casser

- un user connecte bloque ne doit pas pouvoir relancer normalement depuis l'intro
- un user non connecte ne doit pas contourner la regle en passant par l'etape d'authentification
- le message de blocage doit rester visible apres verification negative
- l'absence de session doit continuer a autoriser le premier passage
- un cooldown expire doit redonner acces sans intervention manuelle
- un achat one-shot de resultats doit continuer a debloquer toutes les sessions du meme questionnaire
- l'expiration d'un membership ou d'une formation ne doit pas supprimer les achats one-shot deja acquis
- l'achat IA ne doit jamais etre transforme en acces global durable

---

## Tests a conserver

- user connecte, derniere session < `30 jours` -> blocage + message + formulaire masque
- user connecte, aucune session -> acces autorise
- user connecte, derniere session > `30 jours` -> acces autorise
- user non connecte, auth reussie puis cooldown actif -> blocage apres verification
- user non connecte, auth reussie puis pas de cooldown -> acces autorise
- affichage du loader pendant la verification
- achat one-shot des resultats d'un questionnaire -> toutes les sessions existantes et futures du meme type sont accessibles
- expiration membership / formation -> perte des acces globaux mais conservation des achats one-shot
- achat IA -> acces seulement a la session concernee, sans propagation globale
