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

  // utiliser un loader sur le bouton pour indiquer que le questionnaire se prepare
}
</script>

<template>
  <section>
    <h1 title="Questionnaire d'attachement adulte">Questionnaire d'attachement adulte</h1>
    <p class="subtitle text-gray-500">
      <LucideClock5 :size="12" class="mr-2" />
      Duree estimee : 8-15 minutes
    </p>

    <div class="mt-4 p-6 text-sm text-gray-700 text-center bg-white border border-solid border-gray-300 rounded-3xl">
      <p>
        Tu t'appretes a passer le test pour definir ton type d'attachement adulte en couple. Il y a 20 questions, chacune avec 5 options de reponse. Choisis celle qui te correspond le mieux pour chaque question. Il n'y a pas de bonnes ou de mauvaises reponses, sois simplement honnete avec toi-meme.
      </p>
    </div>

    <div class="mt-4 p-6 text-sm text-gray-700 text-center bg-white border border-solid border-gray-300 rounded-3xl">
      <p class="mb-2">
        Ce questionnaire explore tes reactions face au silence, a la distance, aux periodes de tension, a la peur de perdre l'autre. Il vise a identifier ton style d'attachement (anxieux, evitant, secure, desorganise) et a t'aider a mieux comprendre tes schemas relationnels.
      </p>
      <p>
        Il est inspire des modeles contemporains de l'attachement adulte, notamment les dimensions d'anxiete et d'evitement. Il propose une lecture structuree et utile du fonctionnement relationnel, mais ne constitue pas un diagnostic clinique.
      </p>
    </div>

    <div class="flex flex-col mt-4 p-6 text-sm text-gray-800 text-center bg-red-100 border border-solid border-gray-300 rounded-3xl">
      <p class="mb-2">
        Commence ce questionnaire seulement quand tu peux aller jusqu'au bout.
      </p>
      <p class="mb-2">
        Assure toi d'etre dans de bonnes conditions pour y repondre : un moment calme, ou tu ne seras pas derange, et ou tu pourras reflechir a tes experiences relationnelles passees et presentes.
      </p>
      <p class="">
        Tes reponses en cours ne sont pas sauvegardees si tu quittes le parcours avant la fin. Il n'y a pas de bonnes ou de mauvaises reponses, sois simplement honnete avec toi-meme. Prends ton temps pour reflechir a chaque question et reponds en fonction de tes experiences et sentiments dans tes relations amoureuses passees et presentes. Bonne chance !
      </p>
    </div>

    <section v-if="!user" class="mt-8 p-4 rounded-3xl bg-white">
      <h2 class="mb-3">Personnalise ton experience</h2>

      <h3 class="mt-0 mb-2 text-xs font-semibold uppercase">A propos de toi</h3>

      <LoginForm v-if="!user" ref="loginFormData"/>
    </section>

    <section class="mt-4 mb-4 p-4 rounded-3xl bg-white">
      <div class="my-2 leading-6 rounded-3xl bg-white">
        <h3 class="mt-0 text-xs font-semibold uppercase">
          A propos de ton/ta partenaire
          <span>(Facultatif)</span>
        </h3>
        <label for="partnerFirstName" class="flex flex-col mt-2 text-sm" >
          Son prenom
          <input v-model="partnerName" type="text" id="partnerFirstName" name="partnerFirstName" autocomplete="off" placeholder="Ex: Camille" class="mt-2 p-3 text-sm border border-solid rounded-2xl text-gray-700" />
        </label>
        <label for="partnerAge" class="flex flex-col mt-2 text-sm">
          Son age
          <input v-model="partnerAge" type="number" id="partnerAge" name="partnerAge" autocomplete="off" placeholder="Ex: 30" class="mt-2 p-3 text-sm border border-solid rounded-2xl text-gray-700" />
        </label>
      </div>
    </section>

    <p v-if="authErrorMessage" class="mt-3 text-xs text-red-600 text-center">
      {{ authErrorMessage }}
    </p>

    <button type="button" :disabled="isSubmitting" @click="nextStep" class="submit-button flex items-center justify-center gap-2 disabled:opacity-60">
      <LucideLoader v-if="isSubmitting" :size="16" class="loader-spin" />
      <span>Valider et commencer le questionnaire</span>
      <LucideMoveRight v-if="!isSubmitting" :size="16" />
    </button>

    <p class="mt-5 text-xs text-gray-500 text-center">
      Vos donnees personnelles restent privees et ne sont utilisees que pour personnaliser votre experience. Elles ne sont pas partagees avec des tiers et sont protegees conformement a notre politique de confidentialite.
    </p>
  </section>
</template>

<style scoped lang="scss">
  .information-container {
    margin: .5rem 0;
    line-height: 1.5;
    border-radius: 25px;
    background-color: #fff;

    h3 {
      margin-top: 0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
  }

h1 {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
}

h2 {
  font-size: 18px;
  font-weight: 600;
}

.subtitle {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-size: 14px;
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

.intro-form-title {
  display: flex;
  align-items: center;
}
</style>
