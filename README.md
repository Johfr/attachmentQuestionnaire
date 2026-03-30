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

# 2) Installer les deps de la function SSR générée
cd .output/server
npm install --legacy-peer-deps
cd ../..

# 3) Déployer
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

# build + deploy complet
npm run build
cd .output/server && npm install --legacy-peer-deps && cd ../..
firebase deploy
```
