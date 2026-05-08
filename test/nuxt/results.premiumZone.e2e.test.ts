import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'

import ResultsComponent from '../../app/components/attachmentQuestionnaire/Results.vue'
import type { AttachmentQuestionnaireDisplayResults } from '../../app/types/attachmentQuestionnaireResults'

const mockBillingStore = vi.hoisted(() => ({
  hasPaidResults: false,
  hasPaidIa: false,
  hasPaidMembership: false,
  hasPaidFormation: false,
  checkUserPermissions: vi.fn().mockResolvedValue(undefined),
  goToCheckout: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('~/stores/billing', () => ({
  useBillingStore: vi.fn(() => mockBillingStore),
}))

const DISPLAY_RESULTS_FIXTURE: AttachmentQuestionnaireDisplayResults = {
  completionDate: '09/04/2026',
  anxietyAverageScore: 68,
  avoidanceAverageScore: 41,
  attachmentProfilesByDimension: {
    anxiety: 'anxiousActivated',
    avoidance: 'avoidantFlexible',
    globalStyle: 'anxious',
  },
  averageScores: [],
  anxietyDatasets: [
    {
      label: 'Anxiety',
      data: [68, 32],
      backgroundColor: ['#0369a1', '#e5e7eb'],
      hoverBackgroundColor: ['#0369a1', '#e5e7eb'],
      borderWidth: 0,
    },
  ],
  avoidanceDatasets: [
    {
      label: 'Avoidance',
      data: [41, 59],
      backgroundColor: ['#be123c', '#e5e7eb'],
      hoverBackgroundColor: ['#be123c', '#e5e7eb'],
      borderWidth: 0,
    },
  ],
  tagsResults: {
    anxiety: [
      {
        key: 'fearOfLoss',
        tag: 'fearOfLoss',
        label: 'Peur de perte',
        indicator: 'Besoin de reassurance',
        trigger: 'Peur de perdre le lien',
        regulationLevel: 'high',
        associatedBehaviors: 'cherche a rassurer\nsurveille les signes de distance',
        outputText: 'Tu peux vite te sentir active quand le lien devient flou.',
        advices: ['ralentir avant de reagir', 'revenir aux faits'],
      },
    ],
    avoidance: [
      {
        key: 'distanceSilence',
        tag: 'distanceSilence',
        label: 'Distance et silence',
        indicator: 'Besoin de recul',
        trigger: 'Trop de proximite ressentie',
        regulationLevel: 'medium',
        associatedBehaviors: 'prend de la distance\nretarde certaines conversations',
        outputText: 'Tu peux te proteger en prenant de l espace.',
        advices: ['nommer le besoin de recul', 'garder un minimum de lien'],
      },
      {
        key: 'controlNeed',
        tag: 'controlNeed',
        label: 'Besoin de controle',
        indicator: 'Maitrise emotionnelle',
        trigger: 'Sentiment d envahissement',
        regulationLevel: 'medium',
        associatedBehaviors: 'structure les echanges\ngarde la main sur le rythme',
        outputText: 'Tu peux chercher a reprendre la main quand ca deborde.',
        advices: ['observer le declencheur', 'negocier un rythme clair'],
      },
    ],
  },
  tagData: [
    { label: 'Peur de perte', value: 68, color: '#0369a1' },
    { label: 'Distance', value: 41, color: '#be123c' },
  ],
  triggersByDimension: { anxiety: [], avoidance: [] },
  regulationIndexByDimension: { anxiety: [], avoidance: [] },
  dimensionScores: { anxiety: [], avoidance: [] },
}

describe('results premium-zone browser regression', () => {
  beforeEach(() => {
    mockBillingStore.hasPaidResults = false
    mockBillingStore.hasPaidIa = false
    mockBillingStore.hasPaidMembership = false
    mockBillingStore.hasPaidFormation = false
    mockBillingStore.checkUserPermissions.mockClear()
    mockBillingStore.goToCheckout.mockClear()
  })

  it('keeps the page interactive after clicking the premium-zone CTA', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = await mountSuspended(ResultsComponent, {
      props: {
        docId: 'session-123',
        sessionBillingInfo: {
          hasPaidResults: false,
          hasPaidIa: false,
          hasPaidMembership: false,
          hasPaidFormation: false,
        },
        computedResults: DISPLAY_RESULTS_FIXTURE,
        tagsResults: DISPLAY_RESULTS_FIXTURE.tagsResults,
        tagData: DISPLAY_RESULTS_FIXTURE.tagData,
        anxietyAverageScore: DISPLAY_RESULTS_FIXTURE.anxietyAverageScore,
        avoidanceAverageScore: DISPLAY_RESULTS_FIXTURE.avoidanceAverageScore,
        anxietyDatasets: DISPLAY_RESULTS_FIXTURE.anxietyDatasets,
        avoidanceDatasets: DISPLAY_RESULTS_FIXTURE.avoidanceDatasets,
      },
    })

    const premiumButtons = wrapper.findAll('button').filter(node =>
      node.text().includes('Comprends en détail ce qui se passe sur cet axe')
      || node.text().includes('Voir quoi faire maintenant')
    )

    expect(premiumButtons.length).toBeGreaterThan(0)
    await premiumButtons[0].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Aller plus loin')

    const firstToggle = wrapper.findAll('span').find(node => node.text().includes('Lire la suite...'))
    expect(firstToggle).toBeTruthy()

    await firstToggle!.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Réduire...')
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Canvas is already in use'))
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('is not a registered controller'))
  })

  it('keeps trigger cards and inner read-more toggles interactive', async () => {
    const wrapper = await mountSuspended(ResultsComponent, {
      props: {
        docId: 'session-123',
        sessionBillingInfo: {
          hasPaidResults: true,
          hasPaidIa: false,
          hasPaidMembership: false,
          hasPaidFormation: false,
        },
        computedResults: DISPLAY_RESULTS_FIXTURE,
        tagsResults: DISPLAY_RESULTS_FIXTURE.tagsResults,
        tagData: DISPLAY_RESULTS_FIXTURE.tagData,
        anxietyAverageScore: DISPLAY_RESULTS_FIXTURE.anxietyAverageScore,
        avoidanceAverageScore: DISPLAY_RESULTS_FIXTURE.avoidanceAverageScore,
        anxietyDatasets: DISPLAY_RESULTS_FIXTURE.anxietyDatasets,
        avoidanceDatasets: DISPLAY_RESULTS_FIXTURE.avoidanceDatasets,
      },
    })

    const triggerCard = wrapper.find('[data-testid="trigger-card-fearOfLoss"]')
    expect(triggerCard.exists()).toBe(true)
    expect(triggerCard.classes()).not.toContain('max-h-full')

    const triggerToggle = wrapper.findAll('[title="Deplier"]').find(node =>
      node.text().includes('fearOfLoss')
    )

    expect(triggerToggle).toBeTruthy()
    await triggerToggle!.trigger('click')
    await nextTick()

    expect(triggerCard.classes()).toContain('max-h-full')

    const expandedTriggerToggle = wrapper.findAll('[title="Réduire"]').find(node =>
      node.text().includes('fearOfLoss')
    )
    expect(expandedTriggerToggle).toBeTruthy()

    const triggerBehaviorsToggle = wrapper.find('[data-testid="trigger-behaviors-toggle-fearOfLoss"]')
    expect(triggerBehaviorsToggle.exists()).toBe(false)
    expect(wrapper.text()).toContain('Les erreurs que tu as probablement déjà faites :')
    expect(wrapper.text()).toContain('Quoi faire maintenant ?')
    expect(wrapper.text()).toContain('cherche a rassurer')
    expect(wrapper.text()).toContain('ralentir avant de reagir')

    await expandedTriggerToggle!.trigger('click')
    await nextTick()

    const collapsedTriggerToggle = wrapper.findAll('[title="Deplier"]').find(node =>
      node.text().includes('fearOfLoss')
    )
    expect(collapsedTriggerToggle).toBeTruthy()
    expect(triggerCard.classes()).not.toContain('max-h-full')
  })
})
