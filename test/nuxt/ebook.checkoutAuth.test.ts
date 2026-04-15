import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import EbookPage from '../../app/pages/ebook.vue'

const mockBillingStore = vi.hoisted(() => ({
  goToCheckout: vi.fn().mockResolvedValue(undefined),
}))

const mockAuthStore = vi.hoisted(() => ({
  user: null as null | { id: string },
  openLoginModal: vi.fn(),
}))

vi.mock('~/stores/billing', () => ({
  useBillingStore: vi.fn(() => mockBillingStore),
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

describe('ebook checkout auth guard', () => {
  beforeEach(() => {
    mockBillingStore.goToCheckout.mockClear()
    mockAuthStore.openLoginModal.mockClear()
    mockAuthStore.user = null
  })

  it('opens the login modal instead of creating a checkout session when the user is not logged in', async () => {
    const wrapper = await mountSuspended(EbookPage)

    await wrapper.get('[data-testid="ebook-checkout-button"]').trigger('click')

    expect(mockAuthStore.openLoginModal).toHaveBeenCalledOnce()
    expect(mockBillingStore.goToCheckout).not.toHaveBeenCalled()
  })
})
