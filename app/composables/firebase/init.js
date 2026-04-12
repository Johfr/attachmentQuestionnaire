// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getAuth, updateProfile, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInAnonymously, EmailAuthProvider, linkWithCredential, } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyARI0Nti_u8iG_Ghg5orNMqpkiOiOxXovs",
  authDomain: "relation-anxieux-evitant.firebaseapp.com",
  projectId: "relation-anxieux-evitant",
  storageBucket: "relation-anxieux-evitant.firebasestorage.app",
  messagingSenderId: "282393099300",
  appId: "1:282393099300:web:f0c4c5211654898f32acb1",
  measurementId: "G-W2L4PDTBSR"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const functions = getFunctions(app)

// Analytics ne doit etre initialise que dans le navigateur.
if (process.client) {
  getAnalytics(app)
}


export const firebaseClient = {
  auth,
  db,
  functions,
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
  app,
  getFunctions,
  httpsCallable,
}
