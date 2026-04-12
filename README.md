# Attachement Questionnaire - Front (Nuxt SSR + Firebase)

Application Nuxt 4 en SSR pour le questionnaire d'attachement, avec:

- frontend Nuxt/Vue
- store Pinia
- style Tailwind
- routes API serveur Nuxt (dossier `server/api`)
- hebergement et execution SSR sur Firebase (Hosting + Cloud Functions)
- Firestore (rules + indexes)

## Stack technique

- Node.js: 22 (recommande, version locale cible : `22.19.0`)
- Nuxt: 4
- Firebase:
	- Hosting
	- Cloud Functions gen2
	- Firestore
	- Emulators

## Prerequis

1. Installer Node.js 22 (`22.19.0` recommande sur ce projet)
2. Installer Firebase CLI

```bash
npm install -g firebase-tools
```

3. Se connecter a Firebase

```bash
firebase login
```

## Installation

Depuis la racine du projet:

```bash
npm install
```

Installer aussi les dependances des fonctions custom:

```bash
cd functions
npm install
cd ..
```

## Lancer en developpement

```bash
npm run dev
```

Application disponible sur http://localhost:3000

## Tests

```bash
# Lancer tous les tests (unit + nuxt) une seule fois
npm run test -- --run

# Mode watch (relance sur modification)
npm run test:watch

# Tests unitaires uniquement (server utils, stores, helpers)
npm run test:unit -- --run

# Tests d'integration Nuxt uniquement (pages, middlewares, billing flow)
npm run test:nuxt -- --run
```

## Documentation backend

- Convention multi-questionnaires: `docs/backend-questionnaires.md`
- Persistance Firestore des sessions + cible de retry idempotent: `docs/backend-questionnaires.md` (section "Persistance Firestore des resultats")

> **Note doc** : ces fichiers servent aussi de memoire projet. Ils conservent des erreurs deja rencontrees, des pieges de build/deploy et des procedures de resolution qui evitent de tourner en boucle sur des problemes connus. En les mettant a jour, preferer des corrections ciblees plutot qu'une simplification qui ferait perdre ce contexte.

## Persistance des resultats

Flow cible en production:

1. Le front envoie les reponses au endpoint Nuxt.
2. Nuxt calcule les resultats et tente l'ecriture Firestore.
3. Nuxt renvoie les resultats chauds + meta de persistance (`persisted`, `sessionId`, `persistErrorCode`).
4. Si la persistance echoue, le front relance actuellement le meme endpoint `/api/attachment/results`. Le retry idempotent sans recalcul reste la cible documentee.

Structure BDD:

- `questionnaireSessions/{sessionId}`: reponses, scores, result, billingInfo, persist
- `questionnaireSessions/{sessionId}/aiExchange/result`: input user, output IA, statut

## Build production

```bash
npm run build
```

> **Note timeout** : sur cette app, le build complet prend en moyenne `4 min 30` sur la machine projet. Si une commande CI/agent ou un terminal outille impose un timeout trop court, prevoir une marge confortable plutot que conclure trop vite a un echec du build.

Ce build genere:

- `.output/public` pour Firebase Hosting
- `.output/server` pour la Function SSR

Le script `postbuild` retire automatiquement la dependance Windows `@img/sharp-win32-x64` du package SSR genere pour eviter l'erreur de plateforme au deploiement Linux Firebase.
Il force aussi `engines.node = 22` dans `.output/server/package.json` pour garder le runtime SSR aligne avec Firebase au prochain deploy.

## Preview local du build

```bash
npm run preview
```

## Deploiement Firebase (SSR + Hosting + Firestore + custom functions)

Ordre recommande:

```bash
# 1) Build Nuxt SSR
npm run build

# 2) Deployer
firebase deploy
```

Pour un deploy plus safe et plus lisible en pratique, preferer souvent les commandes separees :

```bash
# 1) Build Nuxt SSR
npm run build

# 2) Deployer les functions
firebase deploy --only functions:nuxt-ssr,functions:custom

# 3) Deployer Hosting
firebase deploy --only hosting
```

