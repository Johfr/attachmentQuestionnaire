import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'

import QuestionnairePage from '../../app/pages/attachment-questionnaire/questionnaire.vue'

const navigateToMock = vi.hoisted(() => vi.fn())

const mockWizardStore = vi.hoisted(() => ({
  hasStarted: true,
  reset: vi.fn(),
  complete: vi.fn(),
}))

mockNuxtImport('navigateTo', () => navigateToMock)

vi.mock('~/stores/attachmentQuestionnaireWizard', () => ({
  useAttachmentQuestionnaireWizardStore: vi.fn(() => mockWizardStore),
}))

mockComponent('~/components/attachmentQuestionnaire/Form.vue', () => ({
  props: ['isSubmitting'],
  emits: ['complete'],
  template: `
    <div>
      <button data-testid="mock-complete" @click="$emit('complete', [{ id: 1, dimension: 'anxiety', value: 3, tags: [] }])">
        complete
      </button>
      <span data-testid="mock-submitting">{{ isSubmitting ? 'pending' : 'idle' }}</span>
    </div>
  `,
}))

describe('questionnaire submit flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    navigateToMock.mockReset().mockResolvedValue(undefined)
    mockWizardStore.complete.mockReset()
    mockWizardStore.reset.mockReset()
    mockWizardStore.hasStarted = true
  })

  it('shows a loading state while questionnaire validation is in progress', async () => {
    let resolveNavigation = null as null | (() => void)
    navigateToMock.mockImplementation(() => new Promise<void>((resolve) => {
      resolveNavigation = resolve
    }))

    const wrapper = await mountSuspended(QuestionnairePage)

    await wrapper.get('[data-testid="mock-complete"]').trigger('click')

    expect(wrapper.get('[data-testid="mock-submitting"]').text()).toBe('pending')

    resolveNavigation?.()
  })

  it('shows an error message if the post-submit navigation fails', async () => {
    navigateToMock.mockRejectedValue(new Error('Navigation impossible'))

    const wrapper = await mountSuspended(QuestionnairePage)

    await wrapper.get('[data-testid="mock-complete"]').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="questionnaire-submit-error"]').text()).toContain('Navigation impossible')
    })
  })
})
