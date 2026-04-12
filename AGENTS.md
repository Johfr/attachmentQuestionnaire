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

## Edition

- preferer des modifications petites, ciblees et faciles a relire
- ne pas prendre d'initiatives produit non demandees
- quand un comportement est ambigu, privilegier l'intention metier documentee dans `docs/`
- executer ce que le user demande, sans sur-implementation non nécessaire
- garder en tête le scope
- aller au plus simple dans la demande tout en comprenant le scope, les enjeux, les régressions possibles ou les liens entre fichiers qui peuvent créer des problèmes futurs
- rester simple dans la conception, il s'agir d'un mvp en v1. Inutile de surcharger le code comme si c'était un ecommerce. Le but n'est pas de créer une usine à gaz.
- coder simple, efficace, bonne pratique, lisible et dans le cadre pose par le user

## Docs a consulter

Quand le user demande de "prendre connaissance des docs", commencer en priorite par :

- `README.md`
- `docs/user-flows.md`
- `docs/business-rules.md`
- `docs/test-regressions.md`

Puis seulement les autres docs utiles au sujet en cours.
