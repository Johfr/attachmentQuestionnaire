# AGENTS

Ce fichier capture les regles de collaboration attendues pour les agents qui travaillent sur ce depot.

## Priorites

- privilegier la qualite du code : robuste, lisible, performante, accessible
- preserver la coherence metier et UX avant de "nettoyer" ou simplifier
- traiter la documentation comme de la memoire projet, pas comme du bruit

## Commentaires et doc existante

- ne pas supprimer ou reecrire aggressivement les commentaires existants sans demande explicite
- certains commentaires HTML, notes de debug et explications de README servent de memoire projet
- sur la doc, faire des changements minimaux et factuels
- ne pas condenser ou "nettoyer" la doc si cela risque de supprimer un contexte utile

## Tests

- les tests cibles lies au changement peuvent etre lances par defaut
- privilegier les tests cibles avant la suite complete
- si une commande de test echoue a cause du sandbox ou d'un `EPERM` / `spawn`, l'agent peut demander automatiquement une escalation pour relancer la meme commande
- si un test echoue avec `spawn EPERM` / `esbuild` dans cet environnement, l'agent doit relancer directement la meme commande hors sandbox plutot que considerer cela comme un signal de regression produit
- ne pas lancer de commandes lourdes ou inutiles si un test cible suffit
- ne lancer aucun test sans demande explicite du user

## Git

- ne jamais faire de commit sans accord explicite du user
- ne jamais faire de commit ou de push sans demande claire et explicite du user
- ne jamais faire d'amend sans accord explicite du user
- ne jamais revert des changements non compris ou non demandes
- ne jamais lancer de build sans demande explicite du user
- ne jamais lancer de commit sans demande explicite du user
- ne jamais lancer de push sans demande explicite du user
- tout deploy doit preciser l'environnement cible
- si l'environnement de deploy n'est pas explicitement donne par le user, demander clairement `test` ou `prod`
- ne jamais supposer un deploy `test` ou `prod`
- les scripts du depot sont cables avec `prod` par defaut, mais ce defaut ne remplace pas la confirmation explicite du user avant un deploy

## Edition

- preferer des modifications petites, ciblees et faciles a relire
- ne pas prendre d'initiatives produit non demandees
- quand un comportement est ambigu, privilegier l'intention metier documentee dans `docs/`
- executer ce que le user demande, sans sur-implementation non nécessaire
- garder en tête le scope
- aller au plus simple dans la demande tout en comprenant le scope, les enjeux, les régressions possibles ou les liens entre fichiers qui peuvent créer des problèmes futurs
- rester simple dans la conception, il s'agir d'un mvp en v1. Inutile de surcharger le code comme si c'était un ecommerce. Le but n'est pas de créer une usine à gaz.
- coder simple, efficace, bonne pratique, lisible et dans le cadre pose par le user
- Aucune regression n'est admise. fais bien attention à comprendre le code et à appliquer un correctif sans effet de bord ni regression. Si tu dois explorer le code plus profondément, fais le.

## Encodage

- considerer `UTF-8` comme la source de verite pour les fichiers texte du depot
- ne pas prendre l'affichage PowerShell comme preuve suffisante d'un probleme d'encodage
- si un texte semble corrompu dans le terminal, verifier d'abord le contenu disque en lecture `utf8`
- eviter les reecritures shell de masse sur les fichiers texte si un edit cible suffit
- en cas de doute sur un mojibake, corriger le contenu reel du fichier, pas seulement son affichage console

## Instruction spcifique à chatGpt
si un correctif t’oblige à introduire un nouveau mode d’auth, un nouveau flux backend, une nouvelle persistance, ou une hypothèse métier non demandée, tu dois t’arrêter et poser une question
si ça reste dans le cadre existant, je code sans bruit
si le template existe déjà, je modifie localement, je ne “refais” pas le composant

## Docs a consulter

Quand le user demande de "prendre connaissance des docs", commencer en priorite par :

- `README.md`
- `docs/user-flows.md`
- `docs/business-rules.md`
- `docs/test-regressions.md`

Puis seulement les autres docs utiles au sujet en cours.
