import { FieldValue } from 'firebase-admin/firestore'
import type { ComputeAttachmentQuestionnaireResultsRequest } from '../../../app/types/attachmentQuestionnaireResults'
import { computeAttachmentQuestionnaireResults } from '../../utils/attachment/computeAttachmentQuestionnaireResults'
import { buildAttachmentQuestionnaireDisplayResult } from '../../utils/attachment/buildAttachmentQuestionnaireDisplayResult'
import { buildQuestionnaireSessionDoc } from '../../utils/attachment/buildQuestionnaireSessionDoc'
import { adminAuth, adminDb } from '../../utils/firebaseAdmin'

export default defineEventHandler(async event => {
  // — Input validation --------------------------------------------------------------
  const body = await readBody<ComputeAttachmentQuestionnaireResultsRequest>(event)
  if (!body?.results?.length || !body?.questions?.length) {
    throw createError({ statusCode: 400, statusMessage: 'results and questions are required' })
  }

  // — Compute -----------------------------------------------------------------------
  const computedResults = computeAttachmentQuestionnaireResults(body.results, body.questions)
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
