import { adminDb } from '../../../utils/firebaseAdmin'
import { getAuthenticatedUid } from '../../../utils/getAuthenticatedUid'
import { isResultsSharingEnabled } from '../../../utils/siteConfig'
import { normalizeText } from '../../../utils/attachment/partnerShare'

const getTimestampMs = (value: unknown) => {
  if (!value || typeof value !== 'object') return 0

  const candidate = value as { toMillis?: () => number; seconds?: number; _seconds?: number }

  if (typeof candidate.toMillis === 'function') {
    return candidate.toMillis()
  }

  if (typeof candidate.seconds === 'number') {
    return candidate.seconds * 1000
  }

  if (typeof candidate._seconds === 'number') {
    return candidate._seconds * 1000
  }

  return 0
}

export default defineEventHandler(async event => {
  if (!(await isResultsSharingEnabled())) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Le partage de résultats est temporairement indisponible.',
    })
  }

  const uid = await getAuthenticatedUid(event)

  const userSnap = await adminDb.collection('users').doc(uid).get()
  const userData = userSnap.data() ?? {}
  const email = normalizeText(userData.email).toLowerCase()

  if (!email) {
    return []
  }

  const snapshot = await adminDb
    .collection('questionnaireSessions')
    .where('relationContext.partnerShareStatus', '==', 'awaiting_validation')
    .get()

  const requests = await Promise.all(snapshot.docs.map(async (doc) => {
    const session = doc.data() as Record<string, any>
    const relationContext = session.relationContext ?? {}

    if (session.questionnaireType !== 'attachment' || session.status !== 'completed') {
      return null
    }

    if (normalizeText(relationContext.partnerEmail).toLowerCase() !== email) {
      return null
    }

    if (relationContext.partnerShareStatus !== 'awaiting_validation') {
      return null
    }

    const senderSnap = await adminDb.collection('users').doc(session.uid).get()
    const senderData = senderSnap.data() ?? {}

    return {
      sourceSessionId: doc.id,
      senderUid: session.uid,
      senderName: normalizeText(senderData.name) || 'Utilisateur inconnu',
      senderEmail: normalizeText(senderData.email) || '',
      requestedAt: relationContext.partnerInviteSentAt ?? null,
      sourceCompletedAt: session.completedAt ?? null,
      sourceGlobalProfile: session.result?.globalProfile ?? null,
      sourceAnxietyScore: typeof session.result?.anxietyScore === 'number' ? session.result.anxietyScore : null,
      sourceAvoidanceScore: typeof session.result?.avoidanceScore === 'number' ? session.result.avoidanceScore : null,
    }
  }))

  return requests
    .filter(Boolean)
    .sort((a, b) => {
      return getTimestampMs(b?.requestedAt) - getTimestampMs(a?.requestedAt)
    })
})
