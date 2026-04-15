import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import GoDeeper from '../../app/components/GoDeeper.vue'

const mockBillingStore = vi.hoisted(() => ({
  goToCheckout: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('~/stores/billing', () => ({
  useBillingStore: vi.fn(() => mockBillingStore),
}))

const mountGoDeeper = async (overrides: Record<string, boolean | string> = {}) => {
  return mountSuspended(GoDeeper, {
    props: {
      docId: 'session-123',
      hasBasicAccess: false,
      hasResultsAccess: false,
      hasIaAccess: false,
      hasMembershipAccess: false,
      hasFormationAccess: false,
      hasUsedIa: false,
      ...overrides,
    },
  })
}

describe('GoDeeper access states', () => {
  beforeEach(() => {
    mockBillingStore.goToCheckout.mockClear()
  })

  it('shows only the results offer for a limited user while IA is paused', async () => {
    const wrapper = await mountGoDeeper()

    expect(wrapper.find('[data-testid="go-deeper-results-offer"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="go-deeper-ia-offer"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="go-deeper-ia-includes-results"]').exists()).toBe(false)
  })

  it('hides both purchase blocks after a one-shot results purchase while IA is paused', async () => {
    const wrapper = await mountGoDeeper({
      hasBasicAccess: true,
      hasResultsAccess: true,
    })

    expect(wrapper.find('[data-testid="go-deeper-results-offer"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="go-deeper-ia-offer"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="go-deeper-ia-includes-results"]').exists()).toBe(false)
  })

  it('hides both purchase blocks once IA has already been used for the session', async () => {
    const wrapper = await mountGoDeeper({
      hasBasicAccess: true,
      hasIaAccess: true,
      hasUsedIa: true,
    })

    expect(wrapper.find('[data-testid="go-deeper-results-offer"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="go-deeper-ia-offer"]').exists()).toBe(false)
  })

  it.each([
    { label: 'membership', props: { hasBasicAccess: true, hasMembershipAccess: true } },
    { label: 'formation', props: { hasBasicAccess: true, hasFormationAccess: true } },
  ])('keeps purchase blocks hidden for an active $label access while IA is paused', async ({ props }) => {
    const wrapper = await mountGoDeeper(props)

    expect(wrapper.find('[data-testid="go-deeper-results-offer"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="go-deeper-ia-offer"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="go-deeper-ia-includes-results"]').exists()).toBe(false)
  })

  it('blocks results checkout while the hot-results session is still being saved', async () => {
    const wrapper = await mountGoDeeper({
      docId: '',
    })

    await wrapper.findAll('button').find(node => node.text().includes('Debloquer !'))!.trigger('click')

    expect(wrapper.text()).toContain('La session est encore en cours de sauvegarde')

    const checkoutButton = wrapper.findAll('button').find(node => node.text().includes('Debloquer mes resultats'))
    expect(checkoutButton).toBeTruthy()
    expect(checkoutButton!.attributes('disabled')).toBeDefined()

    await checkoutButton!.trigger('click')
    expect(mockBillingStore.goToCheckout).not.toHaveBeenCalled()
  })
})
