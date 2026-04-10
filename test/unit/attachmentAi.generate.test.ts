import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { QuestionnaireSession } from '../../app/types/questionnaireSessions'

const makeSession = (
  overrides: Partial<QuestionnaireSession> = {},
): QuestionnaireSession => ({
  id: 'session-123',
  uid: 'user-123',
  questionnaireType: 'attachment',
  questionnaireVersion: 'v1',
  status: 'completed',
  scoringVersion: '1',
  createdAt: { seconds: 1, nanoseconds: 0 } as never,
  updatedAt: { seconds: 1, nanoseconds: 0 } as never,
  completedAt: { seconds: 1, nanoseconds: 0 } as never,
  relationContext: {
    partnerFirstName: null,
    partnerAge: null,
  },
  answers: [],
  result: {
    anxietyScore: 60,
    avoidanceScore: 40,
    globalProfile: 'anxious',
    anxietySubProfile: 'anxiousActivated',
    avoidanceSubProfile: 'avoidantFlexible',
    triggers: {},
  },
  billingInfo: {
    hasPaidResults: false,
    hasPaidIa: true,
    hasPaidMembership: false,
    hasPaidFormation: false,
  },
  aiExchange: {
    unlocked: true,
    purchasedAt: null,
    userInput: 'Je suis perdue dans cette relation.',
    output: null,
    generatedAt: null,
    status: 'not_purchased',
    model: null,
    requestId: null,
    promptVersion: null,
  },
  persist: {
    status: 'persisted',
    retryCount: 0,
    lastAttemptAt: null,
    lastErrorCode: null,
  },
  ...overrides,
})

