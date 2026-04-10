import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ATTACHMENT_AI_MAX_INPUT_CHARS,
  ATTACHMENT_AI_MIN_INPUT_CHARS,
} from '../../app/constants/attachmentAi'

describe('POST /api/attachment/ai/prepare', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  const loadHandler = async (options?: {
    uid?: string
    body?: { sessionId?: string, userInput?: string }
    session?: Record<string, unknown> | null
  }) => {
    const uid = options?.uid ?? 'user-123'
    const body = options?.body ?? {
      sessionId: 'session-123',
      userInput: 'a'.repeat(ATTACHMENT_AI_MIN_INPUT_CHARS),
    }
    const session = options?.session ?? {
      uid,
      questionnaireType: 'attachment',
      billingInfo: {
        hasPaidIa: false,
      },
      aiExchange: {
        unlocked: false,
        status: 'not_purchased',
      },
    }

    const setMock = vi.fn().mockResolvedValue(undefined)
    const getMock = vi.fn().mockResolvedValue({
      exists: session !== null,
      data: () => session,
    })

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body))
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
          doc: vi.fn(() => ({
            get: getMock,
            set: setMock,
          })),
        })),
      },
    }))

    vi.doMock('../../server/utils/getAuthenticatedUid', () => ({
      getAuthenticatedUid: vi.fn().mockResolvedValue(uid),
    }))

    const mod = await import('../../server/api/attachment/ai/prepare.post')

    return {
      handler: mod.default as (event: unknown) => Promise<unknown>,
      getMock,
      setMock,
    }
  }

  it('stores the IA input on the session when the payload is valid', async () => {
    const { handler, setMock } = await loadHandler({
      body: {
        sessionId: 'session-123',
        userInput: `  ${'a'.repeat(ATTACHMENT_AI_MIN_INPUT_CHARS)}  `,
      },
    })

    await expect(handler({})).resolves.toEqual({ ok: true })

    expect(setMock).toHaveBeenCalledWith({
      aiExchange: expect.objectContaining({
        userInput: 'a'.repeat(ATTACHMENT_AI_MIN_INPUT_CHARS),
        output: null,
        generatedAt: null,
        status: 'not_purchased',
        model: null,
        requestId: null,
        promptVersion: null,
      }),
      updatedAt: 'server-timestamp',
    }, { merge: true })
  })

  it('rejects a text that is too short', async () => {
    const { handler, setMock } = await loadHandler({
      body: {
        sessionId: 'session-123',
        userInput: 'a'.repeat(ATTACHMENT_AI_MIN_INPUT_CHARS - 1),
      },
    })

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Le texte doit contenir au moins ${ATTACHMENT_AI_MIN_INPUT_CHARS} caracteres.`,
    })
    expect(setMock).not.toHaveBeenCalled()
  })

  it('rejects a text that is too long', async () => {
    const { handler, setMock } = await loadHandler({
      body: {
        sessionId: 'session-123',
        userInput: 'a'.repeat(ATTACHMENT_AI_MAX_INPUT_CHARS + 1),
      },
    })

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Le texte ne doit pas depasser ${ATTACHMENT_AI_MAX_INPUT_CHARS} caracteres.`,
    })
    expect(setMock).not.toHaveBeenCalled()
  })

  it('rejects a session owned by another user', async () => {
    const { handler, setMock } = await loadHandler({
      uid: 'user-123',
      session: {
        uid: 'user-999',
        questionnaireType: 'attachment',
        billingInfo: {
          hasPaidIa: false,
        },
      },
    })

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Acces refuse a cette session.',
    })
    expect(setMock).not.toHaveBeenCalled()
  })

  it('rejects a session that already unlocked the IA analysis', async () => {
    const { handler, setMock } = await loadHandler({
      session: {
        uid: 'user-123',
        questionnaireType: 'attachment',
        billingInfo: {
          hasPaidIa: true,
        },
      },
    })

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'L analyse sur mesure est deja debloquee pour cette session.',
    })
    expect(setMock).not.toHaveBeenCalled()
  })
})
