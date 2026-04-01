# Backend questionnaires

## Objectif

Ce document pose la convention backend pour supporter plusieurs questionnaires sans collisions de noms ni duplication de logique.

## Principe de separation

Chaque questionnaire doit avoir son namespace propre dans:

- API: `server/api/<questionnaire>/...`
- Data: `server/data/<questionnaire>/...`
- Utils metier: `server/utils/<questionnaire>/...`
- Types de requete/reponse: `app/types/...` avec noms explicites

## Convention de nommage

Toujours prefixer les fonctions et types par le questionnaire cible.

Exemple pour l'attachement:

- `computeAttachmentQuestionnaireResults`
- `buildAttachmentQuestionnaireDisplayResult`
- `buildAttachmentQuestionnaireResult`
- `ComputeAttachmentQuestionnaireResultsRequest`
- `EnrichAttachmentQuestionnaireResultsRequest`

Eviter les noms generiques comme `buildResult` ou `EnrichResultsRequest` quand ils ne sont pas partages entre plusieurs questionnaires.

## Separation calcul metier vs affichage

Conserver 2 niveaux:

1. Calcul metier brut (scores, profils, index de regulation)
2. Enrichissement affichage (datasets graphiques, labels UI, mapping tags)

Cela permet:

- de reutiliser les resultats depuis le dashboard utilisateur
- de ne pas dependre du wizard front
- de limiter la duplication entre pages

## Etat actuel (attachement)

- Donnees metier: `server/data/attachment/regulationProfiles.json`, `server/data/attachment/tagProfiles.json`
- Endpoint calcul + enrichissement: `POST /api/attachment/results`
- Endpoint enrichissement seul: `POST /api/attachment/enrich`
- Utilitaires: `server/utils/attachment/*`

## Regle pour les futurs questionnaires

Pour tout nouveau questionnaire (ex: burnout):

1. Creer `server/data/burnout/`
2. Creer `server/utils/burnout/` avec fonctions prefixees (`computeBurnoutQuestionnaireResults`, etc.)
3. Creer `server/api/burnout/` avec endpoints dedies
4. Ajouter des tests unitaires dedies dans `test/unit/`

Ne pas partager des fonctions metier entre questionnaires tant que le besoin commun n'est pas prouve.
