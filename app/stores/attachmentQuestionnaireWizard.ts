import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { QuestionResult } from '~/types/attachmentQuestionnaireResults'

export type AttachmentQuestionnaireWizardStep =
  | 'introduction'
  | 'questionnaire'
  | 'results'

export const useAttachmentQuestionnaireWizardStore = defineStore(
  'attachmentQuestionnaireWizard',
  () => {
    const currentStep = ref<AttachmentQuestionnaireWizardStep>('introduction')
    const hasStarted = ref(false)
    const isCompleted = ref(false)

    const result = ref<QuestionResult[] | null>(null)

    const start = () => {
      hasStarted.value = true
      currentStep.value = 'questionnaire'
    }

    const goToIntroduction = () => {
      currentStep.value = 'introduction'
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
    }

    return {
      currentStep,
      hasStarted,
      isCompleted,
      result,
      start,
      goToIntroduction,
      complete,
      reset
    }
  }
)