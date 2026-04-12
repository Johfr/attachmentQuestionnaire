<script setup lang="ts">
import { useBillingStore } from '~/stores/billing'
import type { EntitySubType, EntityType, AccessType } from '~/types/billing'

useSeoMeta({
  title: 'Ebook : Tout comprendre sur la relation anxieux-évitant',
  description: 'Cet ebook explore en profondeur la dynamique anxieux–évitant, l\'une des plus fréquentes et des plus destructrices si elle n\'est pas comprise. Tu y découvriras comment les peurs inconscientes, les stratégies de survie émotionnelle de chacun et les blessures d\'attachement (inconscientes et apprises) façonnent les comportements de chacun jusqu\'à créer incompréhension, frustration, colère, épuisement et destruction.',
  keywords: 'ebook relation anxieux évitant, comprendre relation anxieux évitant, dynamique anxieux évitant, blessures d\'attachement, schémas relationnels, sortir du cercle vicieux anxieux évitant',
  ogTitle: 'Ebook : Tout comprendre sur la relation anxieux-évitant',
  ogDescription: 'Comprends la dynamique anxieux–évitant, les blessures d\'attachement qui la sous-tendent et les pistes concrètes pour en sortir.',
  ogUrl: 'https://relation-anxieux-evitant.web.app/ebook',
  ogImage: '/img/ebook-cover.png',
  twitterTitle: 'Ebook : Tout comprendre sur la relation anxieux-évitant',
  twitterDescription: 'Comprends la dynamique anxieux–évitant, les blessures d\'attachement et les pistes pour en sortir.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://relation-anxieux-evitant.web.app/ebook' }],
})

const billingStore = useBillingStore()
const errorMessage = ref('')
const checkoutType = ref<AccessType | null>(null)
const docId = 'ebook-anxieux-evitant-v1'
  
const goToCheckout = async (entityType: EntityType, entitySubType: EntitySubType, accessType: AccessType) => {
  checkoutType.value = accessType

  try {
    errorMessage.value = ''
    await billingStore.goToCheckout(entityType, entitySubType, accessType, 'v1', 'ebook', docId)
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Une erreur est survenue lors de la redirection vers le paiement.'
  } finally {
    checkoutType.value = null
  }
}
</script>

<template>
  <section class="">
    <DesignSystemPageSectionHeading :isHeading="true" title="Ebook" titleSize="text-4xl md:text-3xl" sectionSpacing="mt-8 mb-12" />

    <div class="md:flex md:justify-between md:flex-row-reverse md:gap-24">
      <img
        src="~/assets/img/ebook-cover.png"
        alt="Couverture de l'ebook"
        class="w-full h-full mb-8 rounded-lg shadow-md object-contain md:max-w-[55%]"
      />

      <div class="flex flex-col p-4 space-y-7 text-theme-text md:max-w-[45%]">
        <!-- entete -->
        <h2 class="text-4xl leading-normal md:max-w-[80%] md:text-4xl md:leading-normal">
          Ebook : Tout comprendre sur la relation anxieux-évitant
        </h2>

        <button
          class="px-4 py-4 bg-theme-button text-theme-buttonText rounded-full w-full disabled:opacity-60"
          :disabled="checkoutType === 'ebook'"
          @click="goToCheckout('ebook', 'ebook', 'ebook')"
        >
          <span v-if="checkoutType === 'ebook'">
            <LucideLoader class="animate-spin inline-block mr-2" :size="18" />
            Redirection...
          </span>
          <span v-else>
            Acheter maintenant
          </span>
        </button>

        <p v-if="errorMessage" class="text-sm text-red-600">
          {{ errorMessage }}
        </p>

        <!-- encart accroche -->
        <div class="rounded-3xl bg-theme-surfaceStaticCard p-6">
          <p>
            Pourquoi certaines relations semblent intenses mais impossibles à faire durer ?
            Pourquoi plus l'un s'accroche et l'autre fuit ?
            Et pourquoi l'amour, à lui seul, ne suffit-il pas ?
          </p>
        </div>
        
        <!-- Contenu -->
        <p>
          Cet ebook explore en profondeur la <strong>dynamique anxieux–évitant</strong>, l'une des plus fréquentes et des plus destructrices si elle n'est pas comprise.

          Tu y découvriras comment les <strong>peurs inconscientes</strong>, les <strong>stratégies de survie émotionnelle</strong> de chacun et les <strong>blessures d'attachement</strong> (inconscientes et apprises) façonnent les comportements de chacun jusqu'à créer incompréhension, frustration, colère, épuisement et destruction.
        </p>

        <div>
          <p>
              À travers une analyse claire, accessible et incarnée, cet ebook t'aide à :
          </p>
          <ul class="list-disc list-inside mt-4 pl-4">
            <li>Comprendre les mécanismes inconscients qui alimentent la dynamique anxieux-évitant.</li>
            <li>Identifier les blessures d'attachement qui sous-tendent les comportements de chacun.</li>
            <li>Découvrir des pistes concrètes pour sortir du cercle vicieux et construire une relation plus saine.</li>
          </ul>
        </div>
        
        <!-- footer  -->
        <p>
          Que tu sois <strong>anxieux</strong>, <strong>évitant</strong> ou les deux, cet ebook t'offre des clés pour comprendre tes schémas, ceux de ta partenaire et les dynamiques à l'œuvre dans votre relation. Il t'aide à faire le lien entre tes expériences passées, tes peurs actuelles et tes comportements, pour que tu puisses enfin sortir du cercle vicieux et construire la relation que tu souhaites.
        </p>
        <p>
          Si tu veux comprendre en profondeur la dynamique <strong>anxieux-évitant</strong>, les <strong>blessures d'attachement</strong> qui la sous-tendent et les pistes pour en sortir, cet ebook est fait pour toi.
        </p>

        <em class="text-theme-muted">Vous obtiendrez un fichier PDF (537KB)</em>
      </div>
    </div>
  </section>
</template>
