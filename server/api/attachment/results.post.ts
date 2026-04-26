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

const normalizeText = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const normalizeGender = (value: unknown) => value === 'male' || value === 'female' ? value : null

const mirrorPartnerSessionsFromInvitation = async (options: {
  sourceUid: string
  sourceSessionId: string
  targetUid: string
  targetSessionId: string
  targetCompletedAt: Timestamp
  targetResult: {
    globalProfile: string
    anxietyScore: number
    avoidanceScore: number
  }
}) => {
  if (options.sourceUid === options.targetUid) {
    return
  }

  const sourceSessionRef = adminDb.collection('questionnaireSessions').doc(options.sourceSessionId)
  const sourceSessionSnap = await sourceSessionRef.get()
  if (!sourceSessionSnap.exists) {
    return
  }

  const sourceSession = sourceSessionSnap.data() as Record<string, any> | undefined
  if (
    !sourceSession
    || sourceSession.uid !== options.sourceUid
    || sourceSession.questionnaireType !== 'attachment'
    || sourceSession.status !== 'completed'
  ) {
    return
  }

  const [sourceUserSnap, targetUserSnap] = await Promise.all([
    adminDb.collection('users').doc(options.sourceUid).get(),
    adminDb.collection('users').doc(options.targetUid).get(),
  ])

  const sourceUserData = sourceUserSnap.data() ?? {}
  const targetUserData = targetUserSnap.data() ?? {}
  const sourceRelationContext = sourceSession.relationContext ?? {}
  const sourcePartnerFirstName = normalizeText(targetUserData.name) || sourceRelationContext.partnerFirstName || null
  const sourcePartnerAge = typeof targetUserData.age === 'number'
    ? targetUserData.age
    : (sourceRelationContext.partnerAge ?? null)
  const sourcePartnerGender = normalizeGender(targetUserData.gender) ?? sourceRelationContext.partnerGender ?? null
  const sourcePartnerEmail = normalizeText(targetUserData.email) || sourceRelationContext.partnerEmail || null

  const linkedSourceRelationContext = {
    ...sourceRelationContext,
    partnerFirstName: sourcePartnerFirstName,
    partnerAge: sourcePartnerAge,
    partnerGender: sourcePartnerGender,
    partnerEmail: sourcePartnerEmail,
    partnerUid: options.targetUid,
    partnerQuestionnaireSessionId: options.targetSessionId,
    partnerGlobalStyle: options.targetResult.globalProfile,
    partnerAnxietyScore: options.targetResult.anxietyScore,
    partnerAvoidanceScore: options.targetResult.avoidanceScore,
    partnerCompletedAt: options.targetCompletedAt,
    partnerShareStatus: 'linked',
  }

  const targetSessionRef = adminDb.collection('questionnaireSessions').doc(options.targetSessionId)
  const targetSessionSnap = await targetSessionRef.get()
  const targetSession = targetSessionSnap.data() as Record<string, any> | undefined
  const targetRelationContext = targetSession?.relationContext ?? {}
  const targetPartnerFirstName = normalizeText(sourceUserData.name) || targetRelationContext.partnerFirstName || null
  const targetPartnerAge = typeof sourceUserData.age === 'number'
    ? sourceUserData.age
    : (targetRelationContext.partnerAge ?? null)
  const targetPartnerGender = normalizeGender(sourceUserData.gender) ?? targetRelationContext.partnerGender ?? null
  const targetPartnerEmail = normalizeText(sourceUserData.email) || targetRelationContext.partnerEmail || null

  const linkedTargetRelationContext = {
    ...targetRelationContext,
    partnerFirstName: targetPartnerFirstName,
    partnerAge: targetPartnerAge,
    partnerGender: targetPartnerGender,
    partnerEmail: targetPartnerEmail,
    partnerUid: options.sourceUid,
    partnerQuestionnaireSessionId: options.sourceSessionId,
    partnerGlobalStyle: sourceSession.result?.globalProfile ?? null,
    partnerAnxietyScore: sourceSession.result?.anxietyScore ?? null,
    partnerAvoidanceScore: sourceSession.result?.avoidanceScore ?? null,
    partnerCompletedAt: sourceSession.completedAt ?? null,
    partnerShareStatus: 'linked',
  }

  await Promise.all([
    sourceSessionRef.set({
      relationContext: linkedSourceRelationContext,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
    targetSessionRef.set({
      relationContext: linkedTargetRelationContext,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ])
}

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
        body.relationContext
          ? {
              partnerFirstName: body.relationContext.partnerFirstName,
              partnerAge: body.relationContext.partnerAge,
              partnerGender: body.relationContext.partnerGender,
            }
          : null,
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

      const partnerShareSourceUid = normalizeText(body.relationContext?.partnerShareSource?.uid)
      const partnerShareSourceSessionId = normalizeText(body.relationContext?.partnerShareSource?.questionnaireSessionId)

      if (partnerShareSourceUid && partnerShareSourceSessionId) {
        try {
          await mirrorPartnerSessionsFromInvitation({
            sourceUid: partnerShareSourceUid,
            sourceSessionId: partnerShareSourceSessionId,
            targetUid: uid,
            targetSessionId: docRef.id,
            targetCompletedAt: Timestamp.fromMillis(nowMs),
            targetResult: {
              globalProfile: computedResults.attachmentProfilesByDimension.globalStyle,
              anxietyScore: computedResults.averageScores.find(score => score.dimension === 'anxiety')?.average ?? 0,
              avoidanceScore: computedResults.averageScores.find(score => score.dimension === 'avoidance')?.average ?? 0,
            },
          })
        } catch (error) {
          console.error('[results.post] Partner session mirror failed:', error)
        }
      }
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
