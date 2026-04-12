# Cloud Functions custom — `functions/index.js`

> Codebase Firebase : `custom`  
> Runtime : Node 22, firebase-functions v6, firebase-admin v12  
> Déploiement : `firebase deploy --only functions:custom`

---

## Vue d'ensemble

Deux fonctions Firestore v2 (`onDocumentWritten`) qui propagent les événements de paiement Stripe vers les documents `questionnaireSessions` en Firestore.

L'extension Firebase Stripe écrit dans `customers/{uid}/payments` (paiements one-time) et `customers/{uid}/subscriptions` (abonnements) — ces collections sont les sources de déclenchement.

---

## Prérequis : propagation des metadata Stripe

Stripe ne copie **pas automatiquement** les metadata du Checkout Session vers le PaymentIntent ou la Subscription. Pour que les Cloud Functions puissent lire `docId` et `accessType`, `billing.ts` doit inclure :

- `payment_intent_data.metadata` pour les paiements one-time (`mode: 'payment'`)
- `subscription_data.metadata` pour les abonnements (`mode: 'subscription'`)

Ces deux champs sont déjà ajoutés dans `app/stores/billing.ts` → `goToCheckout()`.

---

## Fonction 1 — `onPaymentWritten`

**Trigger** : `customers/{uid}/payments/{paymentId}`

**Rôle** : quand un paiement one-time passe à `status: 'succeeded'`, met à jour `billingInfo` dans la session Firestore liée.

**Champs couverts** :

| `accessType` dans metadata | Champ mis à jour |
|---|---|
| `results` | `billingInfo.hasPaidResults = true` |
| `ia` | `billingInfo.hasPaidIa = true` |
| `membership` | ignoré (abonnement → géré par `onSubscriptionWritten`) |
| `formation` | ⏳ voir section V2 ci-dessous |

**Logique** :
1. Skip si `after.status !== 'succeeded'`
2. Skip si `before.status === 'succeeded'` (idempotence — déjà traité)
3. Lit `metadata.docId` et `metadata.accessType`
4. Récupère le doc `questionnaireSessions/{docId}` — log warning si introuvable
5. Skip si le champ cible est déjà `true` (idempotence)
6. `sessionRef.update({ billingInfo.{field}: true, updatedAt: serverTimestamp() })`

---

## Fonction 2 — `onSubscriptionWritten`

**Trigger** : `customers/{uid}/subscriptions/{subscriptionId}`

**Rôle** : propage le statut d'abonnement membership à **toutes** les sessions du user.

**Logique** :
1. Skip si `before.status === after.status` (pas de changement)
2. `hasMembership = status in ['active', 'trialing']`
3. Requête toutes les sessions du user (`uid == {uid}`)
4. Batch update : `billingInfo.hasPaidMembership = hasMembership` + `updatedAt`
5. Idempotence : skip les docs déjà à la bonne valeur

**Cas couverts** :
- Abonnement activé ou première période d'essai → `true`
- Abonnement annulé, expiré, impayé, suspendu → `false`

> ⚠️ Cette fonction met à jour **toutes** les sessions du user, pas seulement la session liée au checkout. C'est voulu : le membership donne accès à l'ensemble de l'historique.

---

## ⏳ V2 — Ajout de la formation (`hasPaidFormation`)

La `formation` est un abonnement annuel (`mode: 'subscription'`, `accessType: 'formation'`). Elle n'est **pas encore gérée** par `onSubscriptionWritten` car la fonction ne distingue pas les types d'abonnements.

### Ce qu'il faut faire

1. **Lire `accessType`** depuis les metadata de la subscription :

```js
const accessType = after?.metadata?.accessType ?? null
```

2. **Mapper `accessType` → champ `billingInfo`** :

```js
const SUBSCRIPTION_FIELD_MAP = {
  membership: 'hasPaidMembership',
  formation: 'hasPaidFormation',
}
const field = SUBSCRIPTION_FIELD_MAP[accessType]
if (!field) return // accessType inconnu, skip
```

3. **Batch update sur le bon champ** au lieu de hardcoder `hasPaidMembership`.

4. **Ajouter le Product ID formation** dans `billing.ts` (actuellement `prod_xxx` — placeholder à remplacer une fois le produit créé dans Stripe Dashboard).

### Pourquoi ce n'est pas fait maintenant

- Le produit Stripe formation n'a pas encore d'ID réel (`prod_xxx`)
- La formation n'est pas encore en développement actif
- La refacto de `onSubscriptionWritten` est mineure et peut être faite en une passe quand la formation est prête

---

## Déploiement

```bash
# Depuis la racine du projet
firebase deploy --only functions:custom
```

Ou dans la séquence complète :

```bash
npm run build
firebase deploy
```

## Logs

```bash
firebase functions:log --only onPaymentWritten
firebase functions:log --only onSubscriptionWritten
```
