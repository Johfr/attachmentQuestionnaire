<script setup lang="ts">
import { useBillingStore } from '~/stores/billing'
import { useAuthStore } from '~/stores/auth'
import type { AccessType, CheckoutContactPayload, EntitySubType, EntityType } from '~/types/billing'
import type { AuthFormPayload } from '~/types/User'
import Popin from '~/components/designSystem/Popin.vue'
import LoginForm from '~/components/auth/LoginForm.vue'

type PopinKey = 'coaching-zen' | 'coaching-express' | string
type LoginFormExpose = {
  submit: () => { isValid: boolean, payload?: AuthFormPayload }
  hasRequiredFieldsFilled: () => boolean
}

useSeoMeta({
  title: 'Coaching relation anxieux-évitant | Séance personnalisée',
  description: 'Réserve une séance de coaching personnalisée pour comprendre ta relation anxieux-évitant, apaiser la peur de l\'abandon, sortir de la dépendance affective et prendre du recul sur ta situation amoureuse.',
  keywords: 'coaching relation anxieux évitant, rupture amoureuse, relation anxieux évitant, coach anxieux évitant, séance coaching relation amoureuse, peur de l\'abandon, dépendance affective, silence distance rupture, coaching attachement adulte, accompagnement relationnel',
  ogTitle: 'Coaching relation anxieux-évitant | Séance personnalisée',
  ogDescription: 'Une séance de coaching pour prendre du recul, analyser ta situation amoureuse et comprendre la dynamique anxieux-évitant.',
  ogUrl: 'https://relation-anxieux-evitant.web.app/contact',
  ogImage: 'https://relation-anxieux-evitant.web.app/img/bg-questionnaire.png',
  twitterTitle: 'Coaching relation anxieux-évitant | Séance personnalisée',
  twitterDescription: 'Réserve une séance pour analyser ta situation amoureuse et sortir des schémas anxieux-évitant.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://relation-anxieux-evitant.web.app/contact' }],
})

const authStore = useAuthStore()
const billingStore = useBillingStore()
const user = computed(() => authStore.user)
const errorMessage = ref('')
const checkoutType = ref<AccessType | null>(null)
const showPopin = ref(false)
const popinType = ref<PopinKey>('')
const phone = ref('')
const loginFormData = ref<LoginFormExpose | null>(null)

const normalizePhoneInput = (value: string) => value.replace(/\D/g, '')
const isFrenchMobileOrLandline = (value: string) => /^0\d{9}$/.test(normalizePhoneInput(value))

const getCheckoutErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'Une erreur est survenue lors de la redirection vers le paiement.'
  }

  return error.message || 'Une erreur est survenue lors de la redirection vers le paiement.'
}

const openPopin = (key: PopinKey) => {
  errorMessage.value = ''
  popinType.value = key
  phone.value = user.value?.phone || ''
  showPopin.value = true
}

const resolveCheckoutConfig = (key: PopinKey): { entitySubType: EntitySubType, accessType: AccessType, docId: string } | null => {
  if (key === 'coaching-zen') {
    return {
      entitySubType: 'zen',
      accessType: 'coachingZen',
      docId: 'coaching-zen-v1',
    }
  }

  if (key === 'coaching-express') {
    return {
      entitySubType: 'express',
      accessType: 'coachingExpress',
      docId: 'coaching-express-v1',
    }
  }

  return null
}

const isCheckoutButtonDisabled = computed(() => {
  if (checkoutType.value !== null) {
    return true
  }

  if (!isFrenchMobileOrLandline(phone.value)) {
    return true
  }

  if (user.value) {
    return false
  }

  return !(loginFormData.value?.hasRequiredFieldsFilled?.() ?? false)
})

const ensureAuthenticatedUser = async () => {
  if (user.value) {
    return true
  }

  const submitResult = loginFormData.value?.submit()
  if (!submitResult?.isValid || !submitResult.payload) {
    return false
  }

  const result = await authStore.authenticateForQuestionnaire(submitResult.payload)
  if (!result.success) {
    errorMessage.value = result.errorMessage || 'Impossible de te connecter pour le moment.'
    return false
  }

  return true
}

