/**
 * P0 — Wizard access control
 *
 * Pure unit tests for attachmentQuestionnaireWizard store.
 * No Firebase or Nuxt deps — runs in node environment with isolated Pinia.
 *
 * Covers:
 *  - State machine transitions (start, complete, goToIntroduction, reset)
 *  - Prerequisites read by questionnaire-results-guard:
 *      !isCompleted || !result  ->  redirect expected
 *  - Prerequisites read by the questionnaire page:
 *      !hasStarted  ->  redirect expected
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAttachmentQuestionnaireWizardStore } from '../../app/stores/attachmentQuestionnaireWizard'
import type { QuestionResult } from '../../app/types/attachmentQuestionnaireResults'

const MOCK_RESULT: QuestionResult[] = [
  { id: 1, dimension: 'anxiety', value: 3, tags: ['fearOfLoss'] },
  { id: 2, dimension: 'avoidance', value: 2, tags: ['proximityDiscomfort'] },
]

describe('useAttachmentQuestionnaireWizardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('currentStep is "introduction"', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      expect(store.currentStep).toBe('introduction')
    })

    it('hasStarted is false', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      expect(store.hasStarted).toBe(false)
    })

    it('isCompleted is false', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      expect(store.isCompleted).toBe(false)
    })

    it('result is null', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      expect(store.result).toBeNull()
    })

    it('partnerShareSource is null', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      expect(store.partnerShareSource).toBeNull()
    })
  })

  // ── start() ───────────────────────────────────────────────────────────────

  describe('start()', () => {
    it('sets currentStep to "questionnaire"', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      expect(store.currentStep).toBe('questionnaire')
    })

    it('sets hasStarted to true', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      expect(store.hasStarted).toBe(true)
    })

    it('does not set isCompleted', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      expect(store.isCompleted).toBe(false)
    })

    it('does not store a result', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      expect(store.result).toBeNull()
    })
  })

  // ── complete() ───────────────────────────────────────────────────────────

  describe('complete()', () => {
    it('stores the result payload', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      store.complete(MOCK_RESULT)
      expect(store.result).toEqual(MOCK_RESULT)
    })

    it('sets isCompleted to true', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      store.complete(MOCK_RESULT)
      expect(store.isCompleted).toBe(true)
    })

    it('sets currentStep to "results"', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      store.complete(MOCK_RESULT)
      expect(store.currentStep).toBe('results')
    })
  })

  // ── goToIntroduction() ───────────────────────────────────────────────────

  describe('goToIntroduction()', () => {
    it('returns currentStep to "introduction" from "questionnaire"', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      store.goToIntroduction()
      expect(store.currentStep).toBe('introduction')
    })
  })

  describe('partnerShareSource helpers', () => {
    it('stores the invitation source when provided from the introduction link', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.setPartnerShareSource({
        uid: 'user-1',
        questionnaireSessionId: 'session-1',
      })

      expect(store.partnerShareSource).toEqual({
        uid: 'user-1',
        questionnaireSessionId: 'session-1',
      })
    })

    it('clears the invitation source explicitly', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.setPartnerShareSource({
        uid: 'user-1',
        questionnaireSessionId: 'session-1',
      })

      store.clearPartnerShareSource()

      expect(store.partnerShareSource).toBeNull()
    })
  })

  // ── reset() ───────────────────────────────────────────────────────────────

  describe('reset()', () => {
    it('fully restores initial state after complete()', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      store.complete(MOCK_RESULT)
      store.reset()
      expect(store.currentStep).toBe('introduction')
      expect(store.hasStarted).toBe(false)
      expect(store.isCompleted).toBe(false)
      expect(store.result).toBeNull()
      expect(store.partnerShareSource).toBeNull()
    })

    it('fully restores initial state after start()', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      store.reset()
      expect(store.hasStarted).toBe(false)
      expect(store.currentStep).toBe('introduction')
    })
  })

  // ── Questionnaire page access (hasStarted prerequisite) ──────────────────
  // questionnaire.vue: if (!hasStarted) navigateTo('/attachment-questionnaire/introduction')

  describe('questionnaire page access prerequisite (hasStarted)', () => {
    it('access blocked initially — page must redirect to intro', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      expect(store.hasStarted).toBe(false)
    })

    it('access granted after start()', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      expect(store.hasStarted).toBe(true)
    })

    it('access revoked again after reset()', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      store.reset()
      expect(store.hasStarted).toBe(false)
    })
  })

  // ── questionnaire-results-guard prerequisites ─────────────────────────────
  // Guard: if (!isCompleted || !result) navigateTo('/')

  describe('results guard prerequisite (!isCompleted || !result)', () => {
    it('guard blocks on initial state', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      expect(!store.isCompleted || !store.result).toBe(true)
    })

    it('guard blocks after start() but before complete()', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      expect(!store.isCompleted || !store.result).toBe(true)
    })

    it('guard passes only after complete()', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      store.complete(MOCK_RESULT)
      expect(!store.isCompleted || !store.result).toBe(false)
    })

    it('guard blocks again after reset()', () => {
      const store = useAttachmentQuestionnaireWizardStore()
      store.start()
      store.complete(MOCK_RESULT)
      store.reset()
      expect(!store.isCompleted || !store.result).toBe(true)
    })
  })
})
