# Architecture du projet — Point d'entrée

> **Lire d'abord le README** à la racine du projet (`README.md`). Il couvre : installation, commandes dev/build/deploy, configuration Firebase, ports émulateurs.  
> Ce fichier couvre ce que le README ne documente pas : décisions techniques, flux métier, conventions et pièges connus.

---

## Présentation du produit

**Site** : https://relation-anxieux-evitant.web.app/  
**Statut** : non diffusé au public — en cours de finalisation (Stripe + API OpenAI à compléter).

Outil de compréhension de l'attachement adulte, centré sur la dynamique anxieux-évitant.  
Fonctionnalités actuelles :
- Questionnaire d'attachement (~8-15 min) → résultats avec profil global + sous-profils anxiété/évitement + triggers
- Historique des sessions dans le dashboard utilisateur (`/user/profil`)
- Accès payant aux résultats détaillés et à l'analyse IA (via Stripe)

Fonctionnalités à venir :
- Blog articles (v2)
- Autres questionnaires (compatibilité, conscience émotionnelle, activation quotidienne)
- Analyse IA OpenAI des résultats

---

## Stack

| Couche | Technologie |
|---|---|
| Framework front | Nuxt 4 (SSR) |
| State | Pinia |
| Style | Tailwind CSS |
| Auth + DB | Firebase (Firestore + Auth) |
| Hébergement | Firebase Hosting + Cloud Functions gen2 |
| Paiement | Stripe via Firebase Extension |
| Tests | Vitest + @nuxt/test-utils |
| Node requis | **20** (Node 24 casse la résolution firebase-functions) |

---

## Arborescence critique

```
app/                    → tout le front (pages, composants, stores, utils)
  pages/
    index.vue           → home (liste questionnaires + articles récents)
    questionnaires.vue  → catalogue questionnaires
    blog.vue            → catalogue articles
    glossaire.vue
    Attachement-styles.vue
    attachment-questionnaire/
      introduction.vue  → landing + auth avant de commencer
      questionnaire.vue → wizard (auth requis, noindex)
      results.vue       → résultats chauds (auth requis, noindex)
    user/
      profil.vue        → dashboard historique (auth requis, noindex)
  stores/
    auth.ts             → user, login, partnerContext
    attachmentQuestionnaireWizard.ts → état du wizard (questions, réponses)
    attachmentQuestionnaireResults.ts
    attachmentQuestionnaireResultsDb.ts
    questionnaireSessions.ts → lecture Firestore des sessions
    billing.ts          → Stripe checkout + checkUserPermissions
  utils/
    attachmentProfileTranslations.ts → dictionnaire FR des profils (voir section Profils)
  types/
    questionnaireSessions.ts → type QuestionnaireSession (source de vérité)
    billing.ts          → EntityType, EntitySubType, AccessType, EntityVersion

server/                 → backend Nuxt (à la racine, PAS dans app/)
  api/attachment/
    results.post.ts     → calcul + persistance Firestore
    enrich.post.ts      → enrichissement affichage seul
    display-from-session.post.ts
  data/attachment/
    regulationProfiles.json
    tagProfiles.json
  utils/attachment/
    buildQuestionnaireSessionDoc.ts → construit le doc Firestore
    (autres utilitaires métier)

functions/              → Cloud Functions custom Firebase (JS, codebase "custom")
  index.js              → quasi-vide, Cloud Function paiement→session à implémenter

docs/                   → documentation (ce dossier)
```

> **Point critique** : `server/` est à la racine du projet, pas dans `app/`. Nuxt le résout bien, mais c'est non-évident. Si une route API renvoie 404 après ajout de fichier → redémarrer `npm run dev`.

---

## Flux questionnaire complet

```
/attachment-questionnaire/introduction
  → auth (login ou register, via LoginModal)
  → save partnerContext (prénom + âge du partenaire) dans Firestore
  → wizardStore.start()

/attachment-questionnaire/questionnaire
  → middleware auth (redirect si non connecté)
  → wizard : affiche questions une par une
  → wizardStore.complete(results)

/attachment-questionnaire/results
  → middleware auth + questionnaire-results-guard
  → POST /api/attachment/results { results, questions, relationContext }
    ← { results: DisplayResults, sessionId, persisted, persistErrorCode }
  → si persisted=false → retry (backoff 2s / 8s / 20s) via endpoint dédié
  → affichage résultats chauds + paywall si hasPaidResults=false
```

---

## Modèle de données Firestore

### `questionnaireSessions/{sessionId}`

```typescript
{
  result: {
    anxietyScore: number
    avoidanceScore: number
    globalProfile: string        // clé profil (ex: "anxiousActivated")
    anxietySubProfile: string
    avoidanceSubProfile: string
    triggers: string[]
  }
  billingInfo: {
    hasPaidResults: boolean      // accès résultats détaillés
    hasPaidIa: boolean           // accès analyse IA
    hasPaidMembership: boolean   // abonnement
    hasPaidFormation: boolean    // formation
  }
  persist: {
    status: string
    retryCount: number
    lastAttemptAt: Timestamp | null
    lastErrorCode: string | null
  }
  // PAS de champ summary ni access — supprimés lors du refactor billingInfo
}
```

