/**
 * P1 - non-blocking async fallbacks for billing/profile reads
 *
 * Goal:
 *  - billing permission lookup failures must not block already-computed results
 *  - profile history loading failures must not crash the page with uncaught errors
 *
 * We mock Firestore getDocs() to reject, while keeping the real billing and
 * questionnaireSessions stores. The pages/components should still mount and
 * keep their primary UI shell visible.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'

import type { AttachmentQuestionnaireDisplayResults } from '../../app/types/attachmentQuestionnaireResults'

const authState = vi.hoisted(() => ({
  isLoggedIn: true,
  user: {
    id: 'user-123',
    name: 'Johan',
    age: 34,
  },
  openLoginModal: vi.fn(),
  logout: vi.fn().mockResolvedValue({ success: true }),
}))

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(() => 'collection-ref'),
  query: vi.fn(() => 'query-ref'),
  where: vi.fn(() => 'where-ref'),
  getDocs: vi.fn(),
}))

const mockSiteConfigStore = vi.hoisted(() => ({
  isResultsPaywallEnabled: true,
  loadConfig: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => authState),
}))

vi.mock('~/stores/siteConfig', () => ({
  useSiteConfigStore: vi.fn(() => mockSiteConfigStore),
}))

vi.mock('firebase/firestore', () => ({
  collection: firestoreMocks.collection,
  query: firestoreMocks.query,
  where: firestoreMocks.where,
  getDocs: firestoreMocks.getDocs,
}))

vi.mock('~/composables/firebase/useFirebaseClient.js', () => ({
  firebaseClient: {
    db: {},
    app: {},
    getFunctions: vi.fn(),
    httpsCallable: vi.fn(),
  },
}))

mockComponent('~/components/attachmentQuestionnaire/DoughnutChart.vue', () => ({
  template: '<div class="stub-doughnut" />',
}))
mockComponent('~/components/attachmentQuestionnaire/PolarChart.vue', () => ({
  template: '<div class="stub-polar" />',
}))
mockComponent('~/components/designSystem/Accordeon.vue', () => ({
  props: ['title'],
  template: '<div class="stub-accordeon"><slot /></div>',
}))
mockComponent('~/components/designSystem/Popin.vue', () => ({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="stub-popin"><slot /></div>',
}))
mockComponent('~/components/designSystem/UserProgress.vue', () => ({
  template: '<div class="progress-stub">Progress stub</div>',
}))

import ResultsComponent from '../../app/components/attachmentQuestionnaire/Results.vue'
import ProfilePage from '../../app/pages/user/profil.vue'

const DISPLAY_RESULTS_FIXTURE: AttachmentQuestionnaireDisplayResults = {
  completionDate: '07/04/2026',
  anxietyAverageScore: 65,
  avoidanceAverageScore: 40,
  attachmentProfilesByDimension: {
    anxiety: 'anxiousActivated',
    avoidance: 'avoidantFlexible',
    globalStyle: 'anxious',
  },
  averageScores: [],
  tagsResults: {
    anxiety: [],
    avoidance: [],
  },
  tagData: [],
  anxietyDatasets: [],
  avoidanceDatasets: [],
  triggersByDimension: {
    anxiety: [],
    avoidance: [],
  },
  regulationIndexByDimension: {
    anxiety: [],
    avoidance: [],
  },
  dimensionScores: {
    anxiety: [],
    avoidance: [],
  },
}

describe('async fallback regressions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    authState.isLoggedIn = true
    authState.user = {
      id: 'user-123',
      name: 'Johan',
      age: 34,
    }
    firestoreMocks.collection.mockReset().mockReturnValue('collection-ref')
    firestoreMocks.query.mockReset().mockReturnValue('query-ref')
    firestoreMocks.where.mockReset().mockReturnValue('where-ref')
    firestoreMocks.getDocs.mockReset().mockRejectedValue(new Error('Firestore unavailable'))
    mockSiteConfigStore.isResultsPaywallEnabled = true
    mockSiteConfigStore.loadConfig.mockClear().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('still renders already-computed questionnaire results when billing permission lookup fails', async () => {
    const wrapper = await mountSuspended(ResultsComponent, {
      props: {
        docId: 'session-abc',
        computedResults: DISPLAY_RESULTS_FIXTURE,
        tagsResults: DISPLAY_RESULTS_FIXTURE.tagsResults,
        tagData: DISPLAY_RESULTS_FIXTURE.tagData,
        anxietyAverageScore: DISPLAY_RESULTS_FIXTURE.anxietyAverageScore,
        avoidanceAverageScore: DISPLAY_RESULTS_FIXTURE.avoidanceAverageScore,
        anxietyDatasets: DISPLAY_RESULTS_FIXTURE.anxietyDatasets,
        avoidanceDatasets: DISPLAY_RESULTS_FIXTURE.avoidanceDatasets,
        sessionBillingInfo: {
          hasPaidResults: false,
          hasPaidIa: false,
          hasPaidMembership: false,
          hasPaidFormation: false,
        },
      },
    })

    expect(firestoreMocks.getDocs).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Tes profils d\'attachement')
    expect(wrapper.text()).toContain(DISPLAY_RESULTS_FIXTURE.completionDate)
  })

  it('keeps the profile page visible and avoids uncaught console errors when sessions and billing reads fail', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = await mountSuspended(ProfilePage)

    await vi.waitFor(() => {
      expect(firestoreMocks.getDocs).toHaveBeenCalled()
    })

    expect(wrapper.text()).toContain('Bienvenue,')
    expect(wrapper.text()).toContain('Historique de mes résultats')
    expect(wrapper.text()).toContain('Gérer mon abonnement')
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
