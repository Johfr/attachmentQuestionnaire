<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import LoginForm from "~/utils/LoginForm.vue"
import type { AuthFormPayload } from '~/types/User'

const props = defineProps<{
  authErrorMessage?: string | null
  isSubmitting?: boolean
  initialPartnerName?: string | null
  initialPartnerAge?: number | null
}>()

const auth = useAuthStore()
const user = computed(() => auth.user)

type StartSurveyPayload = {
  authPayload: AuthFormPayload | null
  partnerName: string | null
  partnerAge: number | null
}

type LoginFormExpose = {
  submit: () => { isValid: boolean, payload?: AuthFormPayload }
}

const emits = defineEmits<{
  (event: 'startSurvey', payload: StartSurveyPayload): void
}>()

const loginFormData = ref<LoginFormExpose | null>(null)
const partnerName = ref('')
const partnerAge = ref<number | null>(null)

watch(
  () => [props.initialPartnerName, props.initialPartnerAge],
  ([nextPartnerName, nextPartnerAge]) => {
    partnerName.value = typeof nextPartnerName === 'string' ? nextPartnerName : ''
    partnerAge.value = typeof nextPartnerAge === 'number' ? nextPartnerAge : null
  },
  { immediate: true },
)

const nextStep = () => {
  let authPayload: AuthFormPayload | null = null

  if (!user.value) {
    const submitResult = loginFormData.value?.submit()
    if (!submitResult?.isValid || !submitResult.payload) {
      return
    }

    authPayload = submitResult.payload
  }

  emits('startSurvey', {
    authPayload,
    partnerName: partnerName.value.trim() || null,
    partnerAge: partnerAge.value,
  })

  // utiliser un loader sur le bouton pour indiquer que le questionnaire se prépare
}
</script>

<template>
  <section>
    <h1 title="Questionnaire d'attachement adulte">Questionnaire d'attachement adulte</h1>
    <p class="subtitle text-gray-500">
      <LucideClock5 :size="12" class="mr-2" />
      Durée estimée : 8-15 minutes
    </p>
    
    <p class="mt-4 p-6 text-sm text-gray-700 text-center bg-white border border-solid border-gray-300 rounded-3xl">
      Tu t'apprêtes à passer le test pour définir ton type d'attachement adulte en couple. Il y a 20 questions, chacune avec 5 options de réponse. Choisis celle qui te correspond le mieux pour chaque question. Il n'y a pas de bonnes ou de mauvaises réponses, sois simplement honnête avec toi-même. 
    </p>
    <p class="mt-4 p-6 text-sm text-gray-700 text-center bg-white border border-solid border-gray-300 rounded-3xl">
      Ce test est inspiré des modèles contemporains de l'attachement adulte, notamment les dimensions d'anxiété et d'évitement. Il propose une lecture structurée et utile du fonctionnement relationnel, mais ne constitue pas un diagnostic clinique.
    </p>
    <!-- Prends ton temps pour réfléchir à chaque question et réponds en fonction de tes expériences et sentiments dans tes relations amoureuses passées et présentes. Bonne chance ! -->
    <!-- <p>
      Ce questionnaire est conçu pour évaluer ton style d'attachement adulte en couple, basé sur les dimensions d'anxiété et d'évitement. Il n'est pas destiné à être un diagnostic clinique, mais plutôt un outil de réflexion personnelle pour mieux comprendre tes tendances relationnelles. Les résultats peuvent t'aider à identifier des schémas de comportement dans tes relations amoureuses et à explorer des pistes pour améliorer ton bien-être émotionnel et relationnel.
    </p> -->

    <section v-if="!user" class="mt-8 p-4 rounded-3xl bg-white">
      <h2 class="mb-3">Personnalise ton expérience</h2>

      <h3 class="mt-0 mb-2 text-xs font-semibold uppercase">A propos de toi</h3>

      <LoginForm v-if="!user" ref="loginFormData"/>
    </section>
    
    <!-- User's partner -->
    <section class="mt-4 mb-4 p-4 rounded-3xl bg-white">
      <div class="my-2 leading-6 rounded-3xl bg-white">
        <h3 class="mt-0 text-xs font-semibold uppercase">
          A propos de ton/ta partenaire
          <span>(Facultatif)</span>
        </h3>
        <label for="partnerFirstName" class="flex flex-col mt-2 text-sm" >
          Son prénom
          <input v-model="partnerName" type="text" id="partnerFirstName" name="partnerFirstName" autocomplete="off" placeholder="Ex: Camille" class="mt-2 p-3 text-sm border border-solid  rounded-2xl text-gray-700" />
        </label>
        <label for="partnerAge" class="flex flex-col mt-2 text-sm">
          Son âge
          <input v-model="partnerAge" type="number" id="partnerAge" name="partnerAge" autocomplete="off" placeholder="Ex: 30" class="mt-2 p-3 text-sm border border-solid  rounded-2xl text-gray-700" />
        </label>
      </div>
    </section>
    
    <p v-if="authErrorMessage" class="mt-3 text-xs text-red-600 text-center">
      {{ authErrorMessage }}
    </p>
    
    <button type="button" :disabled="isSubmitting" @click="nextStep" class="submit-button flex items-center justify-center gap-2 disabled:opacity-60">
      <LucideLoader v-if="isSubmitting" :size="16" class="loader-spin" />
      <span>Commencer le questionnaire</span>
      <LucideMoveRight v-if="!isSubmitting" :size="16" />
    </button>

    <p class="mt-5 text-xs text-gray-500 text-center">
      Vos données personnelles restent privées et ne sont utilisées que pour personnaliser votre expérience. Elles ne sont pas partagées avec des tiers et sont protégées conformément à notre politique de confidentialité.
    </p>
  </section>
