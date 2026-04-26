import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockComponent, registerEndpoint } from '@nuxt/test-utils/runtime'

import ProfilePage from '../../app/pages/user/profil.vue'
import type { QuestionnaireSession } from '../../app/types/questionnaireSessions'

const mockAuthStore = vi.hoisted(() => ({
  isLoggedIn: true,
  user: {
    id: 'user-1',
    name: 'Johan',
    age: 39,
    email: 'prenom@example.com',
    gender: 'male',
  },
  logout: vi.fn().mockResolvedValue({ success: true }),
  openLoginModal: vi.fn(),
}))

const mockBillingStore = vi.hoisted(() => ({
  subscriptions: [],
  payments: [],
  isLoadingHistory: false,
  loadPurchaseHistory: vi.fn().mockResolvedValue(undefined),
  openCustomerPortal: vi.fn().mockResolvedValue(undefined),
  goToCheckout: vi.fn().mockResolvedValue(undefined),
}))

const mockContactRequestsStore = vi.hoisted(() => ({
  sortedRequests: [],
  isLoading: false,
  loadRequests: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
}))

const mockSessionsState = vi.hoisted(() => ({
  sessions: [] as QuestionnaireSession[],
  isLoading: false,
  loadSessions: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
}))

const mockSiteConfigStore = vi.hoisted(() => ({
  isResultsSharingEnabled: true,
  isSaving: false,
  loadConfig: vi.fn().mockResolvedValue(undefined),
  updateConfig: vi.fn().mockResolvedValue(undefined),
}))

const mockFirebaseClient = vi.hoisted(() => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('token-123'),
    },
  },
  onAuthStateChanged: vi.fn((_auth: unknown, onSuccess: (user: unknown) => void) => {
    onSuccess(mockFirebaseClient.auth.currentUser)
    return vi.fn()
  }),
}))