> **Note CLI locale** : si la commande globale `firebase` est casse (ex : install globale corrompue sous Windows/pnpm), le fallback fiable pour ce projet est `npx firebase-tools ...`. Verifie sur cette passe Node 22 : `npx firebase-tools --version` retourne bien une CLI exploitable.

Cette sequence evite les longues attentes d'un deploy complet quand seul Hosting ou les Functions doivent etre finalises, et permet aussi de finaliser rapidement Hosting si le deploy global bute sur un sujet operationnel annexe.

Le build genere maintenant un `.output/server/package.json` deterministe et son `package-lock.json`.
Il ne faut pas installer manuellement des dependances dans `.output/server` avant le deploiement.

Si un deploiement SSR echoue apres une modification de dependances, la bonne remise a plat est:

```bash
rm -rf .output
npm run build
firebase deploy
```

Sous Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .output
npm run build
firebase deploy
```

## Deploiements cibles utiles

```bash
# Hosting + function SSR Nuxt
firebase deploy --only hosting,functions:nuxt-ssr

# Fonctions custom uniquement (dossier functions/)
firebase deploy --only functions:custom

# Firestore uniquement
firebase deploy --only firestore
```

Si la CLI remonte un avertissement/erreur sur la cleanup policy Artifact Registry apres un deploy Functions, configurer une policy explicite une fois pour toutes :

```bash
firebase functions:artifacts:setpolicy --location us-central1
```

La doc Firebase indique qu'une retention de 1 jour est appliquee par defaut par cette commande, ce qui suffit generalement pour eviter l'accumulation d'images de build.

## Configuration Firebase actuelle

- codebase SSR Nuxt:
	- source: `.output/server`
	- codebase: `nuxt-ssr`
- codebase Cloud Functions custom:
	- source: `functions`
	- codebase: `custom`
- hosting:
	- public: `.output/public`
	- rewrite `**` vers la function `server`

## Emulators

Ports configures:

- Auth: 9099
- Functions: 5001
- Firestore: 8080
- Hosting: 5000
- Emulator UI: activee

Lancement standard:

```bash
firebase emulators:start
```

Functions uniquement:

```bash
cd functions
npm run serve
```

## Arborescence utile

- `app/`: pages, composants, stores, assets
- `server/api/`: endpoints backend Nuxt (SSR)
- `functions/`: Cloud Functions custom Firebase
- `test/unit/`: tests unitaires
- `firebase.json`: config deploiement Firebase
- `firestore.rules` / `firestore.indexes.json`: securite/index Firestore

## Notes importantes

- Runtime Node.js 22 est maintenant utilise pour les fonctions.
- Le runtime est explicite a deux endroits pour eviter les derives entre codebases :
  - `firebase.json` force `runtime: nodejs22` pour `nuxt-ssr` et `custom`
  - `functions/package.json` declare `engines.node = 22`
- La version locale cible est aussi epinglee dans `.nvmrc` (`22.19.0`) pour eviter les builds relances sous une version differente.
- Si une route API Nuxt renvoie 404 apres ajout/deplacement de fichier, redemarrer `npm run dev`.

## Commandes rapides (copier/coller)

```bash
# dev
npm run dev
```

```powershell
# build + deploy complet (PowerShell)
npm run build
nvm use 22
npm install --no-save --no-package-lock firebase-functions firebase-admin
firebase deploy
```

> **Note** : Ne pas faire `cd .output/server && npm install` - le postbuild gere `.output/server` automatiquement.
> Historiquement, `firebase-functions` et `firebase-admin` ont pose probleme au deploy quand ils n'etaient pas correctement presents dans le package SSR. Ils sont maintenant bien declares dans le `package.json` racine, mais cette note reste utile comme memoire de debug si un probleme similaire reapparait.

> **Si `firebase deploy` echoue (exit code 1 sur les fonctions)** : les fichiers hosting sont uploades mais la release n'est pas finalisee. La version live garde les anciens fichiers -> mismatch de hash CSS -> CSS 404. Fix :
> ```powershell
> firebase deploy --only hosting
> ```
