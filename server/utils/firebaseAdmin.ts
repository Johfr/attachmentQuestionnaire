import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function getFirebaseConfigProjectId() {
  try {
    const firebaseConfig = process.env.FIREBASE_CONFIG
    if (!firebaseConfig) return ''
    return JSON.parse(firebaseConfig).projectId || ''
  } catch {
    return ''
  }
}

const FIREBASE_PROJECT_ID = process.env.NUXT_FIREBASE_PROJECT_ID
  || process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID
  || process.env.GCLOUD_PROJECT
  || getFirebaseConfigProjectId()
  || 'relation-anxieux-evitant'

function loadCredential() {
  const serviceAccountPath = process.env.NUXT_FIREBASE_SERVICE_ACCOUNT_PATH
  if (!serviceAccountPath) return undefined
  const absolutePath = resolve(serviceAccountPath)
  return cert(JSON.parse(readFileSync(absolutePath, 'utf8')))
}

if (!getApps().length) {
  const credential = loadCredential()
  const base = credential ? { credential } : {}
  initializeApp({ ...base, projectId: FIREBASE_PROJECT_ID })
}

export const adminDb = getFirestore()
export const adminAuth = getAuth()
