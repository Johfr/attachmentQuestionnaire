# Partage partenaire

Cette doc cadre le workflow de partage des résultats du questionnaire d'attachement.
Elle sert de mémoire projet pour éviter les régressions sur le profil et sur la liaison entre sessions.

## Objectif

Permettre à un user qui a déjà passé le questionnaire :

- d'inviter son/sa partenaire à passer le questionnaire
- de relier deux sessions entre elles
- d'afficher dans le profil son résultat et celui du/de la partenaire
- de porter la logique uniquement dans `questionnaireSessions`, sans toucher à `users`

## Principe métier retenu

- l'entrée se fait depuis le profil
- l'icône de partage entre les deux résultats reste visible tant qu'aucune liaison n'est faite
- le clic ouvre toujours une popin avec un champ email
- l'email est vérifié au moment de l'envoi
- la liaison finale se fait toujours entre deux `sessionId`
- on n'essaie jamais de deviner automatiquement une "dernière session"

## Feature flag global

Le partage partenaire est piloté par une configuration globale stockée dans Firestore :

- collection : `appConfig`
- document : `global`
- clé utilisée : `features.resultsSharing`

Comportement attendu :

- si `features.resultsSharing === false`, le bouton de partage et l'icône entre les deux résultats sont masqués dans le profil
- si `features.resultsSharing === false`, les endpoints de partage refusent aussi les requêtes
- tant que l'infrastructure email publique n'est pas prête, laisser cette feature à `false`

## Dépendance email

Le partage partenaire dépend d'un envoi d'email réel.

En l'état :

- Resend en mode sandbox ne permet l'envoi qu'à l'adresse de test du compte
- `onboarding@resend.dev` ne suffit pas pour une feature publique
- pour ouvrir la feature aux vrais users, il faudra acheter un domaine, par exemple chez OVH, puis le vérifier dans Resend

Tant que ce domaine n'est pas acheté et vérifié :

- les users ne peuvent pas recevoir les invitations de partage
- la feature doit rester désactivée via `appConfig/global.features.resultsSharing`

## Cas 1

Le partenaire existe déjà et a déjà une session `attachment` terminée.

### Parcours

1. A clique sur le bouton de partage dans son profil.
2. La popin s'ouvre.
3. A renseigne l'email du partenaire.
4. Le back détecte que cet email existe déjà et qu'une session `attachment` terminée existe aussi.
5. Un email est envoyé au partenaire B pour l'inviter à aller sur son profil.
6. La session source de A passe en `partnerShareStatus = awaiting_validation`.
7. Dans le profil de A, le bouton est remplacé par `Demande envoyée le ...`.
8. Dans le profil de B, la demande apparaît dans `Demandes de partage reçues`.
9. B choisit la session de A à relier via le sélecteur.
10. B valide la demande.
11. Les deux sessions sont enrichies en miroir avec le snapshot utile du partenaire.

### Règles importantes

- si plusieurs demandes sont reçues, elles doivent toutes s'afficher
- si plusieurs sessions de A sont disponibles, B choisit explicitement laquelle lier
- les sessions déjà `linked` ne sont jamais proposées
- les sessions déjà engagées dans un partage restent visibles dans le sélecteur avec la mention `en cours de partage...`

## Cas 2

Le partenaire n'existe pas encore ou n'a jamais passé le questionnaire.

### Parcours

1. A clique sur le bouton de partage.
2. La popin s'ouvre.
3. A renseigne l'email du/de la partenaire.
4. Le back ne trouve pas encore de session partenaire terminée.
5. Un email d'invitation est envoyé avec un lien contenant :
   - `uid`
   - `questionnaireSessionId`
6. La session de A passe en `partnerShareStatus = invite_sent`.
7. Si B clique sur le lien, il/elle arrive sur l'introduction avec les query déjà prêtes.
8. B passe le questionnaire via ce lien.
9. À la persistance des résultats, les deux sessions sont reliées automatiquement via les query reçues.

## Cas particulier

B ne clique pas sur le lien reçu, puis passe le questionnaire plus tard autrement.

### Comportement retenu

- aucun lien automatique n'est créé sans le lien
- A conserve `Demande envoyée le ...`
- si B envoie ensuite une demande vers A, alors A verra cette demande dans son profil
- au moment de la validation, A ou B choisira explicitement la session à relier si plusieurs sessions compatibles existent

## Données portées dans `relationContext`

Le but est d'éviter des lectures BDD inutiles lors de l'affichage du profil.

Chaque session liée ou en attente peut porter :

- `partnerEmail`
- `partnerUid`
- `partnerQuestionnaireSessionId`
- `partnerFirstName`
- `partnerCompletedAt`
- `partnerGlobalStyle`
- `partnerAnxietyScore`
- `partnerAvoidanceScore`
- `partnerInviteSentAt`
- `partnerShareStatus`

## États UI attendus

### Avant envoi

- bouton de partage visible
- popin fermée

### Pendant envoi

- bouton popin en loading
- double clic empêché
- overlay de confirmation affiché

### Après envoi

- overlay de succès
- état persistant `Demande envoyée le ...`

### Demande reçue

- bloc dans `Demandes de partage reçues`
- sélecteur de session
- bouton `Valider la demande`

### Liaison faite

- le bouton de partage disparaît
- un bloc `Résultat partenaire` apparaît avec :
  - style global
  - date
  - scores anxiété / évitement

## Notes d'implémentation

- `pending` doit rester tolérant sur la casse de l'email pour ne pas rater d'anciennes données
- `validate` ne doit jamais retomber sur une logique "latest session"
- les tests ciblés du workflow sont :
  - `test/unit/partnerSharing.sessionLinking.test.ts`
  - `test/nuxt/profile.partnerSharing.test.ts`

## Hors scope actuel

- badge de notification sur la navbar
- système complet de notifications
- mise à jour de `users`
- relance automatique d'une invitation déjà envoyée