</template>

<style scoped lang="scss">
  .information-container {
    margin: .5rem 0;
    // padding: 1rem;
    line-height: 1.5;
    border-radius: 25px;
    background-color: #fff;

    h3 {
      margin-top: 0;
      font-size: 12px;
      font-weight: 600;
      // color: var(--secondary-color);
      text-transform: uppercase;
    }
  }
h1 {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
}
h2 {
  // margin-top: 2rem;
  font-size: 18px;
  font-weight: 600;
}
.subtitle {
  display: flex;
  justify-content: center;
  align-items: center;
  // margin-top: 1.5rem;
  text-align: center;
  font-size: 14px;
  // color: var(--secondary-color);
  font-weight: 400;
}
.introduction {
  margin-top: 2rem;
  padding: 1.5rem;
  line-height: 1.5;
  text-align: center;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 25px;
  background-color: #fff;
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

// .intro-form-container {
//   margin-top: 2rem;
// }
.intro-form-title {
  display: flex;
  align-items: center;
}

// form {
//   display: flex;
//   flex-direction: column;

//   .information-container {
//     margin: .5rem 0;
//     padding: 1rem;
//     line-height: 1.5;
//     border-radius: 25px;
//     background-color: #fff;

//     h3 {
//       margin-top: 0;
//       font-size: 12px;
//       font-weight: 600;
//       // color: var(--secondary-color);
//       text-transform: uppercase;
//     }
//   }

//   label {
//     display: flex;
//     flex-direction: column;
//     font-size: 14px;
//     &:not(:first-child) {
//       margin-top: 1rem;
//     }

//     input {
//       margin-top: 0.5rem;
//       padding: 0.75rem;
//       font-size: 14px;
//       border: 1px solid #ddd;
//       border-radius: 15px;
//       color: #333;
//     }
//   }

//   // button {
//   //   display: flex;
//   //   justify-content: space-evenly;
//   //   align-items: center;
//   //   width: 100%;
//   //   margin-top: 1rem;
//   //   padding: 1.25rem;
//   //   color: #fff;
//   //   font-size: 18px;
//   //   font-weight: 600;
//   //   background-color: rgb(34, 0, 128);
//   //   border: none;
//   //   border-radius: 25px;
//   //   box-shadow: 0 5px 5px 0px rgba(34, 0, 128, 0.3);
//   //   cursor: pointer;
//   // }
//   .legacy-information {
//     font-size: 12px;
//     color: #666;
//     text-align: center;
//   }
// }
</style>