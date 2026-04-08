# Architecture du projet - Point d'entree

> **Lire d'abord le README** a la racine du projet (`README.md`). Il couvre : installation, commandes dev/build/deploy, configuration Firebase, ports emulators.  
> Ce fichier couvre ce que le README ne documente pas : decisions techniques, flux metier, conventions et pieges connus.  
> Comme le README, il sert aussi de memoire projet : on y garde volontairement certains retours d'experience et pieges operationnels tant qu'ils restent identifies comme tels.

---

## Presentation du produit

**Site** : https://relation-anxieux-evitant.web.app/  
**Statut** : non diffuse au public - en cours de finalisation (Stripe + API OpenAI a completer).

Outil de comprehension de l'attachement adulte, centre sur la dynamique anxieux-evitant.  
Fonctionnalites actuelles :
- Questionnaire d'attachement (~8-15 min) -> resultats avec profil global + sous-profils anxiete/evitement + triggers
- Historique des sessions dans le dashboard utilisateur (`/user/profil`)
- Acces payant aux resultats detailles et a l'analyse IA (via Stripe)

Fonctionnalites a venir :
- Blog articles (v2)
- Autres questionnaires (compatibilite, conscience emotionnelle, activation quotidienne)
- Analyse IA OpenAI des resultats

---

## Stack

| Couche | Technologie |
|---|---|
| Framework front | Nuxt 4 (SSR) |
| State | Pinia |
| Style | Tailwind CSS |
| Auth + DB | Firebase (Firestore + Auth) |
| Hebergement | Firebase Hosting + Cloud Functions gen2 |
| Paiement | Stripe via Firebase Extension |
| Tests | Vitest + @nuxt/test-utils |
| Node requis | **20** (Node 24 casse la resolution firebase-functions) |

---

## Arborescence critique

```
app/                    -> tout le front (pages, composants, stores, utils)
  pages/
    index.vue           -> home (liste questionnaires + articles recents)
    questionnaires.vue  -> catalogue questionnaires
    blog.vue            -> catalogue articles
    glossaire.vue
    Attachement-styles.vue
    attachment-questionnaire/
      introduction.vue  -> landing + auth avant de commencer
      questionnaire.vue -> wizard (auth requis, noindex)
      results.vue       -> resultats chauds (auth requis, noindex)
    user/
      profil.vue        -> dashboard historique (auth requis, noindex)
  stores/
    auth.ts             -> user, login, partnerContext
    attachmentQuestionnaireWizard.ts -> etat du wizard (questions, reponses)
    attachmentQuestionnaireResults.ts
    attachmentQuestionnaireResultsDb.ts
    questionnaireSessions.ts -> lecture Firestore des sessions
    billing.ts          -> Stripe checkout, checkUserPermissions, loadPurchaseHistory, openCustomerPortal
  utils/
    attachmentProfileTranslations.ts -> dictionnaire FR des profils (voir section Profils)
  types/
    questionnaireSessions.ts -> type QuestionnaireSession (source de verite)
    billing.ts          -> EntityType, EntitySubType, AccessType, EntityVersion, PaymentMetadata, UserPayment, UserSubscription

server/                 -> backend Nuxt (a la racine, PAS dans app/)
  api/attachment/
    results.post.ts     -> calcul + persistance Firestore
    enrich.post.ts      -> enrichissement affichage seul
    display-from-session.post.ts
  data/attachment/
    regulationProfiles.json
    tagProfiles.json
  utils/attachment/
    buildQuestionnaireSessionDoc.ts -> construit le doc Firestore
    (autres utilitaires metier)

functions/              -> Cloud Functions custom Firebase (JS, codebase "custom")
  index.js              -> onPaymentWritten + onSubscriptionWritten (voir docs/cloud-functions.md)

docs/                   -> documentation (ce dossier)
```

> **Point critique** : `server/` est a la racine du projet, pas dans `app/`. Nuxt le resout bien, mais c'est non-evident. Si une route API renvoie 404 apres ajout de fichier -> redemarrer `npm run dev`.

---

## Flux questionnaire complet

