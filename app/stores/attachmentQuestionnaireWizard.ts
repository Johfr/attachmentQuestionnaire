import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { QuestionResult } from '~/types/attachmentQuestionnaireResults'

export type AttachmentQuestionnaireWizardStep =
  | 'introduction'
  | 'questionnaire'
  | 'results'

export type PartnerShareSource = {
  uid: string
  questionnaireSessionId: string
}

export const useAttachmentQuestionnaireWizardStore = defineStore(
  'attachmentQuestionnaireWizard',
  () => {
    const currentStep = ref<AttachmentQuestionnaireWizardStep>('introduction')
    const hasStarted = ref(false)
    const isCompleted = ref(false)

    const result = ref<QuestionResult[] | null>(null)
    const partnerShareSource = ref<PartnerShareSource | null>(null)

    const start = () => {
      hasStarted.value = true
      currentStep.value = 'questionnaire'
    }

    const goToIntroduction = () => {
      currentStep.value = 'introduction'
    }

    const setPartnerShareSource = (payload: PartnerShareSource | null) => {
      partnerShareSource.value = payload
    }

    const clearPartnerShareSource = () => {
      partnerShareSource.value = null
    }

    const complete = (payload: QuestionResult[]) => {
      result.value = payload
      isCompleted.value = true
      currentStep.value = 'results'
    }

    const reset = () => {
      currentStep.value = 'introduction'
      hasStarted.value = false
      isCompleted.value = false
      result.value = null
      partnerShareSource.value = null
    }

    return {
      currentStep,
      hasStarted,
      isCompleted,
      result,
      partnerShareSource,
      start,
      goToIntroduction,
      setPartnerShareSource,
      clearPartnerShareSource,
      complete,
      reset
    }
  }
)
