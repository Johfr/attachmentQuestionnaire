# Documentation des tests front-end

## Vue d'ensemble

Tests écrits avec **Vitest 4.1.0** + **@nuxt/test-utils 4.0.0**.  
Configuration dual-project dans `vitest.config.ts` :

| Projet | Env | Fichiers |
|--------|-----|---------|
| `unit` | node | `test/unit/*.test.ts` |
| `nuxt` | nuxt / happy-dom | `test/nuxt/*.test.ts` |

Lancer tous les tests : `npx vitest --reporter=verbose --run`

---

## Architecture critique : mock Firebase global

**Problème résolu** : Firebase SDK (chargé via `app.vue → stores/auth → composables/firebase/init.js`) utilise `protobufjs/long` qui crashe dans happy-dom avec `util.Long.fromNumber is not a function`.

**Solution** : `test/setup.nuxt.ts` est chargé via `setupFiles` dans `vitest.config.ts` (projet nuxt uniquement). Ce fichier mocke **tous** les modules Firebase avant l'initialisation de l'app Nuxt.

**Point critique dans ce fichier** : `onAuthStateChanged` doit invoquer son callback **immédiatement** :
```ts
onAuthStateChanged: vi.fn((auth, callback) => {
  if (typeof callback === 'function') callback(null) // pas d'user connecté
  return vi.fn() // fn de désinscription
})
```
Sans ça, `initAuth()` (store auth) crée une Promise qui ne se résout jamais car `_clientInitDone` est `false` au premier appel, et le premier test qui passe par le middleware auth **time out** à 5 000 ms.

---

## Règles absolues pour les tests nuxt

### ✅ À faire
- Mocker `useRoute` via `mockNuxtImport('useRoute', ...)` avec un objet mutable hoisted pour les pages avec `top-level await` et des query params.
- Mocker les stores via `vi.mock('~/stores/nomDuStore', ...)`.
- Mocker les composants chart via `mockComponent(...)` (chart.js crashe dans happy-dom).
- Utiliser `registerEndpoint('/api/...', { method: 'POST', handler: () => data })` pour les routes serveur.
- Utiliser des assertions DOM (`wrapper.text()`, `wrapper.find('selector').exists()`) plutôt que `findComponent({ name: '...' })`.

### ❌ À ne jamais faire
- **Ne jamais mocker `useRouter`** — `test-utils` appelle `useRouter().afterEach()` en interne pendant `setupNuxt()`. Ça provoque `router.beforeEach/afterEach/beforeResolve is not a function`.
- **Ne jamais mocker `useNuxtApp`** — ça remplace l'auto-import global et casse le composant interne `nuxt-root.mjs` de test-utils avec `nuxtApp.deferHydration is not a function`.
- **Ne pas passer `route` à `mountSuspended`** pour les pages avec `top-level await` — le setup s'exécute avant la navigation, `route.query` reste vide.

---

## Pattern type : test de page nuxt avec query params

```ts
// 1. Hoisted mutable query ref
const mockQuery = vi.hoisted(() => ({ sessionId: undefined as string | undefined }))

// 2. Mock useRoute (PAS useRouter)
mockNuxtImport('useRoute', () => () => ({
  query: mockQuery,
  params: {},
  path: '/ma/page',
  name: 'ma-page',
  fullPath: '/ma/page',
  matched: [],
  meta: {},
  hash: '',
  redirectedFrom: undefined,
}))

// 3. Dans chaque test
it('test avec sessionId', async () => {
  mockQuery.sessionId = 'abc123'  // modifier AVANT mountSuspended
  const wrapper = await mountSuspended(MaPage)
  expect(wrapper.text()).toContain('quelque chose')
})
```

---

## Pattern type : test de middleware nuxt

```ts
const mockAuthStore = vi.hoisted(() => ({
  isLoggedIn: false as boolean,
  initAuth: vi.fn().mockResolvedValue(undefined),
  openLoginModal: vi.fn(),
}))
const navigateToMock = vi.hoisted(() => vi.fn())

mockNuxtImport('navigateTo', () => navigateToMock)
vi.mock('~/stores/auth', () => ({ useAuthStore: vi.fn(() => mockAuthStore) }))

import monMiddleware from '../../app/middleware/monMiddleware'

describe('middleware/monMiddleware', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    mockAuthStore.initAuth.mockReset().mockResolvedValue(undefined)
  })

  it('redirige vers / si non connecte', async () => {
    mockAuthStore.isLoggedIn = false
    const to = { meta: { requiresAuth: true }, fullPath: '/profil' }
    await monMiddleware(to as any, {} as any)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })
})
```

---

## Pattern type : test de store pinia (unit, node env)

```ts
import { createPinia, setActivePinia } from 'pinia'

describe('monStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())  // isoler chaque test
  })

  it('état initial', () => {
    const store = useMonStore()
    expect(store.maValeur).toBe(valeurAttendue)
  })
})
```

---

## État des tests (P0 — 72/72 ✅)

### `test/unit/wizardStore.test.ts` — 21 tests
Store `attachmentQuestionnaireWizard` — machine à états :

