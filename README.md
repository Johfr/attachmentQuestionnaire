# Attachement Questionnaire - Front (Nuxt SSR + Firebase)

Application Nuxt 4 en SSR pour le questionnaire d'attachement, avec:

- frontend Nuxt/Vue
- store Pinia
- style Tailwind
- routes API serveur Nuxt (dossier `server/api`)
- hébergement et exécution SSR sur Firebase (Hosting + Cloud Functions)
- Firestore (rules + indexes)

## Stack technique

- Node.js: 20 (recommandé)
- Nuxt: 4
- Firebase:
	- Hosting
	- Cloud Functions gen2
	- Firestore
	- Emulators

## Prérequis

1. Installer Node.js 20
2. Installer Firebase CLI

```bash
npm install -g firebase-tools
```

3. Se connecter à Firebase

```bash
firebase login
```

## Installation

Depuis la racine du projet:

```bash
npm install
```

Installer aussi les dépendances des fonctions custom:

```bash
cd functions
npm install
cd ..
```

## Lancer en développement

```bash
npm run dev
```

Application disponible sur http://localhost:3000

## Tests

```bash
npm run test
npm run test:watch
npm run test:unit
npm run test:nuxt
```

## Documentation backend

- Convention multi-questionnaires: `docs/backend-questionnaires.md`
- Persistance Firestore des sessions + retry idempotent: `docs/backend-questionnaires.md` (section "Persistance Firestore des resultats")

## Persistance des resultats

Flow cible en production:

1. Le front envoie les reponses au endpoint Nuxt.
2. Nuxt calcule les resultats et tente l'ecriture Firestore.
3. Nuxt renvoie les resultats chauds + meta de persistance (`persisted`, `sessionId`, `persistErrorCode`).
4. Si la persistance echoue, le front lance un retry cible idempotent (sans recalcul).

Structure BDD:

- `questionnaireSessions/{sessionId}`: reponses, scores, summary, acces
- `questionnaireSessions/{sessionId}/aiExchange/result`: input user, output IA, statut

## Build production

```bash
npm run build
```

Ce build génère:

- `.output/public` pour Firebase Hosting
- `.output/server` pour la Function SSR

Le script `postbuild` retire automatiquement la dépendance Windows `@img/sharp-win32-x64` du package SSR généré pour éviter l'erreur de plateforme au déploiement Linux Firebase.

## Preview local du build

```bash
npm run preview
```

## Déploiement Firebase (SSR + Hosting + Firestore + custom functions)

Ordre recommandé:

```bash
# 1) Build Nuxt SSR
npm run build

# 2) Déployer
firebase deploy
```

Le build génère maintenant un `.output/server/package.json` déterministe et son `package-lock.json`.
Il ne faut pas installer manuellement des dépendances dans `.output/server` avant le déploiement.

Si un déploiement SSR échoue après une modification de dépendances, la bonne remise à plat est:

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

## Déploiements ciblés utiles

```bash
# Hosting + function SSR Nuxt
firebase deploy --only hosting,functions:nuxt-ssr

# Fonctions custom uniquement (dossier functions/)
firebase deploy --only functions:custom

# Firestore uniquement
firebase deploy --only firestore
```

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

Ports configurés:

- Auth: 9099
- Functions: 5001
- Firestore: 8080
- Hosting: 5000
- Emulator UI: activée

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
- `firebase.json`: config déploiement Firebase
- `firestore.rules` / `firestore.indexes.json`: sécurité/index Firestore

## Notes importantes

- Runtime Node.js 20 est actuellement utilisé pour les fonctions.
- Firebase affiche un avertissement de fin de support future de Node 20: prévoir une montée de version quand Firebase proposera la version suivante en production.
- Si une route API Nuxt renvoie 404 après ajout/déplacement de fichier, redémarrer `npm run dev`.

## Commandes rapides (copier/coller)

```bash
# dev
npm run dev
```

```powershell
# build + deploy complet (PowerShell)
npm run build
nvm use 20.19.5
npm install --no-save --no-package-lock firebase-functions firebase-admin
firebase deploy
```

> **Note** : Ne pas faire `cd .output/server && npm install` — le postbuild gère `.output/server` automatiquement.
> `firebase-functions` et `firebase-admin` ne sont pas dans le `package.json` racine, d'où l'install temporaire avant deploy (sans `--no-package-lock` = lock modifié = `npm ci` Cloud Run en échec).

> **⚠️ Si `firebase deploy` échoue (exit code 1 sur les fonctions)** : les fichiers hosting sont uploadés mais la release n'est pas finalisée. La version live garde les anciens fichiers → mismatch de hash CSS → CSS 404. Fix :
> ```powershell
> firebase deploy --only hosting
> ```
