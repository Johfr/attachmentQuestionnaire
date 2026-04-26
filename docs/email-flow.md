# Email et contact

Cette note décrit le flux email MVP du site.

## État actuel

Le formulaire de contact public de `/contact` passe par une route serveur Nuxt :

- `POST /api/contact`
- validation serveur de l'email et du message
- honeypot simple via le champ `website`
- rate limit serveur simple par `uid` si le user est connecté, sinon par hash d'IP
- écriture dans `contactRequests`
- envoi d'un email admin via Resend
- envoi d'un email de confirmation au user via Resend
- mise à jour de `mailStatus` dans le document Firestore

Important : aucun user anonyme ne doit être créé pour ce flow.

Si le user est connecté, la route enrichit la demande avec les données connues du user.  
Si le user n'est pas connecté, la demande reste volontairement minimale : `email + message`.

## Variables d'environnement

Variables serveur à renseigner dans `.env.test` et `.env.prod` :

```env
NUXT_RESEND_API_KEY=
NUXT_CONTACT_ADMIN_EMAIL=
NUXT_MAIL_FROM="Relation anxieux-evitant <onboarding@resend.dev>"
NUXT_CONTACT_RATE_LIMIT_MAX=3
NUXT_CONTACT_RATE_LIMIT_WINDOW_MS=1800000
```

`NUXT_MAIL_FROM` utilise `onboarding@resend.dev` tant que le site n'a pas de domaine propre vérifié dans Resend.

Important :

- `noreply@relation-anxieux-evitant.fr` ne peut pas être utilisé sans posséder et vérifier le domaine `relation-anxieux-evitant.fr` dans Resend
- tant que Resend reste en mode sandbox, les invitations de partage partenaire ne peuvent pas être envoyées à de vrais users
- `onboarding@resend.dev` est suffisant pour les tests du compte, pas pour une ouverture publique
- pour ouvrir cette feature, il faudra acheter un domaine, par exemple chez OVH, puis le vérifier dans Resend
- en attendant, laisser `appConfig/global.features.resultsSharing = false`

Mode transitoire partage partenaire :

- le workflow partenaire est temporairement décorrélé de Resend
- la demande de partage est enregistrée en base, mais l'email n'est pas encore envoyé
- le flow n'est autorisé que si la session a déjà accès aux résultats via `billingInfo`
- quand le domaine sera prêt, il faudra rebrancher l'appel Resend dans `POST /api/attachment/partner-share`

## État de configuration actuel

Ce qui est en place :

- `/api/contact` utilise les variables Nuxt SSR chargées depuis `.env.test` ou `.env.prod`
- `functions/index.js` déclare le secret Firebase `NUXT_RESEND_API_KEY` sur `onPaymentWritten`
- `functions/index.js` déclare aussi `NUXT_MAIL_FROM` et `NUXT_CONTACT_ADMIN_EMAIL` comme secrets Firebase sur `onPaymentWritten`
- `functions/emailSync.js` lit toujours `process.env.NUXT_RESEND_API_KEY`
- `NUXT_MAIL_FROM` a un fallback vers `Relation anxieux-evitant <onboarding@resend.dev>`
- `NUXT_CONTACT_ADMIN_EMAIL` reste une variable nécessaire pour recevoir les emails admin liés au contact et au coaching
- `NUXT_MAIL_REPLY_TO` n'est plus utilisé dans le scope actuel

À faire côté Firebase avant de compter sur les emails post-paiement :

```bash
firebase use test
firebase functions:secrets:set NUXT_RESEND_API_KEY
firebase functions:secrets:set NUXT_MAIL_FROM
firebase functions:secrets:set NUXT_CONTACT_ADMIN_EMAIL

firebase use prod
firebase functions:secrets:set NUXT_RESEND_API_KEY
firebase functions:secrets:set NUXT_MAIL_FROM
firebase functions:secrets:set NUXT_CONTACT_ADMIN_EMAIL
```

