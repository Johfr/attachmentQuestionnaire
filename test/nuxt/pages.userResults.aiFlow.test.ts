import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'

import UserResultsPage from '../../app/pages/user/attachment-questionnaire/results.vue'
import type { QuestionnaireSession } from '../../app/types/questionnaireSessions'

const mockQuery = vi.hoisted(() => ({ sessionId: 'session-123' as string | undefined }))
const generateCalls = vi.hoisted(() => ({ count: 0 }))
const mockSessionsState = vi.hoisted(() => ({
  sessions: [] as QuestionnaireSession[],
  loadSessions: vi.fn(async (force?: boolean) => {
    if (force && mockSessionsState.sessions[0]?.id === 'session-123') {
      const current = mockSessionsState.sessions[0]
      if (current?.aiExchange?.status === 'pending' && !current.aiExchange.requestId) {
        mockSessionsState.sessions = [{
          ...current,
          aiExchange: {
            ...current.aiExchange,
            status: 'generated',
            output: 'Analyse IA finalisee',
            generatedAt: { seconds: 2, nanoseconds: 0 } as never,
            requestId: 'openai-req-1',
            retryCount: 1,
          },
        }]
      }
    }
  }),
}))

mockComponent('~/components/attachmentQuestionnaire/Results.vue', () => ({
  props: ['docId', 'aiExchange'],
  template: `
    <div data-testid="attachment-results">
      <span data-testid="attachment-results-id">{{ docId }}</span>
      <span data-testid="attachment-ai-status">{{ aiExchange?.status }}</span>
      <span data-testid="attachment-ai-output">{{ aiExchange?.output ?? '' }}</span>
    </div>
  `,
}))

mockNuxtImport('useRoute', () => () => ({
  query: mockQuery,
  params: {},
  path: '/user/attachment-questionnaire/results',
  name: 'user-attachment-questionnaire-results',
  fullPath: '/user/attachment-questionnaire/results',
  matched: [],
  meta: {},
  hash: '',
  redirectedFrom: undefined,
}))

vi.mock('~/stores/questionnaireSessions', () => ({
  useQuestionnaireSessionsStore: vi.fn(() => ({
    get sessions() {
      return mockSessionsState.sessions
    },
    loadSessions: mockSessionsState.loadSessions,
    get latestAttachmentSession() {
      return mockSessionsState.sessions[0] ?? null
    },
    getSessionById: vi.fn((id: string) => {
      return mockSessionsState.sessions.find(session => session.id === id) ?? null
    }),
  })),
}))

vi.mock('~/composables/firebase/init', () => ({
  firebaseClient: {
    auth: {
      currentUser: {
        getIdToken: vi.fn().mockResolvedValue('firebase-token'),
      },
    },
  },
}))

registerEndpoint('/api/attachment/display-from-session', {
  method: 'POST',
  handler: () => ({
    completionDate: '2026-04-09',
    anxietyAverageScore: 65,
    avoidanceAverageScore: 40,
    attachmentProfilesByDimension: {
      anxiety: 'anxiousActivated',
      avoidance: 'avoidantFlexible',
      globalStyle: 'anxious',
    },
    averageScores: [],
    tagsResults: { anxiety: [], avoidance: [] },
    tagData: [],
    anxietyDatasets: [],
    avoidanceDatasets: [],
    triggersByDimension: { anxiety: [], avoidance: [] },
    regulationIndexByDimension: { anxiety: [], avoidance: [] },
    dimensionScores: { anxiety: [], avoidance: [] },
  }),
})

registerEndpoint('/api/attachment/ai/generate', {
  method: 'POST',
  handler: () => {
    generateCalls.count += 1
    return {
      status: 'generated',
      output: 'Analyse IA finalisee',
      requestId: 'openai-req-1',
    }
  },
})

const makeSession = (overrides: Partial<QuestionnaireSession> = {}): QuestionnaireSession => ({
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
    anxietyScore: 65,
    avoidanceScore: 40,
    globalProfile: 'anxious',
    anxietySubProfile: 'anxiousActivated',
    avoidanceSubProfile: 'avoidantFlexible',
    triggers: {},
  },
  billingInfo: {
    hasPaidResults: true,
    hasPaidIa: true,
    hasPaidMembership: false,
    hasPaidFormation: false,
  },
  aiExchange: {
    unlocked: true,
    purchasedAt: null,
    userInput: 'Je suis perdue dans ma relation.',
    output: null,
    generatedAt: null,
    lastAttemptAt: null,
    retryCount: 0,
    lastErrorCode: null,
    lastErrorMessage: null,
    status: 'pending',
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

describe('user/attachment-questionnaire/results IA flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockQuery.sessionId = 'session-123'
    generateCalls.count = 0
    mockSessionsState.loadSessions.mockClear()
    mockSessionsState.sessions = [makeSession()]
  })

  it('does not auto-start AI generation after a paid IA return while the module is paused', async () => {
    const wrapper = await mountSuspended(UserResultsPage)

    expect(generateCalls.count).toBe(0)
    expect(mockSessionsState.loadSessions).not.toHaveBeenCalledWith(true)
    expect(wrapper.find('[data-testid="attachment-ai-status"]').text()).toBe('pending')
    expect(wrapper.find('[data-testid="attachment-ai-output"]').text()).toBe('')
  })

  it('does not trigger generation again when a requestId already exists', async () => {
    mockSessionsState.sessions = [makeSession({
      aiExchange: {
        unlocked: true,
        purchasedAt: null,
        userInput: 'Je suis perdue dans ma relation.',
        output: null,
        generatedAt: null,
        lastAttemptAt: { seconds: 1, nanoseconds: 0 } as never,
        retryCount: 1,
        lastErrorCode: null,
        lastErrorMessage: null,
        status: 'pending',
        model: 'gpt-5',
        requestId: 'existing-req',
        promptVersion: null,
      },
    })]

    const wrapper = await mountSuspended(UserResultsPage)

    expect(generateCalls.count).toBe(0)
    expect(wrapper.find('[data-testid="attachment-ai-status"]').text()).toBe('pending')
  })
})
