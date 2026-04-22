import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'

import ContactPage from '../../app/pages/contact.vue'

const mockBillingStore = vi.hoisted(() => ({
  goToCheckout: vi.fn().mockResolvedValue(undefined),
}))

const mockAuthStore = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    email: 'john@example.com',
    phone: null as string | null,
  },
  authenticateForQuestionnaire: vi.fn(),
  saveUserPhoneNumber: vi.fn().mockResolvedValue(true),
}))

vi.mock('~/stores/billing', () => ({
  useBillingStore: vi.fn(() => mockBillingStore),
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

mockComponent('~/components/designSystem/Popin.vue', () => ({
  props: ['modelValue'],
  template: '<div v-if="modelValue"><slot /></div>',
}))

mockComponent('~/components/designSystem/PageSectionHeading.vue', () => ({
  props: ['title'],
  template: '<div>{{ title }}</div>',
}))

describe('contact checkout flow', () => {
  beforeEach(() => {
    mockBillingStore.goToCheckout.mockClear()
    mockAuthStore.authenticateForQuestionnaire.mockClear()
    mockAuthStore.saveUserPhoneNumber.mockClear()
    mockAuthStore.user = {
      id: 'user-1',
      email: 'john@example.com',
      phone: null,
    }
  })

  it('keeps checkout disabled when the phone number is invalid', async () => {
    const wrapper = await mountSuspended(ContactPage)

    await wrapper.findAll('button').find(node => node.text().includes('Je réserve ma séance'))!.trigger('click')

    const phoneInput = wrapper.get('[data-testid="contact-phone-input"]')
    await phoneInput.setValue('1')

    const checkoutButton = wrapper.get('[data-testid="contact-checkout-button"]')
    expect(checkoutButton.attributes('disabled')).toBeDefined()
  })

  it('allows checkout with a valid french phone number', async () => {
    const wrapper = await mountSuspended(ContactPage)

    await wrapper.findAll('button').find(node => node.text().includes('Je réserve ma séance'))!.trigger('click')

    const phoneInput = wrapper.get('[data-testid="contact-phone-input"]')
    await phoneInput.setValue('06 12 34 56 78')

    const checkoutButton = wrapper.get('[data-testid="contact-checkout-button"]')
    expect(checkoutButton.attributes('disabled')).toBeUndefined()

    await checkoutButton.trigger('click')

    expect(mockAuthStore.saveUserPhoneNumber).toHaveBeenCalledWith('0612345678')
    expect(mockBillingStore.goToCheckout).toHaveBeenCalledWith(
      'coaching',
      'zen',
      'coachingZen',
      'v1',
      'contact',
      'coaching-zen-v1',
      {
        email: 'john@example.com',
        phone: '0612345678',
        checkoutOrigin: 'contact',
      },
    )
  })
})
