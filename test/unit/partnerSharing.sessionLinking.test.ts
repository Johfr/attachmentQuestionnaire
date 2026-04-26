import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComputeAttachmentQuestionnaireResultsRequest } from '../../app/types/attachmentQuestionnaireResults'

describe('POST /api/attachment/partner-share', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  const loadShareHandler = async (options?: {
    uid?: string
    body?: { sessionId?: string, partnerEmail?: string }
    session?: Record<string, unknown> | null
    userDoc?: Record<string, unknown> | null
    partnerUserDoc?: { id: string, data: Record<string, unknown> } | null
    partnerSession?: Record<string, unknown> | null
  }) => {
    const uid = options?.uid ?? 'user-1'
    const body = options?.body ?? {
      sessionId: 'session-1',
      partnerEmail: 'partner@example.com',
    }
    const session = options?.session ?? {
      uid,
      questionnaireType: 'attachment',
      status: 'completed',
      relationContext: {
        partnerFirstName: null,
        partnerAge: null,
        partnerGender: null,
      },
      billingInfo: {
        hasPaidResults: true,
        hasPaidIa: false,
        hasPaidMembership: false,
        hasPaidFormation: false,
      },
    }
    const userDoc = options?.userDoc ?? {
      name: 'Johan',
      email: 'prenom@example.com',
    }
    const partnerUserDoc = options?.partnerUserDoc ?? null
    const partnerSession = options?.partnerSession ?? null

    const sessionSetMock = vi.fn().mockResolvedValue(undefined)
    const sessionGetMock = vi.fn().mockResolvedValue({
      exists: session !== null,
      data: () => session,
    })
    const userGetMock = vi.fn().mockResolvedValue({
      data: () => userDoc,
    })
    const partnerUsersGetMock = vi.fn().mockResolvedValue({
      docs: partnerUserDoc ? [{
        id: partnerUserDoc.id,
        data: () => partnerUserDoc.data,
      }] : [],
    })
    const sendEmailMock = vi.fn().mockResolvedValue({ id: 'mail-1' })

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body))
    vi.stubGlobal('createError', (payload: { statusCode: number, statusMessage: string }) => {
      const error = new Error(payload.statusMessage) as Error & { statusCode?: number, statusMessage?: string }
      error.statusCode = payload.statusCode
      error.statusMessage = payload.statusMessage
      return error
    })
    vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({
      resendApiKey: 'resend-key',
      mailFrom: 'Relation anxieux-evitant <onboarding@resend.dev>',
    })))

    vi.doMock('firebase-admin/firestore', () => ({
      FieldValue: {
        serverTimestamp: vi.fn(() => 'server-timestamp'),
      },
    }))

    vi.doMock('../../server/utils/attachment/partnerShare', () => ({
      escapeHtml: (value: string) => value,
      getBaseUrl: () => 'https://relation-anxieux-evitant-test.web.app',
      getLatestAttachmentSessionForUid: vi.fn().mockResolvedValue(
        partnerSession ? { id: 'partner-session-1', ...partnerSession } : null,
      ),
      isEmailValid: (value: string) => value.includes('@'),
      normalizeEnvValue: (value: unknown) => typeof value === 'string' ? value.trim() : '',
      normalizeText: (value: unknown) => typeof value === 'string' ? value.trim() : '',
      sendEmail: sendEmailMock,
    }))

    vi.doMock('../../server/utils/firebaseAdmin', () => ({
      adminDb: {
        collection: vi.fn((collectionName: string) => {
          if (collectionName === 'questionnaireSessions') {
            return {
              doc: vi.fn(() => ({
                get: sessionGetMock,
                set: sessionSetMock,
              })),
            }
          }

          if (collectionName === 'users') {
            return {
              doc: vi.fn(() => ({
                get: userGetMock,
              })),
              where: vi.fn(() => ({
                limit: vi.fn(() => ({
                  get: partnerUsersGetMock,
                })),
              })),
            }
          }

          throw new Error(`Unexpected collection ${collectionName}`)
        }),
      },
    }))

    vi.doMock('../../server/utils/getAuthenticatedUid', () => ({
      getAuthenticatedUid: vi.fn().mockResolvedValue(uid),
    }))

    vi.doMock('../../server/utils/siteConfig', () => ({
      isResultsSharingEnabled: vi.fn().mockResolvedValue(true),
    }))

    const mod = await import('../../server/api/attachment/partner-share.post')

    return {
      handler: mod.default as (event: unknown) => Promise<unknown>,
      sessionSetMock,
      sendEmailMock,
    }
  }

  it('rejects an invalid partner email', async () => {
    const { handler, sessionSetMock } = await loadShareHandler({
      body: {
        sessionId: 'session-1',
        partnerEmail: 'invalid-email',
      },
    })

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Renseigne une adresse email valide.',
    })

    expect(sessionSetMock).not.toHaveBeenCalled()
  })

  it('rejects self invitation when the typed email is the current user email', async () => {
    const { handler, sendEmailMock } = await loadShareHandler({
      body: {
        sessionId: 'session-1',
        partnerEmail: 'prenom@example.com',
      },
    })

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Tu ne peux pas t’inviter toi-même.',
    })

    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('stores an awaiting_validation state when the partner already exists and already has a session', async () => {
    const { handler, sessionSetMock, sendEmailMock } = await loadShareHandler({
      partnerUserDoc: {
        id: 'user-2',
        data: {
          email: 'partner@example.com',
        },
      },
      partnerSession: {
        uid: 'user-2',
        questionnaireType: 'attachment',
        status: 'completed',
        completedAt: { seconds: 1714300000 },
      },
    })

    await expect(handler({})).resolves.toEqual({
      ok: true,
      partnerExists: true,
      status: 'awaiting_validation',
      deliveryMode: 'manual_queue',
    })

    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(sessionSetMock).toHaveBeenCalledWith({
      relationContext: expect.objectContaining({
        partnerEmail: 'partner@example.com',
        partnerUid: 'user-2',
        partnerQuestionnaireSessionId: null,
        partnerShareStatus: 'awaiting_validation',
        partnerInviteSentAt: 'server-timestamp',
      }),
      updatedAt: 'server-timestamp',
    }, { merge: true })
  })

  it('stores an invite_sent state when the partner does not exist yet', async () => {
    const { handler, sessionSetMock } = await loadShareHandler({
      partnerUserDoc: null,
      partnerSession: null,
    })

    await expect(handler({})).resolves.toEqual({
      ok: true,
      partnerExists: false,
      status: 'invite_sent',
      deliveryMode: 'manual_queue',
    })

    expect(sessionSetMock).toHaveBeenCalledWith({
      relationContext: expect.objectContaining({
        partnerEmail: 'partner@example.com',
        partnerUid: null,
        partnerQuestionnaireSessionId: null,
        partnerShareStatus: 'invite_sent',
        partnerInviteSentAt: 'server-timestamp',
      }),
      updatedAt: 'server-timestamp',
    }, { merge: true })
  })

  it('rejects share creation when the feature flag is disabled', async () => {
    vi.resetModules()
    vi.unstubAllGlobals()

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('createError', (payload: { statusCode: number, statusMessage: string }) => {
      const error = new Error(payload.statusMessage) as Error & { statusCode?: number, statusMessage?: string }
      error.statusCode = payload.statusCode
      error.statusMessage = payload.statusMessage
      return error
    })

    vi.doMock('../../server/utils/siteConfig', () => ({
      isResultsSharingEnabled: vi.fn().mockResolvedValue(false),
    }))

    const mod = await import('../../server/api/attachment/partner-share.post')

    await expect(mod.default({})).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Le partage de résultats est temporairement indisponible.',
    })
  })
})

