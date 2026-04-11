/**
 * P0 - attachment-questionnaire/results page (hot results / first render)
 *
 * Covers the post-questionnaire display path:
 *  - Results come from the wizard store (in-memory, not Firestore)
 *  - API call to /api/attachment/results returns computed results + persist status
 *
 * Tests:
 *  1. persisted=true  -> results rendered, no save warning
 *  2. persisted=false -> results STILL rendered (fix: v-if no longer blocks on null sessionId)
 *  3. persisted=false -> "Sauvegarde en cours" banner shown during retry
 *  4. persisted=false + retry succeeds -> banner disappears
 *  5. persisted=false + all retries fail -> error message shown, results still visible
 *  6. Empty wizard result -> no API call, no results
 *
 * Retry strategy: [0, 2000, 8000, 20000ms].
 * Success-path retry is still exercised with fake timers.
 * Failure-path retry is made deterministic by executing setTimeout callbacks
 * immediately in a microtask, which avoids fake-timer desync with registerEndpoint().
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint, mockComponent } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import HotResultsPage from '../../app/pages/attachment-questionnaire/results.vue'
import type {
  AttachmentQuestionnaireDisplayResults,
  ComputeAttachmentResultsApiResponse,
} from '../../app/types/attachmentQuestionnaireResults'

// Drain the microtask queue without relying on setTimeout (safe with fake timers).
// $fetch through @nuxt/test-utils registerEndpoint resolves over several microtask
// cycles, so a few extra Promise turns keep assertions stable.
const drainMicrotasks = async (cycles = 60) => {
  for (let i = 0; i < cycles; i++) await Promise.resolve()
}

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
        // Mirrors the string-handler branch of setTimeout enough for test typing.
        Function(callback)()
      }
    })

    return 0 as unknown as ReturnType<typeof setTimeout>
  }) as unknown as typeof setTimeout

  return vi.spyOn(globalThis, 'setTimeout').mockImplementation(immediateSetTimeout)
}

// Stub chart deps (chart.js crashes in happy-dom)
mockComponent('~/components/attachmentQuestionnaire/DoughnutChart.vue', () => ({
  template: '<div class="stub-doughnut" />',
}))
mockComponent('~/components/attachmentQuestionnaire/PolarChart.vue', () => ({
  template: '<div class="stub-polar" />',
}))

// Wizard store mock
// The page reads questionnaireWizardStore.result to build the API request.
// questionnaire-results-guard also checks isCompleted + result.
const mockWizardState = vi.hoisted(() => ({
  result: [{ id: 1, dimension: 'anxiety' as const, value: 3, tags: ['fearOfLoss'] }],
  isCompleted: true,
  reset: vi.fn(),
}))

vi.mock('~/stores/attachmentQuestionnaireWizard', () => ({
  useAttachmentQuestionnaireWizardStore: vi.fn(() => mockWizardState),
}))

// Mutable /api/attachment/results handler
// Defined as a vi.fn() so individual tests can control successive responses.
const mockApiHandler = vi.hoisted(() => vi.fn())

registerEndpoint('/api/attachment/results', {
  method: 'POST',
  handler: () => mockApiHandler(),
})

// Fixtures
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

const SUCCESS_RESPONSE: ComputeAttachmentResultsApiResponse = {
  results: MOCK_DISPLAY_RESULTS,
  sessionId: 'session-abc',
  persisted: true,
}

const FAIL_RESPONSE: ComputeAttachmentResultsApiResponse = {
  results: MOCK_DISPLAY_RESULTS,
  sessionId: null,
  persisted: false,
  persistErrorCode: 'unavailable',
}

describe('attachment-questionnaire/results (hot / first render)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockApiHandler.mockReset()
    mockWizardState.result = [{ id: 1, dimension: 'anxiety', value: 3, tags: ['fearOfLoss'] }]
    mockWizardState.isCompleted = true
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders results when persisted=true', async () => {
    mockApiHandler.mockResolvedValue(SUCCESS_RESPONSE)
    const wrapper = await mountSuspended(HotResultsPage)
    expect(wrapper.text()).toContain(MOCK_DISPLAY_RESULTS.completionDate)
  })

  it('shows no save warning when persisted=true', async () => {
    mockApiHandler.mockResolvedValue(SUCCESS_RESPONSE)
    const wrapper = await mountSuspended(HotResultsPage)
    expect(wrapper.text()).not.toContain('Sauvegarde en cours')
    expect(wrapper.text()).not.toContain("n'ont pas pu etre sauvegardes")
  })

  it('renders results even when persisted=false and sessionId is null', async () => {
    mockApiHandler.mockResolvedValue(FAIL_RESPONSE)
    const wrapper = await mountSuspended(HotResultsPage)
    expect(wrapper.text()).toContain(MOCK_DISPLAY_RESULTS.completionDate)
  })

  it('shows "Sauvegarde en cours" banner when persisted=false', async () => {
    mockApiHandler.mockResolvedValue(FAIL_RESPONSE)
    const wrapper = await mountSuspended(HotResultsPage)
    expect(wrapper.text()).toContain('Sauvegarde en cours')
  })

  it('removes save banner when a retry eventually succeeds', async () => {
    useImmediateTimeouts()
    mockApiHandler
      .mockResolvedValueOnce(FAIL_RESPONSE)
      .mockResolvedValue(SUCCESS_RESPONSE)

    const wrapper = await mountSuspended(HotResultsPage)
    expect(wrapper.text()).toContain('Sauvegarde en cours')

    await vi.waitFor(() => {
      expect(mockApiHandler.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
    await drainMicrotasks()
    await nextTick()

    await vi.waitFor(() => {
      expect(wrapper.text()).not.toContain('Sauvegarde en cours')
      expect(wrapper.text()).not.toContain("n'ont pas pu etre sauvegardes")
    })
  })

  it('shows persist error message when all retries have failed', async () => {
    useImmediateTimeouts()
    mockApiHandler.mockResolvedValue(FAIL_RESPONSE)

    const wrapper = await mountSuspended(HotResultsPage)

    await vi.waitFor(() => {
      expect(mockApiHandler).toHaveBeenCalledTimes(5)
    })
    await drainMicrotasks()
    await nextTick()

    expect(wrapper.text()).toContain("n'ont pas pu")
    expect(wrapper.text()).not.toContain('Sauvegarde en cours')
  })

  it('still displays results after all retries fail', async () => {
    useImmediateTimeouts()
    mockApiHandler.mockResolvedValue(FAIL_RESPONSE)

    const wrapper = await mountSuspended(HotResultsPage)

    await vi.waitFor(() => {
      expect(mockApiHandler).toHaveBeenCalledTimes(5)
    })
    await drainMicrotasks()
    await nextTick()

    expect(wrapper.text()).toContain(MOCK_DISPLAY_RESULTS.completionDate)
  })

  it('makes no API call when wizard result is empty', async () => {
    mockWizardState.result = []
    await mountSuspended(HotResultsPage)
    expect(mockApiHandler).not.toHaveBeenCalled()
  })

  it('shows no results when wizard result is empty', async () => {
    mockWizardState.result = []
    const wrapper = await mountSuspended(HotResultsPage)
    expect(wrapper.text()).not.toContain(MOCK_DISPLAY_RESULTS.completionDate)
  })
})
