import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AttachmentQuestionnaireResults, QuestionResult } from '~/types/attachmentQuestionnaireResults'
// import personalResults from '~/assets/data/resultsTest.json'

export type AttachmentQuestionnaireStep =
  | 'introduction'
  | 'questionnaire'
  | 'results'

export const useAttachmentQuestionnaireStore = defineStore(
  'attachmentQuestionnaire',
  () => {
    const currentStep = ref<AttachmentQuestionnaireStep>('introduction')
    const hasStarted = ref(false)
    const isCompleted = ref(false)
    // const currentStep = ref<AttachmentQuestionnaireStep>('results')
    // const hasStarted = ref(true)
    // const isCompleted = ref(true)

    const answers = ref<Record<string, string | number | boolean>>({})
    const result = ref<QuestionResult[] | null>(null)
    // const result = ref<QuestionResult[] | null>(personalResults as unknown as QuestionResult[])

    const isIntroductionStep = computed(() => currentStep.value === 'introduction')
    const isQuestionnaireStep = computed(() => currentStep.value === 'questionnaire')
    const isResultsStep = computed(() => currentStep.value === 'results')

    const start = () => {
      hasStarted.value = true
      currentStep.value = 'questionnaire'
    }

    const goToIntroduction = () => {
      currentStep.value = 'introduction'
    }

    const goToQuestionnaire = () => {
      if (!hasStarted.value) return
      currentStep.value = 'questionnaire'
    }

    const setAnswer = (
      key: string,
      value: string | number | boolean
    ) => {
      answers.value[key] = value
    }

    const setAnswers = (
      payload: Record<string, string | number | boolean>
    ) => {
      answers.value = {
        ...answers.value,
        ...payload
      }
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
      answers.value = {}
      result.value = null
    }

    return {
      currentStep,
      hasStarted,
      isCompleted,
      answers,
      result,
      isIntroductionStep,
      isQuestionnaireStep,
      isResultsStep,
      start,
      goToIntroduction,
      goToQuestionnaire,
      setAnswer,
      setAnswers,
      complete,
      reset
    }
  }
)