import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockComponent, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import type {
  AttachmentQuestionnaireDisplayResults,
  ComputeAttachmentResultsApiResponse,
} from '../../app/types/attachmentQuestionnaireResults'

const authState = vi.hoisted(() => ({
  currentUser: null as null | { getIdToken: ReturnType<typeof vi.fn> },
}))

const authStoreState = vi.hoisted(() => ({
  isLoggedIn: true,
  currentPartnerContext: null,
  initAuth: vi.fn().mockResolvedValue(undefined),
  openLoginModal: vi.fn(),
}))

const mockWizardState = vi.hoisted(() => ({
  result: [{ id: 1, dimension: 'anxiety' as const, value: 3, tags: ['fearOfLoss'] }],
  isCompleted: true,
  reset: vi.fn(),
}))

const mockApiHandler = vi.hoisted(() => vi.fn())

vi.mock('~/composables/firebase/init', () => ({
  firebaseClient: {
    auth: authState,
  },
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => authStoreState),
}))

vi.mock('~/stores/attachmentQuestionnaireWizard', () => ({
  useAttachmentQuestionnaireWizardStore: vi.fn(() => mockWizardState),
}))

mockComponent('~/components/attachmentQuestionnaire/Results.vue', () => ({
  template: '<div class="results-stub">results rendered</div>',
}))

registerEndpoint('/api/attachment/results', {
  method: 'POST',
  handler: () => mockApiHandler(),
})

const SUCCESS_RESPONSE: ComputeAttachmentResultsApiResponse = {
  results: {
    completionDate: '14/04/2026',
    anxietyAverageScore: 53,
    avoidanceAverageScore: 43,
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
  } as AttachmentQuestionnaireDisplayResults,
  sessionId: 'session-auth-ready',
  persisted: true,
}

describe('attachment-questionnaire/results auth readiness', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockApiHandler.mockReset()
    authStoreState.isLoggedIn = true
    authStoreState.currentPartnerContext = null
    authState.currentUser = null
  })

  it('waits briefly for Firebase currentUser before the first persist call', async () => {
    mockApiHandler.mockImplementation(() => {
      expect(authState.currentUser).not.toBeNull()
      return SUCCESS_RESPONSE
    })

    setTimeout(() => {
      authState.currentUser = {
        getIdToken: vi.fn().mockResolvedValue('firebase-token'),
      }
    }, 150)

    const HotResultsPage = (await import('../../app/pages/attachment-questionnaire/results.vue')).default
    const wrapper = await mountSuspended(HotResultsPage)

    expect(mockApiHandler).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('results rendered')
  })
})