| Groupe | Ce qui est testé |
|--------|-----------------|
| `initial state` | `currentStep='introduction'`, `hasStarted=false`, `isCompleted=false`, `result=null` |
| `start()` | `currentStep='questionnaire'`, `hasStarted=true`, `isCompleted` et `result` non modifiés |
| `complete(payload)` | stocke `result`, `isCompleted=true`, `currentStep='results'` |
| `goToIntroduction()` | retourne à `'introduction'` depuis `'questionnaire'` |
| `reset()` | remet tout à l'état initial |
| `prerequisites questionnaire page` | si `!hasStarted` → garde attendu |
| `prerequisites results guard` | si `!isCompleted \|\| !result` → redirect attendu |

### `test/nuxt/middleware.auth.test.ts` — 15 tests
Middleware `auth.ts` :
- User non connecté + route protégée (`requiresAuth:true`) → redirect `/` + `openLoginModal()`
- User connecté + route protégée → pas de redirect
- Route publique (pas de `requiresAuth`) → jamais de redirect
- `initAuth()` toujours appelé (sync état Firebase)
- Smoke test des chemins critiques : `/user/profil`, `/attachment-questionnaire/results`, etc.

### `test/nuxt/middleware.questionnaireResultsGuard.test.ts` — 5 tests
Middleware `questionnaire-results-guard.ts` :
- Toutes les combinaisons `isCompleted` × `result` null/non-null → 4 cas
- Quand tout est OK → pas de redirect

### `test/nuxt/pages.userResults.test.ts` — 10 tests
Page `pages/user/attachment-questionnaire/results.vue` :

| Test | Ce qui est vérifié |
|------|--------------------|
| sessionId étranger | message d'erreur "La session demandee est introuvable" |
| sessionId valide | date de la session visible dans le DOM |
| pas de sessionId | session la plus récente utilisée (fallback) |
| aucune session | "Aucune session attachement disponible pour le moment." |
| session sans réponses | "Cette session ne contient pas de reponses exploitables." |
| titre de page | `<h1>` présent |
| succès sans erreur | pas de balise `.text-red-600` |
| `loadSessions` appelé une seule fois | |

---

## Fichiers existants antérieurs (non-P0)

| Fichier | Env | Tests |
|---------|-----|-------|
| `test/unit/buildDisplayResult.test.ts` | node | 14 — logique de construction du résultat d'affichage |
| `test/unit/computeResults.anxiousActivated.test.ts` | node | 1 — calcul du score anxieux activé |
| `test/unit/example.test.ts` | node | 1 — test témoin |

---

## P2 — Tests à écrire (prochaine session)

### `test/unit/questionnaireSessionsStore.test.ts`
Store `questionnaireSessions` :
- Helper `getTimestampMs()` : Firestore Timestamp, objet `{seconds}`, null
- Computed `sortedSessions` : tri par `completedAt > updatedAt > createdAt`
- Computed `attachmentSessions` : filtre `type=attachment AND status=completed`
- Computed `latestAttachmentSession` : premier de `attachmentSessions`
- `ensureSessionLoaded` : ne double-appelle pas `loadSessions`
- `reset()` : vide tout l'état

### `test/unit/attachmentQuestionnaireResultsDb.test.ts`
Store `attachmentQuestionnaireResultsDb` (adaptateur in-memory) :
- save, getById, getLatest, list avec limit
- Tri par `createdAt` décroissant
- Upsert : update d'un existant vs création d'un nouveau

### `test/unit/billingStore.test.ts`
Store `billing` :
- `hasPremiumAccess` reflète `billingInfo.hasPremiumAccess`
- **Bug documenté** : `hasAccessToContent()` retourne `false` même si `hasPremiumAccess=true` (logique cassée, Stripe en cours)

### `test/nuxt/pages.userResults.edgeStates.test.ts` *(optionnel)*
- `loadingError` affiché quand `$fetch` lève une exception
- SessionId de type invalide (nombre, tableau) → traité comme absent → fallback latest

---

## Structure des mocks par store

### `~/stores/questionnaireSessions`
```ts
const mockSessionsState = vi.hoisted(() => ({
  sessions: [] as QuestionnaireSession[],
  loadSessions: vi.fn().mockResolvedValue(undefined),
  get latestAttachmentSession() { return this.sessions.find(s => s.type === 'attachment') ?? null },
  getSessionById: vi.fn((id: string) => mockSessionsState.sessions.find(s => s.id === id) ?? null),
}))
vi.mock('~/stores/questionnaireSessions', () => ({
  useQuestionnaireSessionsStore: vi.fn(() => mockSessionsState),
}))
```

### `~/stores/attachmentQuestionnaireWizard`
```ts
const mockWizardStore = vi.hoisted(() => ({
  isCompleted: false as boolean,
  result: null as any,
}))
vi.mock('~/stores/attachmentQuestionnaireWizard', () => ({
  useAttachmentQuestionnaireWizardStore: vi.fn(() => mockWizardStore),
}))
```

### `~/stores/auth`
```ts
const mockAuthStore = vi.hoisted(() => ({
  isLoggedIn: false as boolean,
  initAuth: vi.fn().mockResolvedValue(undefined),
  openLoginModal: vi.fn(),
}))
vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))
```

---

## Alias de chemin

`~` → `app/` (résolu depuis `.nuxt/tsconfig.app.json`)  
`vi.mock('~/stores/...')` fonctionne correctement dans les deux environnements.
