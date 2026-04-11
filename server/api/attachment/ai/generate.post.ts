import { FieldValue } from 'firebase-admin/firestore'
import type { QuestionnaireSession } from '../../../../app/types/questionnaireSessions'
import { createEmptyAiExchange } from '../../../../app/utils/aiExchange'
import { adminDb } from '../../../utils/firebaseAdmin'
import { getAuthenticatedUser } from '../../../utils/getAuthenticatedUser'
import { buildAttachmentDisplayResultFromStoredSession } from '../../../utils/attachment/buildAttachmentDisplayResultFromStoredSession'
import { buildAttachmentAiPrompt } from '../../../utils/attachment/buildAttachmentAiPrompt'
import { createOpenAiTextResponse } from '../../../utils/openAi'

type GenerateAttachmentAiRequest = {
  sessionId?: string
  force?: boolean
}

const normalizePromptCacheRetention = (value: unknown) => {
  if (value === 'in_memory' || value === '24h') {
    return value
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const normalizedValue = value.trim()

  if (normalizedValue === 'in_memory' || normalizedValue === '24h') {
    return normalizedValue
  }

  if (normalizedValue.includes('in_memory')) {
    return 'in_memory'
  }

  if (normalizedValue.includes('24h')) {
    return '24h'
  }

  return undefined
}

const buildPromptCacheKey = (baseKey: unknown, promptVersion: string, model: unknown) => {
  const normalizePart = (value: unknown, maxLength: number) => {
    return String(value ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9:_-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, maxLength)
  }

  const parts = [
    normalizePart(baseKey || 'att-ai', 28),
    normalizePart(promptVersion, 16),
    normalizePart(model || 'model', 16),
  ].filter(Boolean)

  return parts.join(':').slice(0, 64)
}

const getAiErrorDetails = (error: unknown) => {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const candidate = error as { statusCode?: number; statusMessage?: string; message?: string }

    if (candidate.statusCode === 400) {
      return {
        code: 'missing_user_input',
        message: candidate.statusMessage ?? candidate.message ?? 'Le texte IA est introuvable.',
      }
    }

    if (candidate.statusCode === 403) {
      return {
        code: 'access_denied',
        message: candidate.statusMessage ?? candidate.message ?? 'L analyse IA n est pas accessible pour cette session.',
      }
    }
  }

  const message = error instanceof Error
    ? error.message
    : 'La generation de l analyse IA a echoue.'

  if (message.includes('OpenAI API key is missing')) {
    return {
      code: 'missing_openai_api_key',
      message,
    }
  }

  if (message.includes('OpenAI request failed')) {
    return {
      code: 'openai_request_failed',
      message,
    }
  }

  if (message.includes('empty response')) {
    return {
      code: 'openai_empty_response',
      message,
    }
  }

  return {
    code: 'unknown_generation_error',
    message,
  }
}

const isUserAdmin = async (uid: string, tokenAdminClaim?: boolean) => {
  if (tokenAdminClaim === true) {
    return true
  }

  const userSnap = await adminDb.collection('users').doc(uid).get()
  return userSnap.exists && userSnap.data()?.admin === true
}

