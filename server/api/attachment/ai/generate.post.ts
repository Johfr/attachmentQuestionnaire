import { FieldValue } from 'firebase-admin/firestore'
import type { QuestionnaireSession } from '../../../../app/types/questionnaireSessions'
import { createEmptyAiExchange } from '../../../../app/utils/aiExchange'
import { adminDb } from '../../../utils/firebaseAdmin'
import { getAuthenticatedUid } from '../../../utils/getAuthenticatedUid'
import { buildAttachmentDisplayResultFromStoredSession } from '../../../utils/attachment/buildAttachmentDisplayResultFromStoredSession'
import { buildAttachmentAiPrompt } from '../../../utils/attachment/buildAttachmentAiPrompt'
import { createOpenAiTextResponse } from '../../../utils/openAi'

type GenerateAttachmentAiRequest = {
  sessionId?: string
}

export default defineEventHandler(async event => {
  const uid = await getAuthenticatedUid(event)
  const body = await readBody<GenerateAttachmentAiRequest>(event)
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''

  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'sessionId is required.' })
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

    if (aiExchange.status === 'generated' && aiExchange.output) {
      return {
        mode: 'already_generated' as const,
        session,
      }
    }

    if (aiExchange.status === 'pending' && aiExchange.requestId) {
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

    const result = await createOpenAiTextResponse({
      apiKey: config.openAiApiKey,
      model: config.openAiModel,
      instructions: prompt.instructions,
      input: prompt.input,
      reasoningEffort: config.openAiReasoningEffort,
      maxOutputTokens,
      promptCacheKey: `${config.openAiPromptCacheKey}:${prompt.promptVersion}:${config.openAiModel}`,
      promptCacheRetention: config.openAiPromptCacheRetention,
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
    await sessionRef.update({
      'aiExchange.status': 'failed',
      'aiExchange.unlocked': true,
      updatedAt: FieldValue.serverTimestamp(),
    })

    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error
        ? error.message
        : 'La generation de l analyse IA a echoue.',
    })
  }
})