describe('POST /api/attachment/partner-share/validate', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  const loadValidateHandler = async () => {
    const sourceSessionSetMock = vi.fn().mockResolvedValue(undefined)
    const targetSessionSetMock = vi.fn().mockResolvedValue(undefined)

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({
      sourceSessionId: 'source-session-1',
      targetSessionId: 'target-session-1',
    }))
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

    const sendEmailMock = vi.fn().mockResolvedValue({ id: 'mail-2' })

    vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({
      resendApiKey: 'resend-key',
      mailFrom: 'Relation anxieux-evitant <onboarding@resend.dev>',
    })))

    vi.doMock('../../server/utils/attachment/partnerShare', () => ({
      escapeHtml: (value: string) => value,
      getBaseUrl: () => 'https://relation-anxieux-evitant-test.web.app',
      normalizeEnvValue: (value: unknown) => typeof value === 'string' ? value.trim() : '',
      normalizeText: (value: unknown) => typeof value === 'string' ? value.trim() : '',
      sendEmail: sendEmailMock,
      getLatestAttachmentSessionForUid: vi.fn(),
    }))

    vi.doMock('../../server/utils/firebaseAdmin', () => ({
      adminDb: {
        collection: vi.fn((collectionName: string) => {
          if (collectionName === 'users') {
            return {
              doc: vi.fn((docId: string) => ({
                get: vi.fn().mockResolvedValue({
                  data: () => {
                    if (docId === 'user-2') {
                      return { email: 'partner@example.com' }
                    }

                    if (docId === 'user-1') {
                      return { email: 'prenom@example.com' }
                    }

                    return {}
                  },
                }),
              })),
            }
          }

          if (collectionName === 'questionnaireSessions') {
            return {
              where: vi.fn(() => ({
                where: vi.fn(() => ({
                  where: vi.fn(() => ({
                    get: vi.fn().mockResolvedValue({
                      docs: [{
                        id: 'target-session-1',
                        data: () => ({
                          uid: 'user-2',
                          questionnaireType: 'attachment',
                          status: 'completed',
                          completedAt: { seconds: 1714300001, nanoseconds: 0 },
                          result: {
                            globalProfile: 'mixedProfile',
                            anxietyScore: 53,
                            avoidanceScore: 43,
                          },
                          relationContext: {
                            partnerFirstName: null,
                            partnerAge: null,
                            partnerGender: null,
                          },
                        }),
                      }],
                    }),
                  })),
                })),
              })),
              doc: vi.fn((docId: string) => {
                if (docId === 'source-session-1') {
                  return {
                    get: vi.fn().mockResolvedValue({
                      exists: true,
                      data: () => ({
                        uid: 'user-1',
                        questionnaireType: 'attachment',
                        status: 'completed',
                        completedAt: { seconds: 1714300000, nanoseconds: 0 },
                        result: {
                          globalProfile: 'globallySecure',
                          anxietyScore: 24,
                          avoidanceScore: 18,
                        },
                        relationContext: {
                          partnerEmail: 'partner@example.com',
                          partnerInviteSentAt: { seconds: 1714200000, nanoseconds: 0 },
                          partnerShareStatus: 'awaiting_validation',
                        },
                      }),
                    }),
                    set: sourceSessionSetMock,
                  }
                }

                if (docId === 'target-session-1') {
                  return {
                    get: vi.fn().mockResolvedValue({
                      exists: true,
                      data: () => ({
                        relationContext: {
                          partnerFirstName: null,
                          partnerAge: null,
                          partnerGender: null,
                        },
                      }),
                    }),
                    set: targetSessionSetMock,
                  }
                }

                throw new Error(`Unexpected questionnaire session doc ${docId}`)
              }),
            }
          }

          throw new Error(`Unexpected collection ${collectionName}`)
        }),
      },
    }))

    vi.doMock('../../server/utils/getAuthenticatedUid', () => ({
      getAuthenticatedUid: vi.fn().mockResolvedValue('user-2'),
    }))

    vi.doMock('../../server/utils/siteConfig', () => ({
      isResultsSharingEnabled: vi.fn().mockResolvedValue(true),
    }))

    const mod = await import('../../server/api/attachment/partner-share/validate.post')

    return {
      handler: mod.default as (event: unknown) => Promise<unknown>,
      sourceSessionSetMock,
      targetSessionSetMock,
    }
  }

  it('mirrors both partner snapshots once an existing partner validates the request from the profile', async () => {
    const { handler, sourceSessionSetMock, targetSessionSetMock } = await loadValidateHandler()

    await expect(handler({})).resolves.toEqual({ ok: true })

    expect(sourceSessionSetMock).toHaveBeenCalledWith({
      relationContext: expect.objectContaining({
        partnerEmail: 'partner@example.com',
        partnerUid: 'user-2',
        partnerQuestionnaireSessionId: 'target-session-1',
        partnerGlobalStyle: 'mixedProfile',
        partnerAnxietyScore: 53,
        partnerAvoidanceScore: 43,
        partnerShareStatus: 'linked',
      }),
      updatedAt: 'server-timestamp',
    }, { merge: true })

    expect(targetSessionSetMock).toHaveBeenCalledWith({
      relationContext: expect.objectContaining({
        partnerEmail: 'prenom@example.com',
        partnerUid: 'user-1',
        partnerQuestionnaireSessionId: 'source-session-1',
        partnerGlobalStyle: 'globallySecure',
        partnerAnxietyScore: 24,
        partnerAvoidanceScore: 18,
        partnerShareStatus: 'linked',
      }),
      updatedAt: 'server-timestamp',
    }, { merge: true })
  })

  it('rejects validation when the feature flag is disabled', async () => {
    vi.resetModules()
    vi.unstubAllGlobals()

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('createError', (payload: { statusCode: number, statusMessage: string }) => {
      const error = new Error(payload.statusMessage) as Error & { statusCode?: number, statusMessage?: string }
      error.statusCode = payload.statusCode
      error.statusMessage = payload.statusMessage
      return error
    })

    vi.doMock('../../server/utils/siteConfig', () => ({
      isResultsSharingEnabled: vi.fn().mockResolvedValue(false),
    }))

    const mod = await import('../../server/api/attachment/partner-share/validate.post')

    await expect(mod.default({})).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Le partage de résultats est temporairement indisponible.',
    })
  })
})