const pendingRequestsState = vi.hoisted(() => ({
  requests: [] as Array<Record<string, unknown>>,
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

vi.mock('~/stores/billing', () => ({
  useBillingStore: vi.fn(() => mockBillingStore),
}))

vi.mock('~/stores/contactRequests', () => ({
  useContactRequestsStore: vi.fn(() => mockContactRequestsStore),
}))

vi.mock('~/stores/questionnaireSessions', async () => {
  const { reactive } = await import('vue')
  const state = reactive(mockSessionsState)

  return {
    useQuestionnaireSessionsStore: vi.fn(() => ({
      get sortedSessions() {
        return state.sessions
      },
      get isLoading() {
        return state.isLoading
      },
      loadSessions: state.loadSessions,
      reset: state.reset,
    })),
  }
})

vi.mock('~/stores/siteConfig', () => ({
  useSiteConfigStore: vi.fn(() => mockSiteConfigStore),
}))

vi.mock('~/composables/firebase/useFirebaseClient.js', () => ({
  firebaseClient: mockFirebaseClient,
}))

mockComponent('~/components/designSystem/UserProgress.vue', () => ({
  template: '<div class="user-progress-stub" />',
}))

mockComponent('~/components/designSystem/PageSectionHeading.vue', () => ({
  props: ['title', 'highlight'],
  template: '<div>{{ title }} {{ highlight }}</div>',
}))

mockComponent('~/components/designSystem/Popin.vue', () => ({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue"><slot /></div>',
}))

registerEndpoint('/api/attachment/partner-share/pending', {
  method: 'GET',
  handler: () => pendingRequestsState.requests,
})

registerEndpoint('/api/attachment/partner-share', {
  method: 'POST',
  handler: async () => ({ ok: true, partnerExists: false, status: 'invite_sent' }),
})

const makeSession = (overrides: Partial<QuestionnaireSession> = {}): QuestionnaireSession => ({
  id: 'session-1',
  uid: 'user-1',
  questionnaireType: 'attachment',
  questionnaireVersion: 'v1',
  status: 'completed',
  scoringVersion: '1',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  updatedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  completedAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  relationContext: {
    partnerFirstName: null,
    partnerAge: null,
    partnerGender: null,
  },
  answers: [],
  result: {
    anxietyScore: 53,
    avoidanceScore: 43,
    globalProfile: 'mixedProfile',
    anxietySubProfile: 'anxiousActivated',
    avoidanceSubProfile: 'avoidantFlexible',
    triggers: {},
  },
  billingInfo: {
    hasPaidResults: false,
    hasPaidIa: false,
    hasPaidMembership: false,
    hasPaidFormation: false,
  },
  persist: {
    status: 'persisted',
    retryCount: 0,
    lastAttemptAt: null,
    lastErrorCode: null,
  },
  ...overrides,
})

describe('profile partner sharing flow', () => {
  beforeEach(() => {
    pendingRequestsState.requests = []
    mockSessionsState.sessions = [makeSession()]
    mockSessionsState.loadSessions.mockClear().mockResolvedValue(undefined)
    mockBillingStore.loadPurchaseHistory.mockClear().mockResolvedValue(undefined)
    mockBillingStore.goToCheckout.mockClear().mockResolvedValue(undefined)
    mockContactRequestsStore.loadRequests.mockClear().mockResolvedValue(undefined)
    mockSiteConfigStore.isResultsSharingEnabled = true
    mockSiteConfigStore.loadConfig.mockClear().mockResolvedValue(undefined)
  })

  it('opens the paywall popin when the user has not unlocked the results yet', async () => {
    const wrapper = await mountSuspended(ProfilePage)

    await wrapper.findAll('button').find(node => /Invite (ton|ta) partenaire/.test(node.text()))!.trigger('click')

    expect(wrapper.text()).toContain("Débloque tes résultats")
    expect(wrapper.text()).toContain("Tu dois d'abord débloquer tes résultats avant de pouvoir faire ta demande.")
    expect(wrapper.text()).toContain("Débloquer mes résultats pour 1,99 €")
  })

  it('opens the share popin and requires a valid email when the results are unlocked', async () => {
    mockSessionsState.sessions = [makeSession({
      billingInfo: {
        hasPaidResults: true,
        hasPaidIa: false,
        hasPaidMembership: false,
        hasPaidFormation: false,
      },
    })]

    const wrapper = await mountSuspended(ProfilePage)

    await wrapper.findAll('button').find(node => /Invite (ton|ta) partenaire/.test(node.text()))!.trigger('click')

    const submitButton = wrapper.get('[data-testid="partner-share-submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()

    const emailInput = wrapper.get('[data-testid="partner-share-email-input"]')
    await emailInput.setValue('not-an-email')
    expect(submitButton.attributes('disabled')).toBeDefined()

    await emailInput.setValue('partner@example.com')
    expect(submitButton.attributes('disabled')).toBeUndefined()
  })

  it('replaces the sharing CTA with a sent state after a successful share request', async () => {
    mockSessionsState.sessions = [makeSession({
      billingInfo: {
        hasPaidResults: true,
        hasPaidIa: false,
        hasPaidMembership: false,
        hasPaidFormation: false,
      },
    })]

    const wrapper = await mountSuspended(ProfilePage)

    await wrapper.findAll('button').find(node => /Invite (ton|ta) partenaire/.test(node.text()))!.trigger('click')

    const emailInput = wrapper.get('[data-testid="partner-share-email-input"]')
    await emailInput.setValue('partner@example.com')
    await wrapper.get('[data-testid="partner-share-submit"]').trigger('click')

    wrapper.unmount()

    mockSessionsState.sessions = [makeSession({
      billingInfo: {
        hasPaidResults: true,
        hasPaidIa: false,
        hasPaidMembership: false,
        hasPaidFormation: false,
      },
      relationContext: {
        partnerFirstName: null,
        partnerAge: null,
        partnerGender: null,
        partnerEmail: 'partner@example.com',
        partnerInviteSentAt: { seconds: 1714300000, nanoseconds: 0 } as any,
        partnerShareStatus: 'invite_sent',
      },
    })]

    const reloadedWrapper = await mountSuspended(ProfilePage)
    expect(reloadedWrapper.text()).toContain('Demande envoyée le')
  })

  it('renders incoming share requests with the session selector', async () => {
    pendingRequestsState.requests = [{
      sourceSessionId: 'source-session-1',
      senderUid: 'user-2',
      senderName: 'Camille',
      senderEmail: 'partner@example.com',
      requestedAt: { seconds: 1714300000, nanoseconds: 0 },
      sourceCompletedAt: { seconds: 1714300000, nanoseconds: 0 },
      sourceGlobalProfile: 'mixedProfile',
      sourceAnxietyScore: 53,
      sourceAvoidanceScore: 43,
    }]

    const wrapper = await mountSuspended(ProfilePage)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Demandes de partage reçues')
      expect(wrapper.text()).toContain('Camille souhaite partager ses résultats')
      expect(wrapper.text()).toContain('Sélectionne la session à lier')
      expect(wrapper.text()).toContain('Valider la demande')
    })
  })

  it('hides partner sharing UI when the feature flag is disabled', async () => {
    mockSiteConfigStore.isResultsSharingEnabled = false
    pendingRequestsState.requests = [{
      sourceSessionId: 'source-session-1',
      senderUid: 'user-2',
      senderName: 'Camille',
      senderEmail: 'partner@example.com',
      requestedAt: { seconds: 1714300000, nanoseconds: 0 },
      sourceCompletedAt: { seconds: 1714300000, nanoseconds: 0 },
      sourceGlobalProfile: 'mixedProfile',
      sourceAnxietyScore: 53,
      sourceAvoidanceScore: 43,
    }]

    const wrapper = await mountSuspended(ProfilePage)

    expect(wrapper.text()).not.toContain('Demandes de partage re?ues')
    expect(wrapper.text()).not.toMatch(/Invite (ton|ta) partenaire/)
    expect(wrapper.find('[data-testid="partner-share-email-input"]').exists()).toBe(false)
  })
})
