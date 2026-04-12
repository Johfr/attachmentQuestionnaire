<script lang="ts" setup>
import { useAuthStore } from '~/stores/auth'
import type { AuthFormMode, AuthFormPayload, UserLoginForm } from '~/types/User'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const currentForm = ref<AuthFormMode>('signup')
const loginFormButtonText = computed(() => currentForm.value === 'signup' ? "J'ai deja un compte" : 'Creer un compte')
const switchLoginForm = () => {
  currentForm.value = currentForm.value === 'signup' ? 'login' : 'signup'
  clearValidation()
}

const name = ref('')
const email = ref('')
const age = ref<string | number>('')
const password = ref('')

const touched = reactive({
  name: false,
  email: false,
  age: false,
  password: false,
})

const errors = reactive({
  name: '',
  email: '',
  age: '',
  password: '',
})

const isSignupMode = computed(() => currentForm.value === 'signup')

const clearValidation = () => {
  touched.name = false
  touched.email = false
  touched.age = false
  touched.password = false
  errors.name = ''
  errors.email = ''
  errors.age = ''
  errors.password = ''
}

const isEmailValid = (value: string) => /\S+@\S+\.\S+/.test(value)
const normalizeAgeInput = () => String(age.value ?? '').trim()

const validateField = (field: 'name' | 'email' | 'age' | 'password') => {
  if (field === 'name') {
    if (!isSignupMode.value) {
      errors.name = ''
      return
    }

    errors.name = name.value.trim() ? '' : 'Le prenom est obligatoire.'
    return
  }

  if (field === 'age') {
    if (!isSignupMode.value) {
      errors.age = ''
      return
    }

    const ageInput = normalizeAgeInput()
    if (!ageInput) {
      errors.age = 'L age est obligatoire.'
      return
    }

    const parsedAge = Number(ageInput)
    errors.age = Number.isNaN(parsedAge) || parsedAge <= 0 ? 'Saisis un age valide.' : ''
    return
  }

  if (field === 'email') {
    const value = email.value.trim()
    if (!value) {
      errors.email = 'L email est obligatoire.'
      return
    }

    errors.email = isEmailValid(value) ? '' : 'Saisis un email valide.'
    return
  }

  const pwd = password.value.trim()
  if (!pwd) {
    errors.password = 'Le mot de passe est obligatoire.'
    return
  }

  errors.password = pwd.length >= 8 ? '' : '8 caracteres minimum.'
}

const touchAndValidate = (field: 'name' | 'email' | 'age' | 'password') => {
  touched[field] = true
  validateField(field)
}

const submit = (): { isValid: boolean, payload?: AuthFormPayload } => {
  const requiredFields: Array<'name' | 'email' | 'age' | 'password'> = isSignupMode.value
    ? ['name', 'age', 'email', 'password']
    : ['email', 'password']

  requiredFields.forEach((field) => {
    touched[field] = true
    validateField(field)
  })

  const hasErrors = requiredFields.some((field) => Boolean(errors[field]))
  if (hasErrors) {
    return { isValid: false }
  }

  const payload: UserLoginForm = {
    email: email.value.trim(),
    password: password.value.trim(),
  }

  if (isSignupMode.value) {
    payload.name = name.value.trim()
    payload.age = Number(normalizeAgeInput())
  }

  return {
    isValid: true,
    payload: {
      currentForm: currentForm.value,
      userLoginForm: payload,
    },
  }
}

defineExpose({
  submit,
})
</script>

