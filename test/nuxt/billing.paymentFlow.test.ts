import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'

import UserResultsPage from '../../app/pages/user/attachment-questionnaire/results.vue'
import type { QuestionnaireSession } from '../../app/types/questionnaireSessions'
import type { AttachmentQuestionnaireDisplayResults } from '../../app/types/attachmentQuestionnaireResults'

const mockQuery = vi.hoisted(() => ({ sessionId: 'session-1' as string | undefined }))

const mockAuthState = vi.hoisted(() => ({
  user: { id: 'user-123' },
}))

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(() => 'checkout-sessions-ref'),
  query: vi.fn((value) => value),
  where: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
}))

const sessionsState = vi.hoisted(() => ({
  current: null as QuestionnaireSession | null,
  loadSessions: vi.fn(),
  getSessionById: vi.fn(),
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthState),
}))

vi.mock('firebase/firestore', () => ({
  collection: firestoreMocks.collection,
  query: firestoreMocks.query,
  where: firestoreMocks.where,
  addDoc: firestoreMocks.addDoc,
  getDocs: firestoreMocks.getDocs,
  onSnapshot: firestoreMocks.onSnapshot,
}))

vi.mock('~/composables/firebase/init', () => ({
  firebaseClient: {
    db: {},
    app: {},
    getFunctions: vi.fn(() => ({})),
    httpsCallable: vi.fn(),
  },
}))

vi.mock('~/stores/questionnaireSessions', () => ({
  useQuestionnaireSessionsStore: vi.fn(() => ({
    loadSessions: sessionsState.loadSessions,
    getSessionById: sessionsState.getSessionById,
    get latestAttachmentSession() {
      return sessionsState.current
    },
  })),
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

mockComponent('~/components/attachmentQuestionnaire/Results.vue', () => ({
  props: ['sessionBillingInfo'],
  template: `
    <div>
      <p class="billing-access">
        {{ sessionBillingInfo?.hasPaidResults ? 'UNLOCKED' : 'LOCKED' }}
      </p>
    </div>
  `,
}))

const MOCK_DISPLAY_RESULTS: AttachmentQuestionnaireDisplayResults = {
  completionDate: '07/04/2026',
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
}

registerEndpoint('/api/attachment/display-from-session', {
  method: 'POST',
  handler: () => MOCK_DISPLAY_RESULTS,
})

const makeSession = (hasPaidResults: boolean): QuestionnaireSession => ({
  id: 'session-1',
  uid: 'user-123',
  questionnaireType: 'attachment',
  questionnaireVersion: 'v1',
  status: 'completed',
  scoringVersion: '1',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  updatedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  completedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  relationContext: { partnerFirstName: null, partnerAge: null },
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
    hasPaidResults,
    hasPaidIa: false,
    hasPaidMembership: false,
    hasPaidFormation: false,
  },
  persist: { status: 'persisted', retryCount: 0, lastAttemptAt: null, lastErrorCode: null },
})

describe('billing/payment flow regression coverage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()

    firestoreMocks.collection.mockReset().mockReturnValue('checkout-sessions-ref')
    firestoreMocks.query.mockReset().mockImplementation((value) => value)
    firestoreMocks.where.mockReset()
    firestoreMocks.addDoc.mockReset()
    firestoreMocks.getDocs.mockReset()
    firestoreMocks.onSnapshot.mockReset()

    sessionsState.current = makeSession(false)
    sessionsState.getSessionById.mockReset().mockImplementation(() => sessionsState.current)
    sessionsState.loadSessions.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates checkout session with profile cancel url', async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: 'checkout-doc' })
    firestoreMocks.onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({
        data: () => ({ url: 'https://stripe.test/checkout/session-1' }),
      })
      return vi.fn()
    })

    const assignMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://app.test', assign: assignMock },
      configurable: true,
    })

    const { useBillingStore } = await import('../../app/stores/billing')
    const store = useBillingStore()

    await store.goToCheckout('questionnaire', 'attachment', 'results', 'v1', 'attachment-questionnaire', 'session-1')

    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      'checkout-sessions-ref',
      expect.objectContaining({
        success_url: 'https://app.test/user/attachment-questionnaire/results?sessionId=session-1',
        cancel_url: 'https://app.test/user/profil/',
      }),
    )
    expect(assignMock).toHaveBeenCalledWith('https://stripe.test/checkout/session-1')
  })

  it('refuses to create a results checkout session when the questionnaire session is still missing', async () => {
    const { useBillingStore } = await import('../../app/stores/billing')
    const store = useBillingStore()

    await expect(
      store.goToCheckout('questionnaire', 'attachment', 'results', 'v1', 'attachment-questionnaire', ''),
    ).rejects.toThrow('La session est encore en cours de sauvegarde')

    expect(firestoreMocks.addDoc).not.toHaveBeenCalled()
  })

  it('refreshes the session after delayed payment propagation and unlocks the results', async () => {
    vi.useFakeTimers()

    let loadCount = 0
    sessionsState.loadSessions.mockImplementation(async () => {
      loadCount++
      if (loadCount >= 2) {
        sessionsState.current = makeSession(true)
      }
    })

    const wrapper = await mountSuspended(UserResultsPage)

    expect(wrapper.find('.billing-access').text()).toBe('LOCKED')

    // Expected target behavior:
    // after redirect from Stripe, the page should refresh/poll session data so a
    // delayed Cloud Function propagation on billingInfo eventually unlocks access.
    await vi.advanceTimersByTimeAsync(5000)
    await vi.waitFor(() => {
      expect(sessionsState.loadSessions).toHaveBeenCalledTimes(2)
    })
    expect(wrapper.find('.billing-access').text()).toBe('UNLOCKED')
  })
})