Les secrets doivent être créés sur chaque projet Firebase cible.  
Si un secret déclaré dans `functions/index.js` n'existe pas sur un projet, le deploy de la function peut échouer ou l'email post-paiement peut échouer au runtime.

## Build, deploy et variables locales

Les fichiers `.env.test` et `.env.prod` sont volontairement locaux et ignorés par Git.

Pour Nuxt SSR, les scripts `dev:*`, `build:*` et `deploy:*` chargent le bon fichier via `scripts/with-env.mjs`.  
Les valeurs sont donc disponibles au moment du build et du deploy de la fonction SSR Nuxt.

Ce mécanisme injecte directement les valeurs nécessaires à Nuxt, notamment :

- `NUXT_RESEND_API_KEY`
- `NUXT_CONTACT_ADMIN_EMAIL`
- `NUXT_MAIL_FROM`
- `NUXT_CONTACT_RATE_LIMIT_MAX`
- `NUXT_CONTACT_RATE_LIMIT_WINDOW_MS`

Attention : le codebase `functions` est séparé de Nuxt.  
Les Cloud Functions custom comme `functions/emailSync.js` ne doivent pas dépendre implicitement des fichiers `.env.test` / `.env.prod` racine au runtime Firebase.

Avant un deploy custom functions, il faut s'assurer que les variables Resend sont aussi disponibles pour les Cloud Functions du projet cible via le mécanisme Firebase choisi pour l'environnement.

Sans ces variables côté custom functions, les emails post-paiement peuvent échouer et écrire `appEmailStatus.lastError`.

Pour les emails post-paiement, les secrets à configurer côté Firebase Functions sont :

```bash
firebase functions:secrets:set NUXT_RESEND_API_KEY
firebase functions:secrets:set NUXT_MAIL_FROM
firebase functions:secrets:set NUXT_CONTACT_ADMIN_EMAIL
```

La Cloud Function `onPaymentWritten` déclare déjà ces secrets dans ses options de trigger.  
Il faut donc les créer ou les mettre à jour sur le projet Firebase cible avant de déployer cette function.

Pour la V1, les valeurs restent aussi dans `.env.test` et `.env.prod` pour Nuxt SSR :

- `NUXT_MAIL_FROM`
- `NUXT_CONTACT_ADMIN_EMAIL`
- `NUXT_CONTACT_RATE_LIMIT_MAX`
- `NUXT_CONTACT_RATE_LIMIT_WINDOW_MS`

`NUXT_MAIL_FROM` a un fallback dans `functions/emailSync.js`.  
`NUXT_CONTACT_ADMIN_EMAIL` est nécessaire pour l'email admin des paiements coaching.

Si cette variable manque côté Functions custom, l'email de confirmation user reste envoyé, mais l'email admin coaching passe en `appEmailStatus.admin: 'failed'`.

Garde-fou : quand une variable liée aux emails change dans `.env.test` ou `.env.prod`, vérifier si elle est utilisée par Nuxt SSR uniquement ou aussi par `functions/`.  
Si elle est utilisée par `functions/`, mettre à jour le secret ou la configuration serveur correspondante avant deploy.

Alertes importantes :

- ne jamais renommer une variable email dans `.env.test` ou `.env.prod` sans chercher son usage dans `server/`, `functions/` et `nuxt.config.ts`
- ne jamais mettre une clé Resend en `NUXT_PUBLIC_*`
- si `NUXT_CONTACT_ADMIN_EMAIL` change et que les emails coaching admin ne partent plus, vérifier d'abord la configuration runtime des Cloud Functions custom
- si un email contact fonctionne mais qu'un email post-paiement échoue, suspecter en priorité la différence entre Nuxt SSR et le codebase `functions`
- si les règles Firestore changent, déployer aussi les rules, pas seulement hosting/functions

Quand les règles Firestore changent, ne pas oublier de déployer aussi les rules.  
La section profil `Mes prises de contact` dépend de la règle de lecture sur `contactRequests`.