const defineCheckoutTypeAndGoToCheckout = async (key: PopinKey) => {
  const checkoutConfig = resolveCheckoutConfig(key)

  if (!checkoutConfig) {
    errorMessage.value = 'Type de séance de coaching non reconnu.'
    return
  }

  await goToCheckout('coaching', checkoutConfig.entitySubType, checkoutConfig.accessType, checkoutConfig.docId)
}

const goToCheckout = async (
  entityType: EntityType,
  entitySubType: EntitySubType,
  accessType: AccessType,
  docId: string,
) => {
  const checkoutPhone = normalizePhoneInput(phone.value)

  if (!checkoutPhone) {
    errorMessage.value = 'Renseigne ton numéro de téléphone pour que je puisse te recontacter.'
    return
  }

  if (!isFrenchMobileOrLandline(checkoutPhone)) {
    errorMessage.value = 'Renseigne un numéro de téléphone valide à 10 chiffres commençant par 0.'
    return
  }

  checkoutType.value = accessType

  try {
    errorMessage.value = ''

    const isAuthenticated = await ensureAuthenticatedUser()
    if (!isAuthenticated) {
      return
    }

    const hasSavedPhone = await authStore.saveUserPhoneNumber(checkoutPhone)
    if (!hasSavedPhone) {
      errorMessage.value = 'Impossible d enregistrer ton numéro de téléphone pour le moment.'
      return
    }

    const checkoutEmail = user.value?.email?.trim()
    if (!checkoutEmail) {
      errorMessage.value = 'Impossible de récupérer ton adresse email pour la réservation.'
      return
    }

    const contactPayload: CheckoutContactPayload = {
      email: checkoutEmail,
      phone: checkoutPhone,
      checkoutOrigin: 'contact',
    }

    await billingStore.goToCheckout(entityType, entitySubType, accessType, 'v1', 'contact', docId, contactPayload)
  } catch (error) {
    errorMessage.value = getCheckoutErrorMessage(error)
  } finally {
    checkoutType.value = null
  }
}
</script>