<template>
  <form class="flex flex-col bg-transparent text-theme-text">
    <div class="mx-auto mb-4 flex w-full justify-between rounded-3xl bg-theme-surfaceFormCard md:max-w-[75%]">
      <button
        v-if="!user"
        type="button"
        @click="switchLoginForm"
        class="w-full rounded-3xl px-3 py-2 text-sm text-theme-muted transition-all"
        :class="{ 'bg-theme-button text-theme-primaryText': currentForm === 'signup' }"
      >
        Creer un compte
        <!-- {{ loginFormButtonText }} -->
      </button>
      <button
        v-if="!user"
        type="button"
        @click="switchLoginForm"
        class="w-full rounded-3xl px-3 py-2 text-sm text-theme-muted transition-all"
        :class="{ 'bg-theme-button text-theme-primaryText': currentForm === 'login' }"
      >
        Me connecter
        <!-- {{ loginFormButtonText }} -->
      </button>
    </div>

    <div v-if="!user && currentForm === 'signup'" class="flex flex-col text-sm">
      <label for="userFirstName" class="mt-2 flex flex-col text-sm">
        Ton prenom*
        <input v-model="name" @blur="touchAndValidate('name')" type="text" id="userFirstName" name="userFirstName" autocomplete="given-name" placeholder="Ex: Alex" class="mt-2 rounded-2xl border border-solid border-theme-formInputBorder bg-theme-surfaceFormInput p-3 text-sm text-theme-text placeholder:text-theme-muted" />
        <small v-if="touched.name && errors.name" class="mt-1 text-xs text-red-600">{{ errors.name }}</small>
      </label>
      <label for="userAge" class="mt-2 flex flex-col text-sm">
        Ton age*
        <input v-model="age" @blur="touchAndValidate('age')" type="number" id="userAge" name="userAge" autocomplete="off" placeholder="Ex: 28" class="mt-2 rounded-2xl border border-solid border-theme-formInputBorder bg-theme-surfaceFormInput p-3 text-sm text-theme-text placeholder:text-theme-muted" />
        <small v-if="touched.age && errors.age" class="mt-1 text-xs text-red-600">{{ errors.age }}</small>
      </label>
      <label for="userEmailSignup" class="mt-2 flex flex-col text-sm">
        Ton email*
        <input v-model="email" @blur="touchAndValidate('email')" type="email" id="userEmailSignup" name="userEmail" autocomplete="email" placeholder="Ex: alex@example.com" class="mt-2 rounded-2xl border border-solid border-theme-formInputBorder bg-theme-surfaceFormInput p-3 text-sm text-theme-text placeholder:text-theme-muted" />
        <small v-if="touched.email && errors.email" class="mt-1 text-xs text-red-600">{{ errors.email }}</small>
      </label>
      <label for="userPasswordSignup" class="mt-2 flex flex-col text-sm">
        Ton mot de passe*
        <small class="text-theme-muted">(pour sauvegarder tes resultats et y acceder plus tard)</small>
        <input v-model="password" @blur="touchAndValidate('password')" type="password" id="userPasswordSignup" name="userPassword" autocomplete="new-password" placeholder="Ex: monMotDePasse123" class="mt-2 rounded-2xl border border-solid border-theme-formInputBorder bg-theme-surfaceFormInput p-3 text-sm text-theme-text placeholder:text-theme-muted" />
        <small v-if="touched.password && errors.password" class="mt-1 text-xs text-red-600">{{ errors.password }}</small>
      </label>

      <!-- <button type="button" @click="submitCreateUser">Creer un compte</button> -->
    </div>

    <div v-if="!user && currentForm === 'login'" class="information-container">
      <!-- <h3 class="mt-0 text-xs font-semibold uppercase">A propos de toi</h3> -->
      <label for="userEmailLogin" class="mt-2 flex flex-col text-sm">
        Ton email*
        <input v-model="email" @blur="touchAndValidate('email')" type="email" id="userEmailLogin" name="userEmailLogin" autocomplete="email" placeholder="Ex: alex@example.com" class="mt-2 rounded-2xl border border-solid border-theme-formInputBorder bg-theme-surfaceFormInput p-3 text-sm text-theme-text placeholder:text-theme-muted" />
        <small v-if="touched.email && errors.email" class="mt-1 text-xs text-red-600">{{ errors.email }}</small>
      </label>
      <label for="userPasswordLogin" class="mt-2 flex flex-col text-sm">
        Ton mot de passe*
        <input v-model="password" @blur="touchAndValidate('password')" type="password" id="userPasswordLogin" name="userPasswordLogin" autocomplete="current-password" placeholder="Ex: monMotDePasse123" class="mt-2 rounded-2xl border border-solid border-theme-formInputBorder bg-theme-surfaceFormInput p-3 text-sm text-theme-text placeholder:text-theme-muted" />
        <small v-if="touched.password && errors.password" class="mt-1 text-xs text-red-600">{{ errors.password }}</small>
      </label>
    </div>
  </form>
</template>

<style scoped lang="scss">
.information-container {
  margin: .5rem 0;
  line-height: 1.5;
  border-radius: 25px;
  background-color: transparent;
}
</style>
