import type { AiExchange } from '~/types/questionnaireSessions'

export const createEmptyAiExchange = (): AiExchange => ({
  unlocked: false,
  purchasedAt: null,
  userInput: null,
  output: null,
  generatedAt: null,
  lastAttemptAt: null,
  retryCount: 0,
  lastErrorCode: null,
  lastErrorMessage: null,
  status: 'not_purchased',
  model: null,
  requestId: null,
  promptVersion: null,
})

export const normalizeAiExchange = (value: Partial<AiExchange> | null | undefined): AiExchange => {
  return {
    ...createEmptyAiExchange(),
    ...(value ?? {}),
  }
}
