import { beforeEach, describe, expect, it, vi } from 'vitest'
import questionsData from '../../app/assets/data/questions.json'
import type {
  AttachmentQuestion,
  ComputeAttachmentQuestionnaireResultsRequest,
  QuestionResult,
} from '../../app/types/attachmentQuestionnaireResults'

const QUESTION_LIST = (questionsData as { questions: AttachmentQuestion[] }).questions

const buildValidResults = (): QuestionResult[] => {
  return QUESTION_LIST.map((question, index) => ({
    id: question.id,
    dimension: question.dimension,
    value: index % 5,
    tags: [...question.tags],
  }))
}

const createBody = (
  override: Partial<ComputeAttachmentQuestionnaireResultsRequest> = {},
): ComputeAttachmentQuestionnaireResultsRequest => ({
  results: buildValidResults(),
  questions: QUESTION_LIST,
  relationContext: null,
  ...override,
})

describe('POST /api/attachment/results validation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  const loadHandlerWithBody = async (body: ComputeAttachmentQuestionnaireResultsRequest) => {
    const addMock = vi.fn()
    const verifyIdTokenMock = vi.fn()

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body))
    vi.stubGlobal('getHeader', vi.fn().mockReturnValue(undefined))
    vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string }) => {
      const error = new Error(payload.statusMessage) as Error & { statusCode?: number; statusMessage?: string }
      error.statusCode = payload.statusCode
      error.statusMessage = payload.statusMessage
      return error
    })

    vi.doMock('firebase-admin/firestore', () => ({
      FieldValue: { serverTimestamp: vi.fn(() => 'server-timestamp') },
    }))

    vi.doMock('../../server/utils/firebaseAdmin', () => ({
      adminAuth: { verifyIdToken: verifyIdTokenMock },
      adminDb: {
        collection: vi.fn(() => ({
          add: addMock,
        })),
      },
    }))

    const mod = await import('../../server/api/attachment/results.post')

    return {
      handler: mod.default as (event: unknown) => Promise<unknown>,
      addMock,
      verifyIdTokenMock,
    }
  }

  it('returns 400 when a question id is missing', async () => {
    const body = createBody({
      results: buildValidResults().filter(result => result.id !== 20),
    })
    const { handler, addMock } = await loadHandlerWithBody(body)

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('returns 400 when a question id is duplicated', async () => {
    const results = buildValidResults()
    const body = createBody({
      results: [...results, { ...results[0] }],
    })
    const { handler, addMock } = await loadHandlerWithBody(body)

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(addMock).not.toHaveBeenCalled()
  })

  it.each([-1, 5])('returns 400 when a value is out of range (%s)', async (invalidValue) => {
    const results = buildValidResults()
    const body = createBody({
      results: results.map((result, index) => index === 0 ? { ...result, value: invalidValue } : result),
    })
    const { handler, addMock } = await loadHandlerWithBody(body)

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('returns 400 when a value is NaN', async () => {
    const results = buildValidResults()
    const body = createBody({
      results: results.map((result, index) => index === 0 ? { ...result, value: Number.NaN } : result),
    })
    const { handler, addMock } = await loadHandlerWithBody(body)

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('returns 400 when a dimension is unknown or mismatched', async () => {
    const results = buildValidResults()
    const body = createBody({
      results: results.map((result, index) => (
        index === 0
          ? { ...result, dimension: 'other' as unknown as QuestionResult['dimension'] }
          : result
      )),
    })
    const { handler, addMock } = await loadHandlerWithBody(body)

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('returns 400 when client-provided tags are falsified', async () => {
    const results = buildValidResults()
    const body = createBody({
      results: results.map((result, index) => index === 0 ? { ...result, tags: ['fakeTag'] } : result),
    })
    const { handler, addMock } = await loadHandlerWithBody(body)

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('returns 400 when client-provided questions are falsified', async () => {
    const tamperedQuestions = QUESTION_LIST.map((question, index) => (
      index === 0
        ? { ...question, tags: ['fakeTag'] }
        : question
    ))
    const body = createBody({
      questions: tamperedQuestions,
    })
    const { handler, addMock } = await loadHandlerWithBody(body)

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(addMock).not.toHaveBeenCalled()
  })
})
