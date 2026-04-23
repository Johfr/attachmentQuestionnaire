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
NUXT_MAIL_REPLY_TO=
NUXT_CONTACT_RATE_LIMIT_MAX=3
NUXT_CONTACT_RATE_LIMIT_WINDOW_MS=1800000
```

`NUXT_MAIL_FROM` utilise `onboarding@resend.dev` tant que le site n'a pas de domaine propre vérifié dans Resend.
`NUXT_MAIL_REPLY_TO` peut pointer vers l'adresse Gmail ou l'adresse pro qui doit recevoir les réponses.

Important : `noreply@relation-anxieux-evitant.fr` ne peut pas être utilisé sans posséder et vérifier le domaine `relation-anxieux-evitant.fr` dans Resend.

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