<template>
  <div class="">
    <DesignSystemPageSectionHeading :isHeading="true" title="Prendre rendez-vous" titleSize="text-4xl md:text-3xl" sectionSpacing="mt-8 mb-12" />

    <div class="md:flex md:justify-between md:flex-row-reverse md:gap-24">
      <img
        src="~/assets/img/ebook-cover.png"
        alt="Couverture de l'ebook"
        class="hidden w-full h-full mb-8 rounded-lg shadow-md object-contain md:max-w-[55%]"
      />
    </div>

    <section>
      <h2 class="text-2xl md:text-2xl uppercase text-theme-text mb-6">Profite d'une séance de coaching personnalisée</h2>

      <div class="md:flex md:justify-between gap-3 space-y-7 text-theme-text md:space-y-0">
        <div class="rounded-3xl bg-theme-surfaceStaticCard p-6 md:max-w-[49%]">
          <h3 class="mb-9 text-lg md:text-xl uppercase">Ce sur quoi je t'accompagne et comment se déroule une séance ?</h3>

          <ul class="text-xs uppercase list-inside space-y-5">
            <li class="pl-8 relative before:absolute before:w-[25px] before:h-[25px] before:top-0 before:left-0 before:content-['1'] before:flex before:justify-center before:items-center before:border-2 before:border-rust before:border-solid before:rounded-md before:text-rust">
              On discute ensemble de ta <strong>situation amoureuse</strong>
            </li>
            <li class="pl-8 relative before:absolute before:w-[25px] before:h-[25px] before:top-0 before:left-0 before:content-['2'] before:flex before:justify-center before:items-center before:border-2 before:border-rust before:border-solid before:rounded-md before:text-rust">
              Je t'aide à <strong>prendre du recul</strong> et à <strong>apaiser tes émotions</strong>
            </li>
            <li class="pl-8 relative before:absolute before:w-[25px] before:h-[25px] before:top-0 before:left-0 before:content-['3'] before:flex before:justify-center before:items-center before:border-2 before:border-rust before:border-solid before:rounded-md before:text-rust">
              Je te fournis des <strong>réponses précises</strong> et une <strong>analyse complète</strong> afin que tu y voies plus clair
            </li>
            <li class="pl-8 relative before:absolute before:w-[25px] before:h-[25px] before:top-0 before:left-0 before:content-['4'] before:flex before:justify-center before:items-center before:border-2 before:border-rust before:border-solid before:rounded-md before:text-rust">
              Je débunk avec toi tes <strong>croyances limitantes</strong>, tes peurs et tes doutes
            </li>
            <li class="pl-8 relative before:absolute before:w-[25px] before:h-[25px] before:top-0 before:left-0 before:content-['5'] before:flex before:justify-center before:items-center before:border-2 before:border-rust before:border-solid before:rounded-md before:text-rust">
              <strong>Prise de rendez-vous rapide</strong>, dans la journée ou en urgence
            </li>
          </ul>
        </div>

        <!-- Les + -->
        <div class="rounded-3xl bg-theme-surfaceStaticCard p-6 md:max-w-[49%]">
          <h3 class="mb-9 text-lg md:text-xl uppercase">Les <LucideBadgePlus class="min-w-8 inline-block" /> d'une séance avec moi</h3>

          <ul class="text-xs uppercase list-inside space-y-5">
            <li class="flex">
              <LucideBadgePlus class="min-w-8 inline-block text-rust" />
              <span class="pl-2">Mon expérience en matière de <strong>relation anxieux-évitant</strong> et d'<strong>attachement adulte</strong></span>
            </li>
            <li class="flex">
              <LucideBadgePlus class="min-w-8 inline-block text-rust" />
              <span class="pl-2">Un <strong>suivi personnalisé</strong> et réactif cohérent avec ta situation et tes besoins</span>
            </li>
            <li class="flex">
              <LucideBadgePlus class="min-w-8 inline-block text-rust" />
              <span class="pl-2">Mon écoute <strong>empathique</strong>, bienveillante et sans jugement </span>
            </li>
            <li class="flex">
              <LucideBadgePlus class="min-w-8 inline-block text-rust" />
              <span class="pl-2">Ma capacité à analyser ta situation de manière globale et à te fournir des <strong>réponses précises et complètes</strong></span>
            </li>
            <li class="flex">
              <LucideBadgePlus class="min-w-8 inline-block text-rust" />
              <span class="pl-2">La <strong>confidentialité des échanges</strong> et un cadre sain sans jugement</span>
            </li>
            <li class="flex">
              <LucideBadgePlus class="min-w-8 inline-block text-rust" />
              <span class="pl-2">Un tarif abordable et une <strong>prise de rendez-vous rapide</strong></span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="mt-10">
      <h2 class="text-2xl md:text-2xl uppercase text-theme-text mb-6">Les formules disponibles</h2>

      <div class="md:flex md:justify-between gap-3 space-y-7 text-theme-text md:space-y-0">
        <!-- Séance classique -->
        <div class="rounded-3xl bg-theme-surfaceStaticCard p-6 w-full md:max-w-[49%]">
          <h3 class="mb-9 text-lg md:text-xl uppercase">Formule zen <LucideLeaf class="min-w-8 inline-block text-rust" /></h3>

          <ul class="text-xs md:text-base list-inside space-y-5">
            <li class="flex">
              <LucideLeaf class="min-w-8 inline-block text-rust" />
              <span class="pl-2"><strong>60 minutes de coaching par téléphone</strong></span>
            </li>
            <li class="flex">
              <LucideLeaf class="min-w-8 inline-block text-rust" />
              <span class="pl-2">On échange autour de ta situation, tes doutes, tes problématiques et on <strong>analyse ensemble</strong></span>
            </li>
            <li class="flex">
              <LucideLeaf class="min-w-8 inline-block text-rust" />
              <span class="pl-2"><strong>Actions précises</strong> pour faire évoluer ta situation</span>
            </li>
            <li class="flex">
              <LucideLeaf class="min-w-8 inline-block text-rust" />
              <span class="pl-2">Échange par texto pour t'accompagner sur les jours qui suivent</span>
            </li>
          </ul>

          <p class="text-center mt-5 text-2xl">
            45€
          </p>

          <button
            class="mt-5 px-4 py-4 bg-theme-button text-theme-buttonText rounded-full w-full disabled:opacity-60"
            @click="openPopin('coaching-zen')"
          >
            Je réserve ma séance
          </button>
        </div>

        <!-- Formule express -->
        <div class="rounded-3xl bg-theme-surfaceStaticCard p-6 w-full md:max-w-[49%]">
          <h3 class="mb-9 text-lg md:text-xl uppercase">Formule express <LucideRocket class="min-w-8 inline-block text-rust" /></h3>

          <ul class="text-xs md:text-base list-inside space-y-5">
            <li class="flex">
              <LucideRocket class="min-w-8 inline-block text-rust" />
              <span class="pl-2"><strong>45 minutes de coaching par téléphone</strong></span>
            </li>
            <li class="flex">
              <LucideRocket class="min-w-8 inline-block text-rust" />
              <span class="pl-2">Tu m'exposes ta situation et on <strong>analyse ensemble</strong></span>
            </li>
            <li class="flex">
              <LucideRocket class="min-w-8 inline-block text-rust" />
              <span class="pl-2">Mise en place d'<strong>actions rapides et concrètes</strong></span>
            </li>
            <li class="flex">
              <LucideRocket class="min-w-8 inline-block text-rust" />
              <span class="pl-2"><strong>Disponibilité en priorité</strong></span>
            </li>
          </ul>

          <p class="text-center mt-5 text-2xl">
            99€
          </p>

          <button
            class="mt-5 px-4 py-4 bg-theme-button text-theme-buttonText rounded-full w-full disabled:opacity-60"
            @click="openPopin('coaching-express')"
          >
            Je réserve ma séance
          </button>
        </div>
      </div>
    </section>

    <section class="mt-10">
      <h2 class="text-2xl md:text-2xl uppercase text-theme-text mb-6">Questions fréquentes</h2>

      <div class="md:flex md:justify-between gap-3 space-y-7 text-theme-text md:space-y-0">
        <div class="rounded-3xl bg-theme-surfaceStaticCard p-6 w-full md:max-w-[49%]">
          <h3 class="mb-9 text-lg md:text-xl uppercase">Que se passe t'il après la réservation ?</h3>

          <p class="">
            Après la réservation, tu recevras un <strong>email de confirmation</strong> avec les détails de ta séance. Je te contacterai ensuite pour convenir d'une date et d'une heure qui te conviennent. Tu pourras également me poser toutes les questions que tu souhaites avant la séance.
          </p>
        </div>
      </div>
    </section>

    <Popin v-model="showPopin">
      <h1 class="text-lg mb-5">Indique tes informations pour que je puisse te contacter et préparer au mieux notre séance</h1>

      <LoginForm ref="loginFormData">
        <template #extra-fields>
          <label class="mt-2 flex flex-col text-sm text-theme-text" for="phone-number">
            Ton numéro de téléphone
            <input
              data-testid="contact-phone-input"
              id="phone-number"
              v-model="phone"
              type="tel"
              placeholder="Ton numéro de téléphone"
              class="mt-2 rounded-2xl border border-solid border-theme-formInputBorder bg-theme-surfaceFormInput p-3 text-sm text-theme-text placeholder:text-theme-muted"
            />
          </label>
        </template>
      </LoginForm>

      <p
        v-if="errorMessage"
        class="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <button
        data-testid="contact-checkout-button"
        type="button"
        class="mt-5 px-4 py-4 bg-theme-button text-theme-buttonText rounded-full w-full disabled:opacity-60"
        :disabled="isCheckoutButtonDisabled"
        @click="defineCheckoutTypeAndGoToCheckout(popinType)"
      >
        <span v-if="checkoutType !== null">
          <LucideLoader class="animate-spin inline-block mr-2" :size="18" />
          Redirection...
        </span>
        <span v-else>
          Je réserve ma séance
        </span>
      </button>

      <p class="small text-xs text-theme-primary text-center">Tu seras redirigé vers la page de paiement</p>
    </Popin>
  </div>
</template>
