/**
 * Global setup for the nuxt test project.
 *
 * Mocks the Firebase SDK (client) before the Nuxt test environment
 * initializes the app. Without this, app.vue -> stores/auth ->
 * composables/firebase/init.js loads the Firebase SDK which uses protobufjs/long,
 * and that fails with "util.Long.fromNumber is not a function" in happy-dom.
 */

import { vi } from 'vitest'

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApp: vi.fn(() => ({})),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  // Must invoke callback immediately so initAuth()'s internal Promise resolves.
  // Without this, the first test that runs the auth middleware would hang forever
  // because _clientInitDone is false and the returned Promise never resolves.
  onAuthStateChanged: vi.fn((auth, callback) => {
    if (typeof callback === 'function') callback(null) // no user logged in
    return vi.fn() // unsubscribe fn
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInAnonymously: vi.fn(),
  EmailAuthProvider: vi.fn(),
  linkWithCredential: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn(() => ({})),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
}))

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(false),
}))

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}))
