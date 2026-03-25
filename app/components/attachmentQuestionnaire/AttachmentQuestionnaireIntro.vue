<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const user = computed(() => auth.user)

const emits = defineEmits(['startSurvey'])
const nextStep = () => {
  emits('startSurvey')
}
const currentForm = ref<'login' | 'signup'>('login')
const loginFormButtonText = computed(() => currentForm.value === 'signup' ? 'Créer mon compte' : "J'ai déjà un compte")
const switchLoginForm = () => {
  currentForm.value = currentForm.value === 'signup' ? 'login' : 'signup'
  // if (user.value) {
  //   currentForm.value = 'signup'
  // } else {
  //   currentForm.value = 'login'
  // }
}

</script>

<template>
  <section>
    <h1 title="Questionnaire d'attachement adulte">Questionnaire d'attachement adulte</h1>
    <p class="subtitle text-gray-500">
      <LucideClock5 :size="12" class="mr-2" />
      Durée estimée : 8-15 minutes
    </p>
    <p class="introduction">
      Tu t'apprêtes à passer le test pour définir ton type d'attachement adulte en couple. Il y a 20 questions, chacune avec 5 options de réponse. Choisis celle qui te correspond le mieux pour chaque question. Il n'y a pas de bonnes ou de mauvaises réponses, sois simplement honnête avec toi-même. 
    </p>
    <p class="introduction">
      Ce test est inspiré des modèles contemporains de l'attachement adulte, notamment les dimensions d'anxiété et d'évitement. Il propose une lecture structurée et utile du fonctionnement relationnel, mais ne constitue pas un diagnostic clinique.
    </p>
    <!-- Prends ton temps pour réfléchir à chaque question et réponds en fonction de tes expériences et sentiments dans tes relations amoureuses passées et présentes. Bonne chance ! -->
    <!-- <p>
      Ce questionnaire est conçu pour évaluer ton style d'attachement adulte en couple, basé sur les dimensions d'anxiété et d'évitement. Il n'est pas destiné à être un diagnostic clinique, mais plutôt un outil de réflexion personnelle pour mieux comprendre tes tendances relationnelles. Les résultats peuvent t'aider à identifier des schémas de comportement dans tes relations amoureuses et à explorer des pistes pour améliorer ton bien-être émotionnel et relationnel.
    </p> -->

    <section class="intro-form-container">
      <div class="intro-form-title">
        <h2>Personnalise ton expérience</h2>
        <button type="button" @click="switchLoginForm" class="light-button" v-if="!user">
          {{  loginFormButtonText }}
        </button>
      </div>

      <form>
        <div v-if="!user && currentForm === 'login'" class="information-container">
          <h3 class="">A propos de toi</h3>

          <label for="userFirstName">
            Ton prénom*
            <input type="text" id="userFirstName" name="userFirstName" autocomplete="given-name" placeholder="Ex: Alex" />
          </label>
          <label for="userAge">
            Ton âge*
            <input type="number" id="userAge" name="userAge" autocomplete="off" placeholder="Ex: 28" />
          </label>
          <label for="userEmailSignup">
            Ton email*
            <input type="email" id="userEmailSignup" name="userEmail" autocomplete="email" placeholder="Ex: alex@example.com" />
          </label>
          <label for="userPasswordSignup">
            Ton mot de passe*
            <small>(pour sauvegarder tes résultats et y accéder plus tard)</small>
            <input type="password" id="userPasswordSignup" name="userPassword" autocomplete="new-password" placeholder="Ex: monMotDePasse123" />
          </label>
        </div>
        
        <div v-if="!user && currentForm === 'signup'" class="information-container">
          <h3>A propos de toi</h3>
          
          <label for="userEmailLogin">
            Ton email*
            <input type="email" id="userEmailLogin" name="userEmailLogin" autocomplete="email" placeholder="Ex: alex@example.com" />
          </label>
          <label for="userPasswordLogin">
            Ton mot de passe*
            <small>(pour sauvegarder tes résultats et y accéder plus tard)</small>
            <input type="password" id="userPasswordLogin" name="userPasswordLogin" autocomplete="current-password" placeholder="Ex: monMotDePasse123" />
          </label>
        </div>
        
        <div class="information-container">
          <h3 class="">
            A propos de ton/ta partenaire
            <span>(Facultatif)</span>
          </h3>
          <label for="partnerFirstName">
            Son prénom
            <input type="text" id="partnerFirstName" name="partnerFirstName" autocomplete="off" placeholder="Ex: Camille" />
          </label>
          <label for="partnerAge">
            Son âge
            <input type="number" id="partnerAge" name="partnerAge" autocomplete="off" placeholder="Ex: 30" />
          </label>
        </div>
        
        <button type="button" @click="nextStep" class="submit-button">
          Commencer le questionnaire
          <LucideMoveRight :size="16" />
        </button>
        <p class="mt-5 legacy-information">
          Vos données personnelles restent privées et ne sont utilisées que pour personnaliser votre expérience. Elles ne sont pas partagées avec des tiers et sont protégées conformément à notre politique de confidentialité.
        </p>
      </form>
    </section>
  </section>
</template>

<style scoped lang="scss">
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

.intro-form-container {
  margin-top: 2rem;
}
.intro-form-title {
  display: flex;
  align-items: center;
}

form {
  display: flex;
  flex-direction: column;

  .information-container {
    margin: .5rem 0;
    padding: 1rem;
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

  label {
    display: flex;
    flex-direction: column;
    font-size: 14px;
    &:not(:first-child) {
      margin-top: 1rem;
    }

    input {
      margin-top: 0.5rem;
      padding: 0.75rem;
      font-size: 14px;
      border: 1px solid #ddd;
      border-radius: 15px;
      color: #333;
    }
  }

  // button {
  //   display: flex;
  //   justify-content: space-evenly;
  //   align-items: center;
  //   width: 100%;
  //   margin-top: 1rem;
  //   padding: 1.25rem;
  //   color: #fff;
  //   font-size: 18px;
  //   font-weight: 600;
  //   background-color: rgb(34, 0, 128);
  //   border: none;
  //   border-radius: 25px;
  //   box-shadow: 0 5px 5px 0px rgba(34, 0, 128, 0.3);
  //   cursor: pointer;
  // }
  .legacy-information {
    font-size: 12px;
    color: #666;
    text-align: center;
  }
}
</style>