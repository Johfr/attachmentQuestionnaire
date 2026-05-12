import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '../../utils/firebaseAdmin'
import { getAuthenticatedUid } from '../../utils/getAuthenticatedUid'
import { isResultsPaywallEnabled, isResultsSharingEnabled } from '../../utils/siteConfig'
import {
  getLatestAttachmentSessionForUid,
  isEmailValid,
  normalizeText,
} from '../../utils/attachment/partnerShare'

type PartnerShareBody = {
  sessionId?: string
  partnerEmail?: string
}

const normalizeEmail = (value: unknown) => normalizeText(value).toLowerCase()

export default defineEventHandler(async (event) => {
  if (!(await isResultsSharingEnabled())) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Le partage de résultats est temporairement indisponible.',
    })
  }

  const uid = await getAuthenticatedUid(event)

  const body = await readBody<PartnerShareBody>(event)
  const sessionId = normalizeText(body.sessionId)
  const rawPartnerEmail = normalizeText(body.partnerEmail)
  const partnerEmail = normalizeEmail(body.partnerEmail)

  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'Session introuvable.' })
  }

  if (!partnerEmail || !isEmailValid(partnerEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'Renseigne une adresse email valide.' })
  }

  const sessionRef = adminDb.collection('questionnaireSessions').doc(sessionId)
  const sessionSnap = await sessionRef.get()

  if (!sessionSnap.exists) {
    throw createError({ statusCode: 404, statusMessage: 'Session introuvable.' })
  }

  const session = sessionSnap.data()

  if (!session || session.uid !== uid) {
    throw createError({ statusCode: 403, statusMessage: 'Accès refusé à cette session.' })
  }

  if (session.questionnaireType !== 'attachment' || session.status !== 'completed') {
    throw createError({ statusCode: 400, statusMessage: 'Cette session ne peut pas être partagée.' })
  }

  if (await isResultsPaywallEnabled()) {
    const billingInfo = session.billingInfo ?? {}
    const hasSharingAccess = Boolean(
      billingInfo.hasPaidResults
      || billingInfo.hasPaidIa
      || billingInfo.hasPaidMembership
      || billingInfo.hasPaidFormation,
    )

    if (!hasSharingAccess) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Tu dois d’abord débloquer tes résultats avant de pouvoir faire ta demande.',
      })
    }
  }

  const userSnap = await adminDb.collection('users').doc(uid).get()
  const userData = userSnap.data() ?? {}
  const senderEmail = normalizeEmail(userData.email)

  if (senderEmail && senderEmail === partnerEmail) {
    throw createError({ statusCode: 400, statusMessage: 'Tu ne peux pas t’inviter toi-même.' })
  }

  const partnerUserSnapshot = await adminDb
    .collection('users')
    .where(
      'email',
      'in',
      rawPartnerEmail && rawPartnerEmail !== partnerEmail
        ? [rawPartnerEmail, partnerEmail]
        : [partnerEmail],
    )
    .limit(1)
    .get()

  const partnerUserDoc = partnerUserSnapshot.docs[0] ?? null
  const partnerUid = partnerUserDoc?.id ?? null

  if (partnerUid === uid) {
    throw createError({ statusCode: 400, statusMessage: 'Tu ne peux pas t’inviter toi-même.' })
  }

  const partnerHasCompletedAttachmentSession = Boolean(
    partnerUid && await getLatestAttachmentSessionForUid(adminDb, partnerUid),
  )

  const partnerShareStatus = partnerHasCompletedAttachmentSession
    ? 'awaiting_validation'
    : 'invite_sent'

  await sessionRef.set({
    relationContext: {
      ...(session.relationContext ?? {}),
      partnerEmail,
      partnerUid,
      partnerQuestionnaireSessionId: null,
      partnerGlobalStyle: null,
      partnerAnxietyScore: null,
      partnerAvoidanceScore: null,
      partnerCompletedAt: null,
      partnerInviteSentAt: FieldValue.serverTimestamp(),
      partnerShareStatus,
    },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  return {
    ok: true,
    partnerExists: partnerHasCompletedAttachmentSession,
    status: partnerShareStatus,
    deliveryMode: 'manual_queue',
  }
})
