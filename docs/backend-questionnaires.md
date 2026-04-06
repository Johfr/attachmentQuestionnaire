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

## Persistance Firestore des resultats

### Collections

- `questionnaireSessions/{sessionId}`: contexte relationnel, reponses, resultats calcules, billingInfo (acces payes par le user)
- `questionnaireSessions/{sessionId}/aiExchange/result`: entree user, sortie IA, statut de generation

### Flow recommande (cas 1)

1. Le front envoie les reponses au endpoint Nuxt.
2. Nuxt calcule les resultats et construit le payload de session.
3. Nuxt tente la persistance Firestore dans la meme requete.
4. Nuxt renvoie les resultats chauds au front avec meta de persistance:
   - `persisted: boolean`
   - `sessionId: string`
   - `persistErrorCode: string | null`
5. Si `persisted=false`, le front lance un retry cible vers un endpoint de persistance uniquement (sans recalcul).

### Retry cible idempotent

- Endpoint dedie: persistance seule, sans `buildResult`
- Idempotence: ecriture via docId stable (`sessionId`) + controle `requestId`
- Strategie front:
  - tentative immediate
  - backoff 2s, 8s, 20s (max 3 essais)
  - si echec final: marquer la session `pending_retry` et relancer au prochain ecran dashboard/results

### Pourquoi ce mode hybride

- Affichage immediat (pas de latence supplementaire pour lire Firestore)
- Source de verite persistante pour dashboard et historique
- Recuperation fiable en cas de panne reseau temporaire

### Dashboard (cas 2)

- Le dashboard lit Firestore comme source principale.
- Afficher la liste des sessions (date, scores, profil global, acces).
- Charger le detail au clic si besoin UX/perf.

### Indexation et couts

Les champs volumineux et rarement filtres doivent etre desindexes:

- `questionnaireSessions.answers`
- `questionnaireSessions.result.triggers`
- `aiExchange.userInput`
- `aiExchange.output`

La config est dans `firestore.indexes.json`.
