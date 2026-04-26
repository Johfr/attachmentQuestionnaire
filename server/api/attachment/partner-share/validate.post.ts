import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '../../../utils/firebaseAdmin'
import { getAuthenticatedUid } from '../../../utils/getAuthenticatedUid'
import { isResultsSharingEnabled } from '../../../utils/siteConfig'
import { normalizeText } from '../../../utils/attachment/partnerShare'

type ValidatePartnerShareBody = {
  sourceSessionId?: string
  targetSessionId?: string
}

const normalizeEmail = (value: unknown) => normalizeText(value).toLowerCase()

const getAvailableTargetSessions = async (uid: string) => {
  const snapshot = await adminDb
    .collection('questionnaireSessions')
    .where('uid', '==', uid)
    .where('questionnaireType', '==', 'attachment')
    .where('status', '==', 'completed')
    .get()

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
    }))
    .filter((session) => {
      const relationContext = (session.relationContext ?? {}) as Record<string, unknown>
      return relationContext.partnerShareStatus !== 'linked'
    })
}

export default defineEventHandler(async (event) => {
  if (!(await isResultsSharingEnabled())) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Le partage de résultats est temporairement indisponible.',
    })
  }

  const uid = await getAuthenticatedUid(event)
  const body = await readBody<ValidatePartnerShareBody>(event)
  const sourceSessionId = normalizeText(body.sourceSessionId)
  const targetSessionId = normalizeText(body.targetSessionId)

  if (!sourceSessionId) {
    throw createError({ statusCode: 400, statusMessage: 'Demande introuvable.' })
  }

  const currentUserSnap = await adminDb.collection('users').doc(uid).get()
  const currentUserData = currentUserSnap.data() ?? {}
  const currentUserEmail = normalizeEmail(currentUserData.email)

  if (!currentUserEmail) {
    throw createError({ statusCode: 400, statusMessage: 'Email utilisateur introuvable.' })
  }

  const sourceSessionRef = adminDb.collection('questionnaireSessions').doc(sourceSessionId)
  const sourceSessionSnap = await sourceSessionRef.get()

  if (!sourceSessionSnap.exists) {
    throw createError({ statusCode: 404, statusMessage: 'Session source introuvable.' })
  }

  const sourceSession = sourceSessionSnap.data() as Record<string, any>
  const sourceRelationContext = sourceSession.relationContext ?? {}

  if (sourceSession.questionnaireType !== 'attachment' || sourceSession.status !== 'completed') {
    throw createError({ statusCode: 400, statusMessage: 'Cette demande ne peut pas être liée.' })
  }

  if (
    normalizeEmail(sourceRelationContext.partnerEmail) !== currentUserEmail
    || sourceRelationContext.partnerShareStatus !== 'awaiting_validation'
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Cette demande ne peut pas être validée.' })
  }

  const availableTargetSessions = await getAvailableTargetSessions(uid)

  if (availableTargetSessions.length === 0) {
    throw createError({ statusCode: 409, statusMessage: 'Aucune session disponible pour valider ce partage.' })
  }

  if (!targetSessionId) {
    throw createError({ statusCode: 409, statusMessage: 'Choisis la session à lier à cette demande.' })
  }

  const selectedTargetSession = availableTargetSessions.find(session => session.id === targetSessionId) ?? null

  if (!selectedTargetSession) {
    throw createError({ statusCode: 400, statusMessage: 'La session choisie ne peut pas être liée à cette demande.' })
  }

  const sourceUserSnap = await adminDb.collection('users').doc(sourceSession.uid).get()
  const sourceUserData = sourceUserSnap.data() ?? {}
  const sourceUserEmail = normalizeEmail(sourceUserData.email)

  const linkedSourceRelationContext = {
    ...sourceRelationContext,
    partnerEmail: currentUserEmail,
    partnerUid: uid,
    partnerQuestionnaireSessionId: selectedTargetSession.id,
    partnerGlobalStyle: selectedTargetSession.result?.globalProfile ?? null,
    partnerAnxietyScore: selectedTargetSession.result?.anxietyScore ?? null,
    partnerAvoidanceScore: selectedTargetSession.result?.avoidanceScore ?? null,
    partnerCompletedAt: selectedTargetSession.completedAt ?? null,
    partnerShareStatus: 'linked',
  }

  const receiverSessionRef = adminDb.collection('questionnaireSessions').doc(selectedTargetSession.id)
  const receiverRelationContext = (selectedTargetSession.relationContext ?? {}) as Record<string, unknown>

  const linkedReceiverRelationContext = {
    ...receiverRelationContext,
    partnerEmail: sourceUserEmail || null,
    partnerUid: sourceSession.uid,
    partnerQuestionnaireSessionId: sourceSessionId,
    partnerGlobalStyle: sourceSession.result?.globalProfile ?? null,
    partnerAnxietyScore: sourceSession.result?.anxietyScore ?? null,
    partnerAvoidanceScore: sourceSession.result?.avoidanceScore ?? null,
    partnerCompletedAt: sourceSession.completedAt ?? null,
    partnerInviteSentAt: sourceRelationContext.partnerInviteSentAt ?? FieldValue.serverTimestamp(),
    partnerShareStatus: 'linked',
  }

  await Promise.all([
    sourceSessionRef.set({
      relationContext: linkedSourceRelationContext,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
    receiverSessionRef.set({
      relationContext: linkedReceiverRelationContext,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ])

  return { ok: true }
})
