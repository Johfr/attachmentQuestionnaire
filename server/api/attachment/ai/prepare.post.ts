import { FieldValue } from 'firebase-admin/firestore'
import { ATTACHMENT_AI_MAX_INPUT_CHARS, ATTACHMENT_AI_MIN_INPUT_CHARS } from '../../../../app/constants/attachmentAi'
import { createEmptyAiExchange } from '../../../../app/utils/aiExchange'
import { adminDb } from '../../../utils/firebaseAdmin'
import { getAuthenticatedUid } from '../../../utils/getAuthenticatedUid'

type PrepareAttachmentAiRequest = {
  sessionId?: string
  userInput?: string
}

export default defineEventHandler(async event => {
  const uid = await getAuthenticatedUid(event)
  const body = await readBody<PrepareAttachmentAiRequest>(event)

  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  const userInput = typeof body?.userInput === 'string' ? body.userInput.trim() : ''

  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'sessionId is required.' })
  }

  if (userInput.length < ATTACHMENT_AI_MIN_INPUT_CHARS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Le texte doit contenir au moins ${ATTACHMENT_AI_MIN_INPUT_CHARS} caracteres.`,
    })
  }

  if (userInput.length > ATTACHMENT_AI_MAX_INPUT_CHARS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Le texte ne doit pas depasser ${ATTACHMENT_AI_MAX_INPUT_CHARS} caracteres.`,
    })
  }

  const sessionRef = adminDb.collection('questionnaireSessions').doc(sessionId)
  const sessionSnap = await sessionRef.get()

  if (!sessionSnap.exists) {
    throw createError({ statusCode: 404, statusMessage: 'Session introuvable.' })
  }

  const session = sessionSnap.data()
  if (session?.uid !== uid) {
    throw createError({ statusCode: 403, statusMessage: 'Acces refuse a cette session.' })
  }

  if (session?.questionnaireType !== 'attachment') {
    throw createError({ statusCode: 400, statusMessage: 'Type de questionnaire invalide.' })
  }

  if (session?.billingInfo?.hasPaidIa) {
    throw createError({
      statusCode: 409,
      statusMessage: 'L analyse sur mesure est deja debloquee pour cette session.',
    })
  }

  const currentAiExchange = {
    ...createEmptyAiExchange(),
    ...(session?.aiExchange ?? {}),
  }

  await sessionRef.set({
    aiExchange: {
      ...currentAiExchange,
      userInput,
      output: null,
      generatedAt: null,
      lastAttemptAt: null,
      retryCount: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
      status: 'not_purchased',
      model: null,
      requestId: null,
      promptVersion: null,
    },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  return {
    ok: true,
  }
})
