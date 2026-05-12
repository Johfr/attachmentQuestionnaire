import { FieldValue } from 'firebase-admin/firestore'
import { DEFAULT_SITE_CONFIG, mergeSiteConfigPatch, normalizeSiteConfig, type SiteConfig, type SiteConfigPatch } from '../../app/utils/siteConfig'
import { adminDb } from './firebaseAdmin'

const SITE_CONFIG_COLLECTION = 'appConfig'
const SITE_CONFIG_DOCUMENT = 'global'

export const getSiteConfigRef = () => {
  return adminDb.collection(SITE_CONFIG_COLLECTION).doc(SITE_CONFIG_DOCUMENT)
}

export const readSiteConfig = async () => {
  const snapshot = await getSiteConfigRef().get()
  return normalizeSiteConfig(snapshot.data())
}

export const saveAppConfig = async (patch: SiteConfigPatch) => {
  const ref = getSiteConfigRef()
  const snapshot = await ref.get()
  const currentConfig = normalizeSiteConfig(snapshot.data())
  const nextConfig = mergeSiteConfigPatch(currentConfig, patch)

  await ref.set({
    ...nextConfig,
    createdAt: snapshot.exists ? (snapshot.data()?.createdAt ?? FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  return nextConfig
}

export const isResultsSharingEnabled = async () => {
  const config = await readSiteConfig()
  return config.features.resultsSharingEnabled === true
}

export const isResultsPaywallEnabled = async () => {
  const config = await readSiteConfig()
  return config.features.resultsPaywallEnabled !== false
}