describe('GET /api/attachment/partner-share/pending', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  const loadPendingHandler = async () => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('createError', (payload: { statusCode: number, statusMessage: string }) => {
      const error = new Error(payload.statusMessage) as Error & { statusCode?: number, statusMessage?: string }
      error.statusCode = payload.statusCode
      error.statusMessage = payload.statusMessage
      return error
    })

    vi.doMock('../../server/utils/attachment/partnerShare', () => ({
      normalizeText: (value: unknown) => typeof value === 'string' ? value.trim() : '',
    }))

    vi.doMock('../../server/utils/firebaseAdmin', () => ({
      adminDb: {
        collection: vi.fn((collectionName: string) => {
          if (collectionName === 'users') {
            return {
              doc: vi.fn((docId: string) => ({
                get: vi.fn().mockResolvedValue({
                  data: () => ({
                    ...(docId === 'user-2'
                      ? { email: 'partner@example.com' }
                      : { name: 'Camille', email: 'camille@example.com' }),
                  }),
                }),
              })),
            }
          }

          if (collectionName === 'questionnaireSessions') {
            return {
              where: vi.fn(() => ({
                get: vi.fn().mockResolvedValue({
                  docs: [{
                    id: 'source-session-1',
                    data: () => ({
                      uid: 'user-1',
                      questionnaireType: 'attachment',
                      status: 'completed',
                      completedAt: { seconds: 1714300000, nanoseconds: 0 },
                      result: {
                        globalProfile: 'mixedProfile',
                        anxietyScore: 53,
                        avoidanceScore: 43,
                      },
                      relationContext: {
                        partnerEmail: 'partner@example.com',
                        partnerInviteSentAt: { seconds: 1714200000, nanoseconds: 0 },
                        partnerShareStatus: 'awaiting_validation',
                      },
                    }),
                  }],
                }),
              })),
            }
          }

          throw new Error(`Unexpected collection ${collectionName}`)
        }),
      },
    }))

    vi.doMock('../../server/utils/getAuthenticatedUid', () => ({
      getAuthenticatedUid: vi.fn().mockResolvedValue('user-2'),
    }))

    vi.doMock('../../server/utils/siteConfig', () => ({
      isResultsSharingEnabled: vi.fn().mockResolvedValue(true),
    }))

    const mod = await import('../../server/api/attachment/partner-share/pending.get')

    return {
      handler: mod.default as (event: unknown) => Promise<unknown>,
    }
  }

  it('returns pending partner-share requests for the current user email', async () => {
    const { handler } = await loadPendingHandler()

    await expect(handler({})).resolves.toEqual([{
      sourceSessionId: 'source-session-1',
      senderUid: 'user-1',
      senderName: 'Camille',
      senderEmail: 'camille@example.com',
      sourceCompletedAt: { seconds: 1714300000, nanoseconds: 0 },
      sourceGlobalProfile: 'mixedProfile',
      sourceAnxietyScore: 53,
      sourceAvoidanceScore: 43,
      requestedAt: { seconds: 1714200000, nanoseconds: 0 },
    }])
  })

  it('rejects pending requests when the feature flag is disabled', async () => {
    vi.resetModules()
    vi.unstubAllGlobals()

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('createError', (payload: { statusCode: number, statusMessage: string }) => {
      const error = new Error(payload.statusMessage) as Error & { statusCode?: number, statusMessage?: string }
      error.statusCode = payload.statusCode
      error.statusMessage = payload.statusMessage
      return error
    })

    vi.doMock('../../server/utils/siteConfig', () => ({
      isResultsSharingEnabled: vi.fn().mockResolvedValue(false),
    }))

    const mod = await import('../../server/api/attachment/partner-share/pending.get')

    await expect(mod.default({})).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Le partage de résultats est temporairement indisponible.',
    })
  })
})

