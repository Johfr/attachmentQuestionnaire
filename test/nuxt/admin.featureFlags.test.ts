import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'

import AdminPage from '../../app/pages/admin.vue'

const mockAuthStore = vi.hoisted(() => ({
  isAdmin: true,
}))

const mockBillingStore = vi.hoisted(() => ({
  goToCheckout: vi.fn().mockResolvedValue(undefined),
}))

const mockSiteConfigStore = vi.hoisted(() => ({
  isLoading: false,
  isSaving: false,
  isResultsPaywallEnabled: true,
  isResultsSharingEnabled: false,
  loadConfig: vi.fn().mockResolvedValue(undefined),
  updateConfig: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

vi.mock('~/stores/billing', () => ({
  useBillingStore: vi.fn(() => mockBillingStore),
}))

vi.mock('~/stores/siteConfig', () => ({
  useSiteConfigStore: vi.fn(() => mockSiteConfigStore),
}))

mockComponent('~/components/designSystem/PageSectionHeading.vue', () => ({
  props: ['title'],
  template: '<div>{{ title }}</div>',
}))

mockComponent('~/components/EuromillionsStatsModel.vue', () => ({
  template: '<div />',
}))

describe('admin feature flags', () => {
  beforeEach(() => {
    mockBillingStore.goToCheckout.mockClear()
    mockSiteConfigStore.isLoading = false
    mockSiteConfigStore.isSaving = false
    mockSiteConfigStore.isResultsPaywallEnabled = true
    mockSiteConfigStore.isResultsSharingEnabled = false
    mockSiteConfigStore.loadConfig.mockClear().mockResolvedValue(undefined)
    mockSiteConfigStore.updateConfig.mockClear().mockResolvedValue(undefined)
  })

  it('shows the results paywall flag and toggles it through the config store', async () => {
    const wrapper = await mountSuspended(AdminPage)

    expect(mockSiteConfigStore.loadConfig).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Blocage premium des resultats')
    expect(wrapper.text()).toContain('active')

    const toggleButton = wrapper.findAll('button').find(node =>
      node.text().includes('Desactiver le blocage premium'),
    )

    expect(toggleButton).toBeTruthy()
    await toggleButton!.trigger('click')

    expect(mockSiteConfigStore.updateConfig).toHaveBeenCalledWith({
      features: {
        resultsPaywallEnabled: false,
      },
    })
  })

  it('shows the results sharing flag and toggles it through the config store', async () => {
    const wrapper = await mountSuspended(AdminPage)

    expect(wrapper.text()).toContain('Feature flags')

    const toggleButton = wrapper.findAll('button').find(node =>
      node.text().includes('Activer le partage'),
    )

    expect(toggleButton).toBeTruthy()
    await toggleButton!.trigger('click')

    expect(mockSiteConfigStore.updateConfig).toHaveBeenCalledWith({
      features: {
        resultsSharingEnabled: true,
      },
    })
  })
})
