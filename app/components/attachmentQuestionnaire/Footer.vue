<script setup lang="ts">
import { useAttachmentQuestionnaireWizardStore } from '~/stores/attachmentQuestionnaireWizard'

// 'introduction'
//   | 'questionnaire'
//   | 'results'
const numericSteps = {
  introduction: 1,
  questionnaire: 2,
  results: 3
}
const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore()
const questionnaireCurrentStep = computed(() => questionnaireWizardStore.currentStep)

</script>

<template>  
  <div class="footer">
    <p>
      Etape {{ numericSteps[questionnaireCurrentStep] }} sur {{ Object.keys(numericSteps).length }}
    </p>
    <div class="steps">
      <div class="step active" />
      <div class="step" :class="{ active: questionnaireCurrentStep === 'questionnaire' || questionnaireCurrentStep === 'results' }" />
      <div class="step" :class="{ active: questionnaireCurrentStep === 'results' }" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  // margin-top: 2rem;
  border-top: 1px solid #eee;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;

  p {
    font-size: 16px;
    color: #999;
  }
}

.steps {
  display: flex;
  gap: 0.5rem;

  .step {
    width: 40px;
    height: 10px;
    border-radius: 15px;
    background-color: #eee;

    &.active {
      background-color: var(--button-dark);
    }
  }
}
</style>