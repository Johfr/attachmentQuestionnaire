<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { QuestionResult, AttachmentQuestion, AttachmentDimension } from '~/types/attachmentQuestionnaireResults'

const props = defineProps<{
  questions: AttachmentQuestion[]
}>()

const emit = defineEmits(['complete'])

const inputRadioLength = ref([{ name:'Pas du tout d\'accord', value: 0 }, { name: 'Pas vraiment d\'accord', value: 1 }, { name: 'D\'accord / Neutre', value: 2 }, { name: 'Plutôt d\'accord', value: 3 }, { name: 'Tout à fait d\'accord', value: 4 }])

const currentQuestion = ref(1)
const surveyCompleted = ref(false)
const results = ref<QuestionResult[]>([])
const isSubmitting = ref(false)
const questionRefs = ref<Record<number, HTMLElement | null>>({})
const submitButtonRef = ref<HTMLElement | null>(null)
const MOBILE_BREAKPOINT = 960

const setQuestionRef = (questionId: number, element: Element | ComponentPublicInstance | null) => {
  questionRefs.value[questionId] = element instanceof HTMLElement ? element : null
}

const scrollToNextStep = async (nextQuestionId: number) => {
  if (!import.meta.client || window.innerWidth >= MOBILE_BREAKPOINT) {
    return
  }

  await nextTick()

  if (surveyCompleted.value) {
    submitButtonRef.value?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
    return
  }

  questionRefs.value[nextQuestionId]?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

const getInputValue = (questionDimension: AttachmentDimension, questionId: number, value: number, questionTags: string[]) => {
  if (currentQuestion.value === questionId) {
    currentQuestion.value++
    void scrollToNextStep(currentQuestion.value)
  }
  if (currentQuestion.value >= props.questions.length + 1) {
    surveyCompleted.value = true
  }

  if (results.value.some(result => result.id === questionId)) {
    const existingResult = results.value.find(result => result.id === questionId)
    if (existingResult) {
      existingResult.value = value
    }
  } else {
    results.value.push({ id: questionId, dimension: questionDimension, value, tags: questionTags })
  }
  // return value
}

const submitForm = async () => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  try {
    emit('complete', results.value)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form>
    <div
      v-for="question in questions"
      :key="question.id"
      v-show="currentQuestion >= question.id"
      :ref="(element) => setQuestionRef(question.id, element)"
    >
      <Transition name="slide-up" mode="out-in">
        <div v-if="currentQuestion >= question.id" class="question-wrapper">
          <div class="question-container" :class="question.id < currentQuestion ? 'active' : ''" >
            <div class="question-id-container">
              <span class="question-id">
                {{ question.id }}
              </span>
            </div>

            <p class="question-label">
              {{ question.question }}
            </p>

            <div class="input-container">
              <div
                v-for="(radioOption, radioIndex) in inputRadioLength"
                :key="radioOption.value"
                :for="`question-${question.id}-${radioOption.value}`"
                class="input-wrapper"
              >
              
                <div class="input-icon-container">
                  <input
                    type="radio"
                    :id="`question-${question.id}-${radioOption.value}`"
                    :value="radioOption.value"
                    :name="`question-${question.id}`"
                    @click="getInputValue(question.dimension, question.id, radioOption.value, question.tags)"
                  />
                  <LucideCheck v-if="question.id < currentQuestion && radioIndex === results[question.id - 1]?.value" class="input-icon" />
                </div>

                <label
                  :for="`question-${question.id}-${radioOption.value}`"
                  class="input-label"
                >
                  {{ radioOption.name }}
                </label>
              </div>
            </div>
          </div>
          
          <div class="question-state" :class="question.id < currentQuestion ? 'active' : ''" />
        </div>
      </Transition>
    </div>

    <button v-if="surveyCompleted" ref="submitButtonRef" :disabled="isSubmitting" @click="submitForm" type="button" class="submit-button flex items-center justify-center gap-2 disabled:opacity-60">
      <LucideLoader v-if="isSubmitting" :size="16" class="loader-spin" />
      <span>Soumettre</span>
    </button>
    
    <!-- <pre>{{ results }}</pre> -->
  </form>
</template>

<style lang="scss">
$sm-resolution: 960px;

.question-wrapper {
  display: flex;
  align-items: center;
  min-height: 65px;
  background-color: var(--surface-question-card);
  border-radius: 10px;
  position: relative;
  margin-bottom: 0.5rem;
  transition: .4s ease;
}

.loader-spin {
  animation: loader-rotate 0.8s linear infinite;
}

@keyframes loader-rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
.question-id-container {
  display: none;
  @media screen and (min-width: $sm-resolution) {
    display: flex;
    justify-content: center;
    min-width: 3%;
    max-width: 3%;
  }
}
.question-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 15px;
  border-radius: 10px;

  &.active {
    border: 1px solid var(--question-active-border);
  }

  @media screen and (min-width: $sm-resolution) {
    flex-direction: row;
    padding-right: 35px;
    border: unset;
    border-radius: unset;
    
    &.active {
      border: unset;
    }
  }
}
.question-label {
  margin-top: 15px;
  margin-bottom: 25px;
  font-size: 14px;
  text-align: center;
  
  @media screen and (min-width: $sm-resolution) {
    min-width: 65%;
    max-width: 65%;
    margin-top: 0;
    margin-bottom: 0;
    padding-right: 15px;
    padding-left: 15px;
    text-align: left;

    .question {
      font-size: 15px;
      max-width: 70%;
    }
  }
}
.question-tags {
  display: inline-block;
  margin-top: 5px;
  font-size: 9px;
  padding: 2px 6px;
  color: #fff;

  &.anxiety {
    background-color: rgb(89, 89, 252);
  }
  &.avoidance {
    background-color: rgb(250, 92, 92);
  }
}
.input-container {
  display: flex;
  padding: 0 10px;
  
  @media screen and (min-width: $sm-resolution) {
    margin-top: 20px;
  }

  // masque les inputs radio de base et afficher à la place un rond  qui change de couleur lorsqu'il est sélectionné
  input[type="radio"] {
    appearance: none;
    width: 35px;
    height: 35px;
    border: 1px solid var(--questionnaire-input-border);
    border-radius: 50%; //4px
    cursor: pointer;
    transition: 0.3s ease;
  }

  input[type="radio"]:checked {
    background-color: var(--question-active-border);
    border-color: var(--question-active-border);
    color: #fff;
  }
}
.input-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.input-icon-container {
  position: relative;

  .input-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    pointer-events: none; // pour que le clic passe à travers l'icône et soit pris en compte par l'input radio
  }
}
.input-label {
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 50px;
  font-size: 12px;
  margin-top: 5px;
  font-size: 9px;
  text-align: center;
  white-space: wrap;
}
.question-state {
  @media screen and (min-width: $sm-resolution) {
    width: 20px;
    // height: 106px;
    height: 100%;
    background-color: #c492922a; //ccc
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
    transition: 1s ease;
    position: absolute;
    right: 0;

    &.active {
      background-color: var(--question-active-border);
    }
  }
}
</style>