### `questionnaireSessions/{sessionId}/aiExchange/result`

Input user, output IA, statut de génération.

### Collections Stripe (gérées par l'extension Firebase)

```
customers/{uid}/payments/{paymentId}      → paiements one-time
customers/{uid}/subscriptions/{id}        → abonnements
customers/{uid}/checkout_sessions/{id}    → sessions Stripe Checkout
```

---

## Flux Stripe / Billing

### Produits (IDs en dur dans `app/stores/billing.ts`)

| Produit | Product ID | Price ID |
|---|---|---|
| Résultats détaillés | `prod_UFEBJxvgmXlOxL` | `price_1TGjipPH1HNS3Ks3YWPBQC7e` |
| Analyse IA | `prod_UFEBeMrgvlyq7q` | `price_1TGjjVPH1HNS3Ks362PNQVov` |
| Abonnement membership | `prod_UFEDIkXmyJC4xO` | `price_1TGjkrPH1HNS3Ks3Xajcb96w` |

### Metadata sur le checkout_session Firestore

Lors de la création d'un checkout, le store écrit ces metadata sur le doc `checkout_sessions` :

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

Relit les subcollections Stripe côté client pour peupler `billingInfo` :
- `payments` où `status == 'succeeded'` → mappe product IDs → `hasPaidResults`/`hasPaidIa`
- `subscriptions` où `status in ['active', 'trialing']` → `hasPaidMembership`

### ⏳ Cloud Function à implémenter (`functions/index.js`)

Trigger : `onDocumentWritten('customers/{uid}/payments/{paymentId}')` (v2)  
Rôle : quand `after.status === 'succeeded'`, lire le `metadata.docId` (= sessionId) et `metadata.accessType` depuis le checkout_session associé, puis mettre à jour `questionnaireSessions/{docId}/billingInfo.hasPaidResults` ou `hasPaidResults` selon `accessType`.  
Idempotence : vérifier que le champ n'est pas déjà `true` avant d'écrire.  
Note : `membership` et `formation` ne mettent pas à jour une session spécifique — `checkUserPermissions()` les relit côté client.

---

## Profils d'attachement

Les clés de profil sont des chaînes anglaises (ex: `"anxiousActivated"`). Le dictionnaire de traduction FR est centralisé dans :

```
app/utils/attachmentProfileTranslations.ts
```

```typescript
import { getProfileLabel } from '~/utils/attachmentProfileTranslations'
getProfileLabel('anxiousActivated') // → "Anxieux activé"
```

**Ne pas** importer les JSON de profils pour les labels UI — ce fichier est la source unique.  
Utilisé par : `Results.vue`, `UserProgress.vue`, `profil.vue`.

Clés existantes : `globallySecure`, `anxious`, `dismissiveAvoidant`, `fearfulAvoidant`, `mixedProfile`, `anxiousActivated`, `anxiousRegulated`, `anxiousAmbivalent`, `avoidantRigid`, `avoidantFlexible`, `avoidantAdaptive`, `fearfulAvoidantActivated`, `notSignificant`.

---

## Conventions Pinia + SSR

### ⚠️ Contrainte SSR critique

`useAuthStore()` (et tout autre composable Nuxt) **ne peut pas** être appelé au niveau module d'un store. Il doit être appelé à l'intérieur du callback `defineStore`.

```typescript
// ❌ Cassé en SSR → Pinia 500 "getActivePinia() was called but there was no active Pinia"
const authStore = useAuthStore()
export const useBillingStore = defineStore('billing', () => { ... })

// ✅ Correct
export const useBillingStore = defineStore('billing', () => {
  const authStore = useAuthStore()
  ...
})
```

---

## SEO

- `useSeoMeta()` sur chaque page publique (title, description, keywords, og:*, canonical)
- `useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })` sur les pages privées (questionnaire, results, profil)
- JSON-LD `WebSite` sur `/`, `WebApplication` (offer gratuite) sur `/introduction`
- `titleTemplate: '%s | Relation anxieux-évitant'` configuré globalement dans `nuxt.config.ts`
- `robots.txt` : `Disallow` explicites sur `/user/`, `/attachment-questionnaire/questionnaire`, `/attachment-questionnaire/results`
- Sitemap généré par `@nuxtjs/sitemap`, exclut les pages privées

---

## Autres documents

| Fichier | Sujet |
|---|---|
| `docs/backend-questionnaires.md` | Convention multi-questionnaires, namespacing API/data/utils, flow persistance Firestore, retry idempotent |
| `docs/tests.md` | Architecture tests Vitest/Nuxt, mock Firebase global, règles absolues (ne pas mocker useRouter/useNuxtApp), patterns par type de test |

---

## Statut et tâches en attente

- [ ] **Cloud Function** paiement → mise à jour `billingInfo` dans `questionnaireSessions` (`functions/index.js`)
- [ ] **Intégration OpenAI** : génération de l'analyse IA des résultats
- [ ] **Finaliser Stripe** end-to-end (checkout → webhook → déblocage contenu)
- [ ] **Blog v2** : pages articles individuelles avec SEO (JSON-LD `Article`, og:article:*)
- [ ] Mise à jour Node 20 → version suivante quand Firebase la proposera en prod