export default defineEventHandler(async event => {
  const authenticatedUser = await getAuthenticatedUser(event)
  const uid = authenticatedUser.uid
  const body = await readBody<GenerateAttachmentAiRequest>(event)
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  const forceRegenerate = body?.force === true

  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'sessionId is required.' })
  }

  if (forceRegenerate && !(await isUserAdmin(uid, authenticatedUser.admin === true))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'La regeneration forcee est reservee a l administration.',
    })
  }

  const config = useRuntimeConfig(event)

  const sessionRef = adminDb.collection('questionnaireSessions').doc(sessionId)
  const initialSnap = await sessionRef.get()

  if (!initialSnap.exists) {
    throw createError({ statusCode: 404, statusMessage: 'Session introuvable.' })
  }

  const initialSession = {
    id: initialSnap.id,
    ...initialSnap.data(),
  } as QuestionnaireSession

  if (initialSession.uid !== uid) {
    throw createError({ statusCode: 403, statusMessage: 'Acces refuse a cette session.' })
  }

  if (!initialSession.billingInfo?.hasPaidIa) {
    throw createError({
      statusCode: 403,
      statusMessage: 'L analyse IA n est pas debloquee pour cette session.',
    })
  }

  const claimedGeneration = await adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(sessionRef)
    if (!snapshot.exists) {
      throw createError({ statusCode: 404, statusMessage: 'Session introuvable.' })
    }

    const session = {
      id: snapshot.id,
      ...snapshot.data(),
    } as QuestionnaireSession

    if (session.uid !== uid) {
      throw createError({ statusCode: 403, statusMessage: 'Acces refuse a cette session.' })
    }

    const aiExchange = {
      ...createEmptyAiExchange(),
      ...(session.aiExchange ?? {}),
    }

    if (!session.billingInfo?.hasPaidIa) {
      throw createError({
        statusCode: 403,
        statusMessage: 'L analyse IA n est pas debloquee pour cette session.',
      })
    }

    if (!aiExchange.userInput?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Aucun texte IA n est disponible pour cette session.',
      })
    }

    if (!forceRegenerate && aiExchange.status === 'generated' && aiExchange.output) {
      return {
        mode: 'already_generated' as const,
        session,
      }
    }

    if (!forceRegenerate && aiExchange.status === 'pending' && aiExchange.requestId) {
      return {
        mode: 'already_pending' as const,
        session,
      }
    }

    const requestId = crypto.randomUUID()
    transaction.update(sessionRef, {
      'aiExchange.status': 'pending',
      'aiExchange.unlocked': true,
      'aiExchange.requestId': requestId,
      'aiExchange.model': config.openAiModel,
      'aiExchange.output': null,
      'aiExchange.generatedAt': null,
      'aiExchange.promptVersion': null,
      'aiExchange.lastAttemptAt': FieldValue.serverTimestamp(),
      'aiExchange.retryCount': (aiExchange.retryCount ?? 0) + 1,
      'aiExchange.lastErrorCode': null,
      'aiExchange.lastErrorMessage': null,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return {
      mode: 'start_generation' as const,
      session: {
        ...session,
        aiExchange: {
          ...aiExchange,
          unlocked: true,
          status: 'pending' as const,
          requestId,
          model: config.openAiModel,
          output: null,
          generatedAt: null,
          promptVersion: null,
          lastAttemptAt: new Date() as never,
          retryCount: (aiExchange.retryCount ?? 0) + 1,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      },
    }
  })

  if (claimedGeneration.mode === 'already_generated') {
    const aiExchange = {
      ...createEmptyAiExchange(),
      ...(claimedGeneration.session.aiExchange ?? {}),
    }

    return {
      status: 'generated',
      output: aiExchange.output,
      requestId: aiExchange.requestId,
    }
  }

  if (claimedGeneration.mode === 'already_pending') {
    const aiExchange = {
      ...createEmptyAiExchange(),
      ...(claimedGeneration.session.aiExchange ?? {}),
    }

    return {
      status: 'pending',
      requestId: aiExchange.requestId,
    }
  }

  const session = claimedGeneration.session
  const aiExchange = {
    ...createEmptyAiExchange(),
    ...(session.aiExchange ?? {}),
  }
  const displayResults = buildAttachmentDisplayResultFromStoredSession(session.result, session.completedAt)
  const prompt = buildAttachmentAiPrompt({
    session,
    displayResults,
    userInput: aiExchange.userInput ?? '',
  })

  try {
    if (!config.openAiApiKey) {
      throw new Error('OpenAI API key is missing on the server.')
    }

    const maxOutputTokens = Number.isFinite(Number(config.openAiMaxOutputTokens))
      ? Number(config.openAiMaxOutputTokens)
      : 1800
    const promptCacheRetention = normalizePromptCacheRetention(config.openAiPromptCacheRetention)

    const result = await createOpenAiTextResponse({
      apiKey: config.openAiApiKey,
      model: config.openAiModel,
      instructions: prompt.instructions,
      input: prompt.input,
      reasoningEffort: config.openAiReasoningEffort,
      maxOutputTokens,
      promptCacheKey: buildPromptCacheKey(
        config.openAiPromptCacheKey,
        prompt.promptVersion,
        config.openAiModel,
      ),
      promptCacheRetention,
    })

    await sessionRef.update({
      'aiExchange.status': 'generated',
      'aiExchange.unlocked': true,
      'aiExchange.output': result.outputText,
      'aiExchange.generatedAt': FieldValue.serverTimestamp(),
      'aiExchange.model': config.openAiModel,
      'aiExchange.requestId': result.requestId ?? aiExchange.requestId,
      'aiExchange.promptVersion': prompt.promptVersion,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return {
      status: 'generated',
      output: result.outputText,
      requestId: result.requestId,
    }
  } catch (error) {
    const errorDetails = getAiErrorDetails(error)

    await sessionRef.update({
      'aiExchange.status': 'failed',
      'aiExchange.unlocked': true,
      'aiExchange.lastErrorCode': errorDetails.code,
      'aiExchange.lastErrorMessage': errorDetails.message,
      updatedAt: FieldValue.serverTimestamp(),
    })

    throw createError({
      statusCode: 500,
      statusMessage: errorDetails.message,
    })
  }
})
