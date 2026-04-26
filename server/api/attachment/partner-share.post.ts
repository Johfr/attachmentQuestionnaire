import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '../../utils/firebaseAdmin'
import { getAuthenticatedUid } from '../../utils/getAuthenticatedUid'
import { isResultsSharingEnabled } from '../../utils/siteConfig'
import {
  escapeHtml,
  getBaseUrl,
  getLatestAttachmentSessionForUid,
  isEmailValid,
  normalizeEnvValue,
  normalizeText,
  sendEmail,
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

  const userSnap = await adminDb.collection('users').doc(uid).get()
  const userData = userSnap.data() ?? {}
  const senderName = normalizeText(userData.name) || 'Quelquun'
  const senderEmail = normalizeEmail(userData.email)

  if (senderEmail && senderEmail === partnerEmail) {
    throw createError({ statusCode: 400, statusMessage: 'Tu ne peux pas t’inviter toi-même.' })
  }

  const partnerUserSnapshot = await adminDb
    .collection('users')
    .where('email', 'in', rawPartnerEmail && rawPartnerEmail !== partnerEmail
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

  const baseUrl = getBaseUrl(event)
  const introductionUrl = `${baseUrl}/attachment-questionnaire/introduction?uid=${encodeURIComponent(uid)}&questionnaireSessionId=${encodeURIComponent(sessionId)}`
  const profileUrl = `${baseUrl}/user/profil`

  const config = useRuntimeConfig(event)
  const resendApiKey = normalizeEnvValue(config.resendApiKey)
  const mailFrom = normalizeEnvValue(config.mailFrom)

  if (!resendApiKey || !mailFrom) {
    throw createError({ statusCode: 500, statusMessage: 'Configuration email manquante.' })
  }

  const subject = partnerHasCompletedAttachmentSession
    ? `${senderName} souhaite partager ses résultats avec toi`
    : `${senderName} t’invite à passer le questionnaire d’attachement`

  const html = partnerHasCompletedAttachmentSession
    ? `
      <p>Salut,</p>
      <p>${escapeHtml(senderName)} t'a envoyé une demande de partage.</p>
      <p>Rends-toi sur ton profil pour consulter cette demande et la valider :</p>
      <p><a href="${profileUrl}">${profileUrl}</a></p>
    `
    : `
      <p>Salut,</p>
      <p>${escapeHtml(senderName)} t'invite a passer le questionnaire d'attachement.</p>
      <p>Utilise ce lien pour demarrer directement :</p>
      <p><a href="${introductionUrl}">${introductionUrl}</a></p>
    `

  try {
    await sendEmail(resendApiKey, {
      from: mailFrom,
      to: [partnerEmail],
      subject,
      html,
    })
  } catch (error) {
    console.error('Partner share email failed:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Impossible d’envoyer le message pour le moment.',
    })
  }

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
  }
})
