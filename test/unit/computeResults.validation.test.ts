import { describe, expect, it } from 'vitest'
import { computeAttachmentQuestionnaireResults } from '../../server/utils/attachment/computeAttachmentQuestionnaireResults'
import questionsData from '../../app/assets/data/attachment/questions.json'
import type {
  AttachmentQuestion,
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

describe('computeAttachmentQuestionnaireResults input validation', () => {
  it('throws when a question id is missing from the results', () => {
    const results = buildValidResults().filter(result => result.id !== 20)

    expect(() => computeAttachmentQuestionnaireResults(results, QUESTION_LIST)).toThrow()
  })

  it('throws when a question id is duplicated', () => {
    const results = buildValidResults()
    results.push({ ...results[0] })

    expect(() => computeAttachmentQuestionnaireResults(results, QUESTION_LIST)).toThrow()
  })

  it.each([-1, 5])('throws when a response value is out of range (%s)', (invalidValue) => {
    const results = buildValidResults()
    results[0] = { ...results[0], value: invalidValue }

    expect(() => computeAttachmentQuestionnaireResults(results, QUESTION_LIST)).toThrow()
  })

  it('throws when a response value is NaN', () => {
    const results = buildValidResults()
    results[0] = { ...results[0], value: Number.NaN }

    expect(() => computeAttachmentQuestionnaireResults(results, QUESTION_LIST)).toThrow()
  })

  it('throws when a response dimension does not match the question dimension', () => {
    const results = buildValidResults()
    results[0] = { ...results[0], dimension: 'avoidance' }

    expect(() => computeAttachmentQuestionnaireResults(results, QUESTION_LIST)).toThrow()
  })

  it('throws when response tags do not match the question tags', () => {
    const results = buildValidResults()
    results[0] = { ...results[0], tags: ['fakeTag'] }

    expect(() => computeAttachmentQuestionnaireResults(results, QUESTION_LIST)).toThrow()
  })
})