```
/attachment-questionnaire/introduction
  -> auth (login ou register, via LoginModal)
  -> save partnerContext (prenom + age du partenaire) dans Firestore
  -> wizardStore.start()

/attachment-questionnaire/questionnaire
  -> middleware auth (redirect si non connecte)
  -> wizard : affiche questions une par une
  -> wizardStore.complete(results)

/attachment-questionnaire/results
  -> middleware auth + questionnaire-results-guard
  -> POST /api/attachment/results { results, questions, relationContext }
    <- { results: DisplayResults, sessionId, persisted, persistErrorCode }
  -> si persisted=false -> retry (backoff 2s / 8s / 20s) ; la cible documentee prevoit un endpoint dedie, l'implementation actuelle relance encore `/api/attachment/results`
  -> affichage resultats chauds + paywall si hasPaidResults=false
```

---

## Modele de donnees Firestore

### `questionnaireSessions/{sessionId}`

```typescript
{
  result: {
    anxietyScore: number
    avoidanceScore: number
    globalProfile: string        // cle profil (ex: "anxiousActivated")
    anxietySubProfile: string
    avoidanceSubProfile: string
    triggers: Record<string, { score: number, level: 'low' | 'medium' | 'high' }>
  }
  billingInfo: {
    hasPaidResults: boolean      // acces resultats detailles
    hasPaidIa: boolean           // acces analyse IA
    hasPaidMembership: boolean   // abonnement
    hasPaidFormation: boolean    // formation
  }
  persist: {
    status: string
    retryCount: number
    lastAttemptAt: Timestamp | null
    lastErrorCode: string | null
  }
  // PAS de champ summary ni access - supprimes lors du refactor billingInfo
}
```

### `questionnaireSessions/{sessionId}/aiExchange/result`

Input user, output IA, statut de generation.

### Collections Stripe (gerees par l'extension Firebase)

```
customers/{uid}/payments/{paymentId}      -> paiements one-time
customers/{uid}/subscriptions/{id}        -> abonnements
customers/{uid}/checkout_sessions/{id}    -> sessions Stripe Checkout
```

---

## Flux Stripe / Billing

### Produits (IDs en dur dans `app/stores/billing.ts`)

| Produit | Product ID | Price ID |
|---|---|---|
| Resultats detailles | `prod_UFEBJxvgmXlOxL` | `price_1TGjipPH1HNS3Ks3YWPBQC7e` |
| Analyse IA | `prod_UFEBeMrgvlyq7q` | `price_1TGjjVPH1HNS3Ks362PNQVov` |
| Abonnement membership | `prod_UFEDIkXmyJC4xO` | `price_1TGjkrPH1HNS3Ks3Xajcb96w` |

### Metadata sur le checkout_session Firestore

Lors de la creation d'un checkout, le store ecrit ces metadata sur le doc `checkout_sessions` :

```typescript
{
  entityType: EntityType        // 'questionnaire' | 'article' | 'formation'
  entitySubType: EntitySubType  // 'attachment' | 'conscience' | ...
  accessType: AccessType        // 'results' | 'ia' | 'membership' | 'formation'
  entityVersion: EntityVersion  // 'v1' | 'v2' | 'v3'
  successUrl: string            // path relatif pour la redirection
  docId: string                 // sessionId Firestore
}
```

### `checkUserPermissions()`

Relit les subcollections Stripe cote client pour peupler `billingInfo` :
- `payments` ou `status == 'succeeded'` -> mappe product IDs -> `hasPaidResults`/`hasPaidIa`
- `subscriptions` ou `status in ['active', 'trialing']` -> `hasPaidMembership`

### `loadPurchaseHistory()`

Charge l'historique cote client depuis Firestore :
- `customers/{uid}/payments` (status `succeeded`) -> `payments` ref
- `customers/{uid}/subscriptions` (tous statuts) -> `subscriptions` ref

Utilise dans `profil.vue` pour afficher les sections "Mes achats" et "Gerer mon abonnement".

### `openCustomerPortal()`

Appelle la callable `ext-firestore-stripe-payments-createPortalLink` et redirige vers le portail Stripe.
Permet au user de gerer/annuler ses abonnements.

