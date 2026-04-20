// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getAuth, updateProfile, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInAnonymously, EmailAuthProvider, linkWithCredential, } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

let analyticsInitialized = false

const getFirebaseConfig = () => {
  const runtimeConfig = useRuntimeConfig()

  return {
    apiKey: runtimeConfig.public.firebaseApiKey,
    authDomain: runtimeConfig.public.firebaseAuthDomain,
    projectId: runtimeConfig.public.firebaseProjectId,
    storageBucket: runtimeConfig.public.firebaseStorageBucket,
    messagingSenderId: runtimeConfig.public.firebaseMessagingSenderId,
    appId: runtimeConfig.public.firebaseAppId,
    measurementId: runtimeConfig.public.firebaseMeasurementId || undefined,
  }
}

const ensureFirebaseApp = () => {
  const app = getApps().length ? getApp() : initializeApp(getFirebaseConfig())

  // Analytics ne doit etre initialise que dans le navigateur.
  if (import.meta.client && !analyticsInitialized) {
    getAnalytics(app)
    analyticsInitialized = true
  }

  return app
}


export const firebaseClient = {
  get app() {
    return ensureFirebaseApp()
  },
  get auth() {
    return getAuth(ensureFirebaseApp())
  },
  get db() {
    return getFirestore(ensureFirebaseApp())
  },
  get functions() {
    return getFunctions(ensureFirebaseApp())
  },
  getAuth,
  updateProfile,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  EmailAuthProvider,
  linkWithCredential,
  signOut,
  getFunctions,
  httpsCallable,
}