describe('POST /api/attachment/ai/generate', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  const loadHandler = async (options?: {
    uid?: string
    body?: { sessionId?: string }
    initialSession?: QuestionnaireSession | null
    transactionSession?: QuestionnaireSession | null
    openAiResult?: { requestId: string | null, outputText: string }
    openAiError?: Error
  }) => {
    const uid = options?.uid ?? 'user-123'
    const body = options?.body ?? { sessionId: 'session-123' }
    const initialSession = options?.initialSession ?? makeSession()
    const transactionSession = options?.transactionSession ?? initialSession
    const updateMock = vi.fn().mockResolvedValue(undefined)
    const openAiMock = vi.fn()
    const displayMock = vi.fn(() => ({ completionDate: '2026-04-09' }))
    const promptMock = vi.fn(() => ({
      instructions: 'system prompt',
      input: 'user prompt',
      promptVersion: 'attachment-ai-v2',
    }))

    if (options?.openAiError) {
      openAiMock.mockRejectedValue(options.openAiError)
    } else {
      openAiMock.mockResolvedValue(options?.openAiResult ?? {
        requestId: 'openai-req-1',
        outputText: 'Analyse generee',
      })
    }

    const sessionRef = {
      get: vi.fn().mockResolvedValue({
        exists: initialSession !== null,
        id: initialSession?.id ?? 'session-123',
        data: () => initialSession,
      }),
      update: updateMock,
    }

    const transaction = {
      get: vi.fn().mockResolvedValue({
        exists: transactionSession !== null,
        id: transactionSession?.id ?? 'session-123',
        data: () => transactionSession,
      }),
      update: vi.fn(),
    }

    const runTransactionMock = vi.fn(async (callback: (value: typeof transaction) => Promise<unknown>) => {
      return callback(transaction)
    })

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body))
    vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({
      openAiApiKey: 'sk-test',
      openAiModel: 'gpt-5',
      openAiReasoningEffort: 'medium',
      openAiMaxOutputTokens: '2400',
      openAiPromptCacheKey: 'relation-anxieux-evitant:attachment-ai',
      openAiPromptCacheRetention: 'in_memory',
    })))
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'uuid-123'),
    })
    vi.stubGlobal('createError', (payload: { statusCode: number, statusMessage: string }) => {
      const error = new Error(payload.statusMessage) as Error & { statusCode?: number, statusMessage?: string }
      error.statusCode = payload.statusCode
      error.statusMessage = payload.statusMessage
      return error
    })

    vi.doMock('firebase-admin/firestore', () => ({
      FieldValue: {
        serverTimestamp: vi.fn(() => 'server-timestamp'),
      },
    }))

    vi.doMock('../../server/utils/firebaseAdmin', () => ({
      adminDb: {
        collection: vi.fn(() => ({
          doc: vi.fn(() => sessionRef),
        })),
        runTransaction: runTransactionMock,
      },
    }))

    vi.doMock('../../server/utils/getAuthenticatedUid', () => ({
      getAuthenticatedUid: vi.fn().mockResolvedValue(uid),
    }))

    vi.doMock('../../server/utils/attachment/buildAttachmentDisplayResultFromStoredSession', () => ({
      buildAttachmentDisplayResultFromStoredSession: displayMock,
    }))

    vi.doMock('../../server/utils/attachment/buildAttachmentAiPrompt', () => ({
      buildAttachmentAiPrompt: promptMock,
    }))

    vi.doMock('../../server/utils/openAi', () => ({
      createOpenAiTextResponse: openAiMock,
    }))

    const mod = await import('../../server/api/attachment/ai/generate.post')

    return {
      handler: mod.default as (event: unknown) => Promise<unknown>,
      updateMock,
      transactionUpdateMock: transaction.update,
      openAiMock,
      displayMock,
      promptMock,
    }
  }

  it('returns the existing analysis when the session is already generated', async () => {
    const generatedSession = makeSession({
      aiExchange: {
        unlocked: true,
        purchasedAt: null,
        userInput: 'Mon texte',
        output: 'Analyse deja la',
        generatedAt: { seconds: 1, nanoseconds: 0 } as never,
        status: 'generated',
        model: 'gpt-5',
        requestId: 'existing-req',
        promptVersion: 'attachment-ai-v1',
      },
    })

    const { handler, openAiMock, updateMock } = await loadHandler({
      initialSession: generatedSession,
      transactionSession: generatedSession,
    })

    await expect(handler({})).resolves.toEqual({
      status: 'generated',
      output: 'Analyse deja la',
      requestId: 'existing-req',
    })
    expect(openAiMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('returns pending when generation is already in progress', async () => {
    const pendingSession = makeSession({
      aiExchange: {
        unlocked: true,
        purchasedAt: null,
        userInput: 'Mon texte',
        output: null,
        generatedAt: null,
        status: 'pending',
        model: 'gpt-5',
        requestId: 'existing-req',
        promptVersion: null,
      },
    })

    const { handler, openAiMock, updateMock } = await loadHandler({
      initialSession: pendingSession,
      transactionSession: pendingSession,
    })

    await expect(handler({})).resolves.toEqual({
      status: 'pending',
      requestId: 'existing-req',
    })
    expect(openAiMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('generates and stores the IA analysis for a paid session', async () => {
    const baseSession = makeSession({
      aiExchange: {
        unlocked: true,
        purchasedAt: null,
        userInput: 'Je ne comprends pas cette relation.',
        output: null,
        generatedAt: null,
        status: 'pending',
        model: null,
        requestId: null,
        promptVersion: null,
      },
    })

    const { handler, transactionUpdateMock, updateMock, openAiMock, displayMock, promptMock } = await loadHandler({
      initialSession: baseSession,
      transactionSession: baseSession,
      openAiResult: {
        requestId: 'openai-final-req',
        outputText: 'Analyse finale',
      },
    })

    await expect(handler({})).resolves.toEqual({
      status: 'generated',
      output: 'Analyse finale',
      requestId: 'openai-final-req',
    })

    expect(transactionUpdateMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      'aiExchange.status': 'pending',
      'aiExchange.unlocked': true,
      'aiExchange.requestId': 'uuid-123',
      'aiExchange.model': 'gpt-5',
      updatedAt: 'server-timestamp',
    }))

    expect(displayMock).toHaveBeenCalledOnce()
    expect(promptMock).toHaveBeenCalledOnce()
    expect(openAiMock).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'sk-test',
      model: 'gpt-5',
      instructions: 'system prompt',
      input: 'user prompt',
      reasoningEffort: 'medium',
      maxOutputTokens: 2400,
      promptCacheKey: 'relation-anxieux-evitant:attachment-ai:attachment-ai-v2:gpt-5',
      promptCacheRetention: 'in_memory',
    }))

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      'aiExchange.status': 'generated',
      'aiExchange.unlocked': true,
      'aiExchange.output': 'Analyse finale',
      'aiExchange.generatedAt': 'server-timestamp',
      'aiExchange.model': 'gpt-5',
      'aiExchange.requestId': 'openai-final-req',
      'aiExchange.promptVersion': 'attachment-ai-v2',
      updatedAt: 'server-timestamp',
    }))
  })

  it('marks the exchange as failed when OpenAI generation throws', async () => {
    const { handler, updateMock } = await loadHandler({
      openAiError: new Error('OpenAI request failed'),
    })

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'OpenAI request failed',
    })

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      'aiExchange.status': 'failed',
      'aiExchange.unlocked': true,
      updatedAt: 'server-timestamp',
    }))
  })

  it('rejects a paid session that has no stored IA input', async () => {
    const missingInputSession = makeSession({
      aiExchange: {
        unlocked: true,
        purchasedAt: null,
        userInput: '   ',
        output: null,
        generatedAt: null,
        status: 'pending',
        model: null,
        requestId: null,
        promptVersion: null,
      },
    })

    const { handler, openAiMock, updateMock } = await loadHandler({
      initialSession: missingInputSession,
      transactionSession: missingInputSession,
    })

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Aucun texte IA n est disponible pour cette session.',
    })
    expect(openAiMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })
})
