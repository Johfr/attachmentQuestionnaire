/**
 * P0 — user/attachment-questionnaire/results page
 *
 * Tests:
 *  1. SessionId isolation: a sessionId that does not belong to the current
 *     user's loaded sessions returns an error message, not the results.
 *  2. Valid sessionId: results are shown and data is visible.
 *  3. No sessionId: the most recent session is used.
 *  4. No sessions at all: a specific error message is shown.
 *  5. Session with no answers: a specific error message is shown.
 *  6. Page title renders, no error paragraph on success, loadSessions called once.
 *
 * Strategy:
 *  - mockNuxtImport('useRoute', ...) with a per-test mutable query ref.
 *    Only useRoute is mocked, NOT useRouter — mocking useRouter breaks
 *    the test-utils internal setupNuxt() which calls useRouter().afterEach().
 *  - Mock questionnaireSessions store (no Firebase).
 *  - Register mock server endpoint for /api/attachment/display-from-session.
 *  - Stub chart components (chart.js fails in happy-dom).
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'

import UserResultsPage from '../../app/pages/user/attachment-questionnaire/results.vue'
import type { QuestionnaireSession } from '../../app/types/questionnaireSessions'
import type { AttachmentQuestionnaireDisplayResults } from '../../app/types/attachmentQuestionnaireResults'

// ── Stub heavy chart deps ─────────────────────────────────────────────────
mockComponent('~/components/attachmentQuestionnaire/DoughnutChart.vue', () => ({
  template: '<div class="stub-doughnut" />',
}))
mockComponent('~/components/attachmentQuestionnaire/PolarChart.vue', () => ({
  template: '<div class="stub-polar" />',
}))

// ── Route mock ────────────────────────────────────────────────────────────
// mountSuspended's `route` option does not reach useRoute().query when the
// page has a top-level await (setup runs before the navigation completes).
// We mock useRoute to control query params per test. useRouter is intentionally
// NOT mocked — the test-utils internals call useRouter().afterEach() during init.
const mockQuery = vi.hoisted(() => ({ sessionId: undefined as string | undefined }))

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

// ── Sessions store mock ────────────────────────────────────────────────────
const mockSessionsState = vi.hoisted(() => ({
  sessions: [] as QuestionnaireSession[],
  loadSessions: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('~/stores/questionnaireSessions', () => ({
  useQuestionnaireSessionsStore: vi.fn(() => ({
    ...mockSessionsState,
    get latestAttachmentSession() {
      return (
        mockSessionsState.sessions.find(
          (s) => s.questionnaireType === 'attachment' && s.status === 'completed',
        ) ?? null
      )
    },
    getSessionById: vi.fn((id: string) => {
      return mockSessionsState.sessions.find((s) => s.id === id) ?? null
    }),
  })),
}))

// ── Mock API endpoint ──────────────────────────────────────────────────────
const MOCK_DISPLAY_RESULTS: Partial<AttachmentQuestionnaireDisplayResults> = {
  completionDate: '2026-04-01',
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

// ── Session fixture ────────────────────────────────────────────────────────
const makeSession = (id: string): QuestionnaireSession =>
  ({
    id,
    uid: 'user-123',
    questionnaireType: 'attachment',
    questionnaireVersion: 'v1',
    status: 'completed',
    scoringVersion: '1',
    createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    completedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    relationContext: { partnerFirstName: null, partnerAge: null },
    answers: [
      { id: 1, dimension: 'anxiety', value: 3, tags: ['fearOfLoss'] },
      { id: 2, dimension: 'avoidance', value: 2, tags: ['proximityDiscomfort'] },
    ],
    result: {
      anxietyScore: 65,
      avoidanceScore: 40,
      globalProfile: 'anxious',
      anxietySubProfile: 'anxiousActivated',
      avoidanceSubProfile: 'avoidantFlexible',
      triggers: {},
    },
    billingInfo: { hasPaidResults: false, hasPaidIa: false, hasPaidMembership: false, hasPaidFormation: false },
    persist: { status: 'persisted', retryCount: 0, lastAttemptAt: null, lastErrorCode: null },
  } as QuestionnaireSession)

const BASE_ROUTE = '/user/attachment-questionnaire/results'

const useImmediateTimeouts = () => {
  const immediateSetTimeout = ((
    callback: TimerHandler,
    _delay?: number,
    ...args: unknown[]
  ): ReturnType<typeof setTimeout> => {
    Promise.resolve().then(() => {
      if (typeof callback === 'function') {
        callback(...args)
        return
      }

      if (typeof callback === 'string') {
        Function(callback)()
      }
    })

    return 0 as unknown as ReturnType<typeof setTimeout>
  }) as unknown as typeof setTimeout

  return vi.spyOn(globalThis, 'setTimeout').mockImplementation(immediateSetTimeout)
}

// ─────────────────────────────────────────────────────────────────────────

describe('user/attachment-questionnaire/results page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockQuery.sessionId = undefined
    mockSessionsState.sessions = []
    mockSessionsState.loadSessions.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── SessionId isolation ───────────────────────────────────────────────────

  it('shows an error when the requested sessionId does not belong to the user', async () => {
    useImmediateTimeouts()
    mockSessionsState.sessions = [makeSession('session-mine')]
    mockQuery.sessionId = 'session-someone-else'

    const wrapper = await mountSuspended(UserResultsPage)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Impossible de recuperer cette session pour le moment')
    })
  })

  it('does not show results data when sessionId is not found', async () => {
    useImmediateTimeouts()
    mockSessionsState.sessions = [makeSession('session-mine')]
    mockQuery.sessionId = 'session-unknown'

    const wrapper = await mountSuspended(UserResultsPage)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Impossible de recuperer cette session pour le moment')
    })
    expect(wrapper.text()).not.toContain(MOCK_DISPLAY_RESULTS.completionDate)
  })

  // ── Valid sessionId ───────────────────────────────────────────────────────

  it('does not show an error when the sessionId matches a user session', async () => {
    mockSessionsState.sessions = [makeSession('session-mine')]
    mockQuery.sessionId = 'session-mine'

    const wrapper = await mountSuspended(UserResultsPage)

    expect(wrapper.text()).not.toContain('introuvable')
  })

  it('shows the completion date when the sessionId matches', async () => {
    mockSessionsState.sessions = [makeSession('session-mine')]
    mockQuery.sessionId = 'session-mine'

    const wrapper = await mountSuspended(UserResultsPage)

    expect(wrapper.text()).toContain(MOCK_DISPLAY_RESULTS.completionDate)
  })

  // ── No sessionId: falls back to latest ───────────────────────────────────

  it('loads the latest attachment session when no sessionId param is given', async () => {
    mockSessionsState.sessions = [makeSession('session-latest')]
    mockQuery.sessionId = undefined

    const wrapper = await mountSuspended(UserResultsPage)

    expect(wrapper.text()).not.toContain('Aucune session')
    expect(wrapper.text()).toContain(MOCK_DISPLAY_RESULTS.completionDate)
  })

  it('shows an error when there are no sessions and no sessionId param', async () => {
    mockSessionsState.sessions = []
    mockQuery.sessionId = undefined

    const wrapper = await mountSuspended(UserResultsPage)

    expect(wrapper.text()).toContain('Aucune session attachement disponible')
  })

  // ── Session without result ────────────────────────────────────────────────

  it('shows an error when the matched session has no result', async () => {
    const noResultSession = makeSession('session-no-result')
    // @ts-expect-error — intentionally crafting an invalid session to test the guard
    noResultSession.result = undefined
    mockSessionsState.sessions = [noResultSession]
    mockQuery.sessionId = 'session-no-result'

    const wrapper = await mountSuspended(UserResultsPage)

    expect(wrapper.text()).toContain('ne contient pas de')
  })

  // ── Page structure ────────────────────────────────────────────────────────

  it('renders the page h1 title', async () => {
    mockSessionsState.sessions = [makeSession('session-abc')]
    mockQuery.sessionId = 'session-abc'

    const wrapper = await mountSuspended(UserResultsPage)

    expect(wrapper.find('h1').exists()).toBe(true)
  })

  it('does not show a red error paragraph on successful load', async () => {
    mockSessionsState.sessions = [makeSession('session-abc')]
    mockQuery.sessionId = 'session-abc'

    const wrapper = await mountSuspended(UserResultsPage)

    const error = wrapper.find('p.text-red-600')
    expect(error.exists()).toBe(false)
  })

  it('calls loadSessions exactly once during page setup', async () => {
    mockSessionsState.sessions = [makeSession('session-abc')]
    mockQuery.sessionId = 'session-abc'

    await mountSuspended(UserResultsPage)

    expect(mockSessionsState.loadSessions).toHaveBeenCalledOnce()
  })
})
