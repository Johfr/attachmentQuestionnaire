/**
 * P1 - attachment-questionnaire/results page reset on leave
 *
 * Reproduces the SPA path:
 *  1. the user has just completed the questionnaire and is on /results
 *  2. they leave results through an allowed route (for example profile/home)
 *  3. they try to come back to /attachment-questionnaire/results via URL/history
 *
 * The page should reset the wizard on leave so the results guard blocks
 * re-entry until the questionnaire is completed again.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { AttachmentQuestionnaireDisplayResults } from '../../app/types/attachmentQuestionnaireResults'

const navigateToMock = vi.hoisted(() => vi.fn())
const capturedLeaveHook = vi.hoisted(() => ({
  hook: null as null | ((to: any, from?: any) => unknown),
}))

const mockWizardStore = vi.hoisted(() => {
  const store = {
    result: [{ id: 1, dimension: 'anxiety' as const, value: 3, tags: ['fearOfLoss'] }],
    isCompleted: true,
    reset: vi.fn(() => {
      store.result = null
      store.isCompleted = false
    }),
  }

  return store
})

const mockPersistState = vi.hoisted(() => {
  const results: AttachmentQuestionnaireDisplayResults = {
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

  return {
    computedResults: results,
    sessionId: 'session-hot',
    persisted: true,
    persistRetryFailed: false,
    computeError: null,
    load: vi.fn().mockResolvedValue(undefined),
  }
})

mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('onBeforeRouteLeave', () => (hook: typeof capturedLeaveHook.hook) => {
  capturedLeaveHook.hook = hook
})
mockNuxtImport('useAttachmentResultsPersistRetry', () => () => mockPersistState)

mockComponent('~/components/attachmentQuestionnaire/Results.vue', () => ({
  template: '<div class="results-stub">Results visible</div>',
}))

vi.mock('~/stores/attachmentQuestionnaireWizard', () => ({
  useAttachmentQuestionnaireWizardStore: vi.fn(() => mockWizardStore),
}))

import ResultsPage from '../../app/pages/attachment-questionnaire/results.vue'
import resultsGuard from '../../app/middleware/questionnaire-results-guard'

describe('attachment-questionnaire/results reset on leave', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    capturedLeaveHook.hook = null
    mockWizardStore.result = [{ id: 1, dimension: 'anxiety', value: 3, tags: ['fearOfLoss'] }]
    mockWizardStore.isCompleted = true
    mockWizardStore.reset.mockClear()
    mockPersistState.load.mockClear()
  })

  it('resets the wizard when leaving results through an allowed route, then blocks re-entry', async () => {
    await mountSuspended(ResultsPage)

    expect(mockPersistState.load).toHaveBeenCalledTimes(1)
    expect(capturedLeaveHook.hook).toBeTypeOf('function')

    const navigationResult = capturedLeaveHook.hook?.(
      { path: '/user/profil' } as any,
      { path: '/attachment-questionnaire/results' } as any,
    )

    expect(mockWizardStore.reset).toHaveBeenCalledTimes(1)
    expect(mockWizardStore.isCompleted).toBe(false)
    expect(mockWizardStore.result).toBeNull()
    expect(navigationResult).toBeUndefined()

    await resultsGuard({ path: '/attachment-questionnaire/results' } as any, { path: '/user/profil' } as any)

    expect(navigateToMock).toHaveBeenCalledWith('/')
  })
})
