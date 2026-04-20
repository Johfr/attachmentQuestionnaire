import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { AttachmentQuestion, ComputeAttachmentQuestionnaireResultsRequest } from '../../../app/types/attachmentQuestionnaireResults'
import { computeAttachmentQuestionnaireResults } from '../../utils/attachment/computeAttachmentQuestionnaireResults'
import { buildAttachmentQuestionnaireDisplayResult } from '../../utils/attachment/buildAttachmentQuestionnaireDisplayResult'
import { buildQuestionnaireSessionDoc } from '../../utils/attachment/buildQuestionnaireSessionDoc'
import { adminAuth, adminDb } from '../../utils/firebaseAdmin'
import { AttachmentValidationError, validateAttachmentResults, validateQuestionsMatchCanonical } from '../../utils/attachment/validateAttachmentResults'
import questionsData from '../../../app/assets/data/attachment/questions.json'

// Questions canoniques chargées côté serveur — jamais remplacées par le payload client.
const CANONICAL_QUESTIONS = (questionsData as { questions: AttachmentQuestion[] }).questions
const QUESTIONNAIRE_TYPE = 'attachment'
const QUESTIONNAIRE_COOLDOWN_DAYS = 30

export default defineEventHandler(async event => {
  // — Input validation --------------------------------------------------------------
  const body = await readBody<ComputeAttachmentQuestionnaireResultsRequest>(event)
  if (!body?.results?.length) {
    throw createError({ statusCode: 400, statusMessage: 'results are required' })
  }

  // Si le client envoie questions, vérifier qu'ils n'ont pas été falsifiés.
  // On utilise toujours CANONICAL_QUESTIONS pour le calcul, quoi qu'il arrive.
  if (body.questions?.length) {
    try {
      validateQuestionsMatchCanonical(body.questions, CANONICAL_QUESTIONS)
    } catch (err) {
      throw createError({
        statusCode: 400,
        statusMessage: err instanceof AttachmentValidationError ? err.message : 'Invalid questions payload',
      })
    }
  }

  // Valider les résultats contre les questions canoniques serveur.
  try {
    validateAttachmentResults(body.results, CANONICAL_QUESTIONS)
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: err instanceof AttachmentValidationError ? err.message : 'Invalid results payload',
    })
  }

  // — Compute (avec les questions canoniques serveur, jamais celles du client) ------
  const computedResults = computeAttachmentQuestionnaireResults(body.results, CANONICAL_QUESTIONS)
  const displayResults = buildAttachmentQuestionnaireDisplayResult(computedResults)

  // — Auth: verify Firebase ID token ------------------------------------------------
  const authorization = getHeader(event, 'authorization')
  let uid: string | null = null
  let authErrorCode: string | undefined

  if (!authorization?.startsWith('Bearer ')) {
    authErrorCode = 'auth/missing-token'
  } else {
    try {
      const decoded = await adminAuth.verifyIdToken(authorization.slice(7))
      uid = decoded.uid
    } catch {
      authErrorCode = 'auth/invalid-token'
    }
  }

  // — Persist to Firestore ----------------------------------------------------------
  // Etat actuel : persistance par add() a chaque succes.
  // L'idempotence/retry ciblee reste documentee, mais n'est pas encore
  // implementee sur cet endpoint.
  let sessionId: string | null = null
  let persisted = false
  let persistErrorCode: string | undefined

  if (!uid) {
    persistErrorCode = authErrorCode
    console.warn('[results.post] Skip Firestore persist because auth is invalid:', authErrorCode)
  } else {
    try {
      const sessionDoc = buildQuestionnaireSessionDoc(
        uid,
        computedResults,
        body.results,
        body.relationContext ?? null,
      )
      const docRef = await adminDb.collection('questionnaireSessions').add({
        ...sessionDoc,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: FieldValue.serverTimestamp(),
      })

      const nowMs = Date.now()
      const nextAllowedAtMs = nowMs + (QUESTIONNAIRE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)

      await adminDb.collection('users').doc(uid).set({
        updatedAt: FieldValue.serverTimestamp(),
        questionnaireAccess: {
          [QUESTIONNAIRE_TYPE]: {
            lastCompletedAt: Timestamp.fromMillis(nowMs),
            nextAllowedAt: Timestamp.fromMillis(nextAllowedAtMs),
            cooldownDays: QUESTIONNAIRE_COOLDOWN_DAYS,
          },
        },
      }, { merge: true })

      sessionId = docRef.id
      persisted = true
    } catch (err) {
      const error = err as { code?: string; message?: string }
      persistErrorCode = error?.code ?? 'unknown'
      console.error('[results.post] Firestore persist failed:', persistErrorCode, error?.message)
    }
  }

  // — Response ----------------------------------------------------------------------
  return {
    results: displayResults,
    sessionId,
    persisted,
    ...(persistErrorCode !== undefined ? { persistErrorCode } : {}),
  }
})
