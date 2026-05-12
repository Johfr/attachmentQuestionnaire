# Tests a lancer manuellement

Ce fichier sert de checklist de non-regression.
Il couvre :
- les tests unitaires / back / logique metier
- les tests Nuxt / front / pages / composants
- les lots en cours

## Commandes globales

### Tout lancer d'un coup

```powershell
npm run test -- --run
```

## Commandes build et deploy

```powershell
npm run build:test
npm run deploy:test
npm run build:prod
npm run deploy:prod
```

Oui, c'est la commande unique la plus simple pour lancer toute la suite Vitest du repo.

### Lancer uniquement les tests unitaires

```powershell
npm run test:unit -- --run
```

### Lancer uniquement les tests Nuxt / front

```powershell
npm run test:nuxt -- --run
```

## Inventaire complet des tests unitaires / back

```powershell
npm run test -- --run test/unit/attachmentAi.generate.test.ts
npm run test -- --run test/unit/attachmentAi.prepare.test.ts
npm run test -- --run test/unit/authStore.partnerContext.test.ts
npm run test -- --run test/unit/buildDisplayResult.test.ts
npm run test -- --run test/unit/computeResults.anxiousRegularProfile.test.ts
npm run test -- --run test/unit/computeResults.validation.test.ts
npm run test -- --run test/unit/emailSync.test.ts
npm run test -- --run test/unit/example.test.ts
npm run test -- --run test/unit/partnerSharing.sessionLinking.test.ts
npm run test -- --run test/unit/paymentSync.test.ts
npm run test -- --run test/unit/resultsPost.validation.test.ts
npm run test -- --run test/unit/siteConfig.test.ts
npm run test -- --run test/unit/wizardStore.test.ts
```

## Inventaire complet des tests Nuxt / front

```powershell
npm run test -- --run test/nuxt/admin.featureFlags.test.ts
npm run test -- --run test/nuxt/asyncFallbacks.test.ts
npm run test -- --run test/nuxt/billing.paymentFlow.test.ts
npm run test -- --run test/nuxt/contact.checkoutFlow.test.ts
npm run test -- --run test/nuxt/ebook.checkoutAuth.test.ts
npm run test -- --run test/nuxt/goDeeper.accessStates.test.ts
npm run test -- --run test/nuxt/middleware.auth.test.ts
npm run test -- --run test/nuxt/middleware.questionnaire-results-guard.test.ts
npm run test -- --run test/nuxt/pages.hotResults.authReady.test.ts
npm run test -- --run test/nuxt/pages.hotResults.test.ts
npm run test -- --run test/nuxt/pages.resultsReset.test.ts
npm run test -- --run test/nuxt/pages.userResults.aiFlow.test.ts
npm run test -- --run test/nuxt/pages.userResults.test.ts
npm run test -- --run test/nuxt/profile.partnerSharing.test.ts
npm run test -- --run test/nuxt/questionnaire.submitFlow.test.ts
npm run test -- --run test/nuxt/results.premiumZone.e2e.test.ts
```

## Recommandation pratique

Si tu veux aller vite sans tout lancer a chaque fois :

1. lancer les tests minimaux du lot courant
2. si tout est vert, lancer toute la suite :

```powershell
npm run test -- --run
```