## Collection `contactRequests`

Chaque demande contient :

- `type: 'contact'`
- `status: 'new'`
- `uid` ou `null`
- `email`
- `message`
- `userSnapshot` si user connu
- `antiSpam.ipHash`
- `antiSpam.honeypotFilled`
- `antiSpam.rateLimitKey`
- `antiSpam.userAgent`
- `mailStatus.admin`
- `mailStatus.user`
- `mailStatus.adminMessageId`
- `mailStatus.userMessageId`
- `mailStatus.lastError`
- `createdAt`
- `updatedAt`

## Affichage profil

Le profil affiche une section `Mes prises de contact`.

Règle importante :

- seules les demandes avec `uid` égal au user connecté sont affichées dans son profil
- les demandes envoyées sans connexion restent stockées en base, mais ne sont pas rattachées automatiquement à un futur profil par simple email

Cette règle évite d'exposer des messages anonymes à un compte qui utiliserait la même adresse email sans preuve de rattachement au moment de l'envoi.

## Captcha restant

Le captcha n'est pas encore branché.

À faire ensuite :

- choisir le provider, recommandé : Cloudflare Turnstile
- ajouter `NUXT_PUBLIC_TURNSTILE_SITE_KEY`
- ajouter `NUXT_TURNSTILE_SECRET_KEY`
- afficher le widget sur le formulaire contact
- transmettre le token à `/api/contact`
- vérifier le token côté serveur avant écriture Firestore et avant envoi email

Le captcha doit compléter le honeypot et le rate limit, pas les remplacer.

## Rate limit contact

Le rate limit est configurable par environnement.

Valeurs recommandées :

- `.env.test` : `NUXT_CONTACT_RATE_LIMIT_MAX=999` et `NUXT_CONTACT_RATE_LIMIT_WINDOW_MS=0`
- `.env.prod` : `NUXT_CONTACT_RATE_LIMIT_MAX=3` et `NUXT_CONTACT_RATE_LIMIT_WINDOW_MS=1800000`

Une fenêtre à `0` désactive le blocage temporel, utile uniquement pour les tests manuels.

## Lot 2 - emails automatiques post-paiement

État : implémenté dans `functions/emailSync.js` et appelé depuis `onPaymentWritten`.

Objectif : envoyer des emails transactionnels après paiement réussi, sans extension Firebase payante.

Le point d'entrée recommandé est la Cloud Function existante qui observe :

- `customers/{uid}/payments/{paymentId}`

Quand un paiement passe à `status: 'succeeded'`, envoyer :

- un email de confirmation au user pour `results`, `ebook`, `coachingZen`, `coachingExpress`
- un email admin spécifique quand il s'agit d'un achat coaching

Message user attendu :

> Ton paiement de xxx pour yyy a bien été pris en compte. Tu peux retrouver toutes tes infos de paiement directement dans ton profil sur relation-anxieux-evitant.web.app/user/profil.

Pour le coaching, l'email admin doit contenir les informations utiles à la prise de contact :

- `uid`
- email client
- téléphone client si disponible
- type de séance : zen ou express
- montant
- date de paiement
- `paymentId`

Idempotence obligatoire :

- ne rien envoyer si `before.status === 'succeeded'`
- stocker un statut d'envoi pour éviter les doublons en cas de nouvelle mise à jour Firestore

L'implémentation actuelle skip également si `after.appEmailStatus.confirmation === 'sent'`.

Champ recommandé dans le document paiement :

```js
appEmailStatus: {
  confirmation: 'sent' | 'failed',
  admin: 'sent' | 'failed' | 'not_required',
  confirmationSentAt: Timestamp | null,
  adminSentAt: Timestamp | null,
  confirmationMessageId: string | null,
  adminMessageId: string | null,
  lastError: string | null,
}
```

Le lot 2 doit rester dans les Cloud Functions, pas dans le front.