describe('POST /api/attachment/results partner mirroring', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  const loadResultsHandler = async () => {
    const addedDocs = new Map<string, Record<string, unknown>>()
    const sessionSets = new Map<string, ReturnType<typeof vi.fn>>()
    const userSetMock = vi.fn().mockResolvedValue(undefined)

    const sourceSessionDoc = {
      uid: 'user-1',
      questionnaireType: 'attachment',
      status: 'completed',
      completedAt: { seconds: 1714300000, nanoseconds: 0 },
      relationContext: {
        partnerFirstName: null,
        partnerAge: null,
        partnerGender: null,
        partnerEmail: 'partner@example.com',
        partnerInviteSentAt: { seconds: 1714200000, nanoseconds: 0 },
        partnerShareStatus: 'invite_sent',
      },
      result: {
        globalProfile: 'globallySecure',
        anxietyScore: 24,
        avoidanceScore: 18,
      },
    }

    const requestBody: ComputeAttachmentQuestionnaireResultsRequest = {
      results: [{ id: 1, dimension: 'anxiety', value: 3, tags: ['fearOfLoss'] }],
      questions: [{ id: 1, dimension: 'anxiety', question: 'Q1', tags: ['fearOfLoss'] }],
      relationContext: {
        partnerFirstName: null,
        partnerAge: null,
        partnerGender: null,
        partnerShareSource: {
          uid: 'user-1',
          questionnaireSessionId: 'source-session-1',
        },
      },
    }

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue(requestBody))
    vi.stubGlobal('getHeader', vi.fn((_event: unknown, name: string) => {
      if (name === 'authorization') {
        return 'Bearer token-123'
      }

      return undefined
    }))
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
      Timestamp: {
        fromMillis: vi.fn((value: number) => ({ seconds: Math.floor(value / 1000), millis: value })),
      },
    }))

    vi.doMock('../../server/utils/attachment/computeAttachmentQuestionnaireResults', () => ({
      computeAttachmentQuestionnaireResults: vi.fn().mockReturnValue({
        averageScores: [
          { dimension: 'anxiety', average: 53 },
          { dimension: 'avoidance', average: 43 },
        ],
        attachmentProfilesByDimension: {
          globalStyle: 'mixedProfile',
          anxiety: 'anxiousActivated',
          avoidance: 'avoidantFlexible',
        },
        regulationIndexByDimension: {
          anxiety: [],
          avoidance: [],
        },
      }),
    }))

    vi.doMock('../../server/utils/attachment/buildAttachmentQuestionnaireDisplayResult', () => ({
      buildAttachmentQuestionnaireDisplayResult: vi.fn().mockReturnValue({
        completionDate: '25/04/2026',
        tagsResults: { anxiety: [], avoidance: [] },
        tagData: [],
        anxietyAverageScore: 53,
        avoidanceAverageScore: 43,
        anxietyDatasets: [],
        avoidanceDatasets: [],
      }),
    }))

    vi.doMock('../../server/utils/attachment/buildQuestionnaireSessionDoc', () => ({
      buildQuestionnaireSessionDoc: vi.fn().mockImplementation((_uid: string, _computedResults: unknown, _rawAnswers: unknown, relationContext: unknown) => ({
        uid: 'user-2',
        questionnaireType: 'attachment',
        questionnaireVersion: 'v1',
        status: 'completed',
        scoringVersion: '1',
        relationContext,
        answers: [],
        result: {
          anxietyScore: 53,
          avoidanceScore: 43,
          globalProfile: 'mixedProfile',
          anxietySubProfile: 'anxiousActivated',
          avoidanceSubProfile: 'avoidantFlexible',
          triggers: {},
        },
        billingInfo: {
          hasPaidResults: false,
          hasPaidIa: false,
          hasPaidMembership: false,
          hasPaidFormation: false,
        },
        persist: {
          status: 'persisted',
          retryCount: 0,
          lastAttemptAt: null,
          lastErrorCode: null,
        },
      })),
    }))

    vi.doMock('../../server/utils/attachment/validateAttachmentResults', () => ({
      AttachmentValidationError: class AttachmentValidationError extends Error {},
      validateAttachmentResults: vi.fn(),
      validateQuestionsMatchCanonical: vi.fn(),
    }))

    vi.doMock('../../server/utils/firebaseAdmin', () => ({
      adminAuth: {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-2' }),
      },
      adminDb: {
        collection: vi.fn((collectionName: string) => {
          if (collectionName === 'questionnaireSessions') {
            return {
              add: vi.fn(async (payload: Record<string, unknown>) => {
                addedDocs.set('target-session-1', payload)
                return { id: 'target-session-1' }
              }),
              doc: vi.fn((docId: string) => {
                if (!sessionSets.has(docId)) {
                  sessionSets.set(docId, vi.fn(async (payload: Record<string, unknown>) => {
                    const current = addedDocs.get(docId) ?? (docId === 'source-session-1' ? sourceSessionDoc : {})
                    addedDocs.set(docId, {
                      ...current,
                      ...payload,
                      relationContext: {
                        ...((current as Record<string, any>).relationContext ?? {}),
                        ...((payload as Record<string, any>).relationContext ?? {}),
                      },
                    })
                  }))
                }

                return {
                  get: vi.fn().mockResolvedValue({
                    exists: docId === 'source-session-1' || addedDocs.has(docId),
                    data: () => {
                      if (docId === 'source-session-1') {
                        return addedDocs.get(docId) ?? sourceSessionDoc
                      }

                      return addedDocs.get(docId)
                    },
                  }),
                  set: sessionSets.get(docId),
                }
              }),
            }
          }

          if (collectionName === 'users') {
            return {
              doc: vi.fn((docId: string) => ({
                get: vi.fn().mockResolvedValue({
                  data: () => {
                    if (docId === 'user-1') {
                      return { name: 'Johan', email: 'prenom@example.com', age: 39, gender: 'male' }
                    }

                    if (docId === 'user-2') {
                      return { name: 'Camille', email: 'partner@example.com', age: 37, gender: 'female' }
                    }

                    return {}
                  },
                }),
                set: userSetMock,
              })),
            }
          }

          throw new Error(`Unexpected collection ${collectionName}`)
        }),
      },
    }))

    const mod = await import('../../server/api/attachment/results.post')

    return {
      handler: mod.default as (event: unknown) => Promise<unknown>,
      addedDocs,
      sessionSets,
      userSetMock,
    }
  }

  it('hydrates both sessions after an invited partner completes the questionnaire from the emailed link', async () => {
    const { handler, sessionSets } = await loadResultsHandler()

    await expect(handler({})).resolves.toMatchObject({
      sessionId: 'target-session-1',
      persisted: true,
    })

    expect(sessionSets.get('source-session-1')).toHaveBeenCalledWith({
      relationContext: expect.objectContaining({
        partnerFirstName: 'Camille',
        partnerEmail: 'partner@example.com',
        partnerUid: 'user-2',
        partnerQuestionnaireSessionId: 'target-session-1',
        partnerGlobalStyle: 'mixedProfile',
        partnerAnxietyScore: 53,
        partnerAvoidanceScore: 43,
        partnerShareStatus: 'linked',
      }),
      updatedAt: 'server-timestamp',
    }, { merge: true })

    expect(sessionSets.get('target-session-1')).toHaveBeenCalledWith({
      relationContext: expect.objectContaining({
        partnerFirstName: 'Johan',
        partnerEmail: 'prenom@example.com',
        partnerUid: 'user-1',
        partnerQuestionnaireSessionId: 'source-session-1',
        partnerGlobalStyle: 'globallySecure',
        partnerAnxietyScore: 24,
        partnerAvoidanceScore: 18,
        partnerShareStatus: 'linked',
      }),
      updatedAt: 'server-timestamp',
    }, { merge: true })
  })
})