### Cloud Functions (`functions/index.js`) - implementees

Voir `docs/cloud-functions.md` pour le detail.
- `onPaymentWritten` : met a jour `billingInfo` sur la session liee au paiement one-time
- `onSubscriptionWritten` : propage le statut membership a toutes les sessions du user

---

## Profils d'attachement

Les cles de profil sont des chaines anglaises (ex: `"anxiousActivated"`). Le dictionnaire de traduction FR est centralise dans :

```
app/utils/attachmentProfileTranslations.ts
```

```typescript
import { getProfileLabel } from '~/utils/attachmentProfileTranslations'
getProfileLabel('anxiousActivated') // -> "Anxieux active"
```

**Ne pas** importer les JSON de profils pour les labels UI - ce fichier est la source unique.  
Utilise par : `Results.vue`, `UserProgress.vue`, `profil.vue`.

Cles existantes : `globallySecure`, `anxious`, `dismissiveAvoidant`, `fearfulAvoidant`, `mixedProfile`, `anxiousActivated`, `anxiousRegulated`, `anxiousAmbivalent`, `avoidantRigid`, `avoidantFlexible`, `avoidantAdaptive`, `fearfulAvoidantActivated`, `notSignificant`.

---

## Conventions Pinia + SSR

### Contrainte SSR critique

`useAuthStore()` (et tout autre composable Nuxt) **ne peut pas** etre appele au niveau module d'un store. Il doit etre appele a l'interieur du callback `defineStore`.

```typescript
// Casse en SSR -> Pinia 500 "getActivePinia() was called but there was no active Pinia"
const authStore = useAuthStore()
export const useBillingStore = defineStore('billing', () => { ... })

// Correct
export const useBillingStore = defineStore('billing', () => {
  const authStore = useAuthStore()
  ...
})
```

---

## SEO

- `useSeoMeta()` sur chaque page publique (title, description, keywords, og:*, canonical)
- `useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })` sur les pages privees (questionnaire, results, profil)
- JSON-LD `WebSite` sur `/`, `WebApplication` (offer gratuite) sur `/introduction`
- `titleTemplate: '%s | Relation anxieux-evitant'` configure globalement dans `nuxt.config.ts`
- `robots.txt` : `Disallow` explicites sur `/user/`, `/attachment-questionnaire/questionnaire`, `/attachment-questionnaire/results`
- Sitemap genere par `@nuxtjs/sitemap`, exclut les pages privees

---

## Autres documents

| Fichier | Sujet |
|---|---|
| `docs/backend-questionnaires.md` | Convention multi-questionnaires, namespacing API/data/utils, flow persistance Firestore, retry idempotent |
| `docs/tests.md` | Architecture tests Vitest/Nuxt, mock Firebase global, regles absolues (ne pas mocker useRouter/useNuxtApp), patterns par type de test |
| `docs/cloud-functions.md` | Cloud Functions Stripe : `onPaymentWritten`, `onSubscriptionWritten`, propagation metadata, note V2 formation |

---

## Statut et taches en attente

- [x] **Cloud Functions** `onPaymentWritten` + `onSubscriptionWritten` - voir `docs/cloud-functions.md`
- [x] **Billing per-session** : `Results.vue` utilise `sessionBillingInfo` (prop) au lieu du store global pour `hasPaidResults`/`hasPaidIa`
- [x] **Profil : historique achats & abonnements** - sections subscriptions (+ portail Stripe) et achats one-shot dans `profil.vue`
- [x] **Profil : tags membership/formation** - badges affiches sous les infos utilisateur si abonnement actif
- [ ] **Cloud Function formation** `hasPaidFormation` via `onSubscriptionWritten` - V2, voir note dans `docs/cloud-functions.md`
- [ ] **Integration OpenAI** : generation de l'analyse IA des resultats
- [ ] **Blog v2** : pages articles individuelles avec SEO (JSON-LD `Article`, og:article:*)
- [ ] Mise a jour Node 20 -> version suivante (**depreciation 2026-04-30, decommission 2026-10-31**)
