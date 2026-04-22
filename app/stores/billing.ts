import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { firebaseClient } from '~/composables/firebase/useFirebaseClient.js'
import { collection, query, where, addDoc, getDocs, onSnapshot } from "firebase/firestore"
import type { CheckoutContactPayload, EntitySubType, EntityType, AccessType, EntityVersion, UserPayment, UserSubscription } from '~/types/billing'

export const useBillingStore = defineStore('billing', () => {
  const authStore = useAuthStore()
  const user = computed(() => authStore.user)
  const runtimeConfig = useRuntimeConfig()
  // ce store récupère les informations de facturation de l'utilisateur, pour les abonnements et les paiements
  // 3 offres : achat ponctuel, membership : premium mensuelle, premium annuelle : pour la formation à venir
  // le user peut acheter l'achat de résultat pour le formulaire d'attachement ou pour les articles membership à 1.99€, l'achat d'une réponse personnalisée à 4.99€ comprenant les résultats pour le questionnaire d'attachement, ou s'abonner au membership premium à 6.99€/mois
  // Les achats sont tous ponctuels, mais le membership est un abonnement qui se renouvelle tous les mois
  // Stripe et firebase seront utilisés et configurés, il reste à implémenter les fonctions d'achat et d'abonnement, ainsi que la récupération des informations de facturation de l'utilisateur pour afficher dans son profil et gérer les accès aux contenus premium
  // L'achat du user doit permettre de savoir à quel contenu il a accès, et de lui donner accès à ce contenu dans son profil et dans les articles premium
  // utiliser un id par page ?

  const payments = ref<UserPayment[]>([])
  const subscriptions = ref<UserSubscription[]>([])
  const isLoadingHistory = ref(false)

  const billingInfo = ref({
    hasPaidResults: false,
    hasPaidIa: false,
    hasPaidMembership: false,
    hasPaidFormation: false,
  })

  const hasPaidResults = computed(() => billingInfo.value.hasPaidResults)
  const hasPaidIa = computed(() => billingInfo.value.hasPaidIa)
  const hasPaidMembership = computed(() => billingInfo.value.hasPaidMembership)
  const hasPaidFormation = computed(() => billingInfo.value.hasPaidFormation)

  const stripeCatalog = {
    results: {
      price: 199,
      mode: 'payment' as const,
      productId: runtimeConfig.public.stripeResultsProductId,
      productPriceId: runtimeConfig.public.stripeResultsPriceId,
    },
    ia: {
      price: 499,
      mode: 'payment' as const,
      productId: runtimeConfig.public.stripeIaProductId,
      productPriceId: runtimeConfig.public.stripeIaPriceId,
    },
    ebook: {
      price: 699,
      mode: 'payment' as const,
      productId: runtimeConfig.public.stripeEbookProductId,
      productPriceId: runtimeConfig.public.stripeEbookPriceId,
    },
    coachingZen: {
      price: 4500,
      mode: 'payment' as const,
      productId: runtimeConfig.public.stripeCoachingZenProductId,
      productPriceId: runtimeConfig.public.stripeCoachingZenPriceId,
    },
    coachingExpress: {
      price: 9900,
      mode: 'payment' as const,
      productId: runtimeConfig.public.stripeCoachingExpressProductId,
      productPriceId: runtimeConfig.public.stripeCoachingExpressPriceId,
    },
    membership: {
      price: 699,
      mode: 'subscription' as const,
      productId: runtimeConfig.public.stripeMembershipProductId,
      productPriceId: runtimeConfig.public.stripeMembershipPriceId,
      recurrence: 'month' as const,
    },
    formation: {
      price: 4999,
      mode: 'subscription' as const,
      productId: runtimeConfig.public.stripeFormationProductId,
      productPriceId: runtimeConfig.public.stripeFormationPriceId,
      recurrence: 'year' as const,
    },
    testLive: {
      price: 0,
      mode: 'payment' as const,
      productId: runtimeConfig.public.stripeTestLiveProductId,
      productPriceId: runtimeConfig.public.stripeTestLivePriceId,
    },
  }

  const checkUserPermissions = async () => {
    if (!user.value) {
      billingInfo.value = { hasPaidResults: false, hasPaidIa: false, hasPaidMembership: false, hasPaidFormation: false }
      return
    }

    const uid = user.value.id ?? 'unknown_user'

    // Est-ce qu'on requête customers ou alors questionnaireSessions une fois mis à jour ?
    // Paiements uniques réussis
    const paymentsSnap = await getDocs(query(
      collection(firebaseClient.db, 'customers', uid, 'payments'),
      where('status', '==', 'succeeded'),
    ))
    const paidProductIds = new Set<string>()
    paymentsSnap.docs.forEach((d) => {
      const items = d.data().items as Array<{ price?: { product?: string } }> | undefined
      items?.forEach(item => { if (item?.price?.product) paidProductIds.add(item.price.product) })
    })

    // Abonnements actifs
    const subsSnap = await getDocs(query(
      collection(firebaseClient.db, 'customers', uid, 'subscriptions'),
      where('status', 'in', ['active', 'trialing']),
    ))
    const activeSubProductIds = new Set<string>()
    subsSnap.docs.forEach((d) => {
      const items = d.data().items as Array<{ price?: { product?: string } }> | undefined
      items?.forEach(item => { if (item?.price?.product) activeSubProductIds.add(item.price.product) })
    })

    billingInfo.value = {
      hasPaidResults: Boolean(stripeCatalog.results.productId) && paidProductIds.has(stripeCatalog.results.productId),
      hasPaidIa: Boolean(stripeCatalog.ia.productId) && paidProductIds.has(stripeCatalog.ia.productId),
      hasPaidMembership: Boolean(stripeCatalog.membership.productId) && activeSubProductIds.has(stripeCatalog.membership.productId),
      hasPaidFormation: Boolean(stripeCatalog.formation.productId) && activeSubProductIds.has(stripeCatalog.formation.productId),
    }
  }

  const loadPurchaseHistory = async () => {
    if (!user.value) {
      payments.value = []
      subscriptions.value = []
      return
    }

    isLoadingHistory.value = true
    const uid = user.value.id ?? 'unknown_user'

    try {
      const paymentsSnap = await getDocs(query(
        collection(firebaseClient.db, 'customers', uid, 'payments'),
        where('status', '==', 'succeeded'),
      ))
      payments.value = paymentsSnap.docs.map((d) => ({
        id: d.id,
        status: d.data().status,
        amount: d.data().amount ?? 0,
        currency: d.data().currency ?? 'eur',
        created: d.data().created,
        metadata: d.data().metadata ?? {},
      })) as UserPayment[]

      const subsSnap = await getDocs(
        collection(firebaseClient.db, 'customers', uid, 'subscriptions'),
      )
      subscriptions.value = subsSnap.docs.map((d) => ({
        id: d.id,
        status: d.data().status,
        created: d.data().created,
        current_period_end: d.data().current_period_end,
        cancel_at_period_end: d.data().cancel_at_period_end ?? false,
        metadata: d.data().metadata ?? {},
      })) as UserSubscription[]
    } finally {
      isLoadingHistory.value = false
    }
  }

  const openCustomerPortal = async () => {
    const functionsInstance = firebaseClient.getFunctions(firebaseClient.app)
    const createPortalLink = firebaseClient.httpsCallable(
      functionsInstance,
      'ext-firestore-stripe-payments-createPortalLink',
    )
    const { data } = await createPortalLink({
      returnUrl: window.location.origin + '/user/profil',
    })
    window.location.assign((data as { url: string }).url)
  }

  const goToCheckout = async (
    entityType: EntityType,
    entitySubType: EntitySubType,
    accessType: AccessType,
    entityVersion: EntityVersion,
    successUrl: string,
    docId: string,
    contactPayload: CheckoutContactPayload = {},
  ) => {
    const products: Record<AccessType, { price: number; mode: 'payment' | 'subscription', productId: string, productPriceId?: string, recurrence?: 'month' | 'year' }> = stripeCatalog
    const selectedProduct = products[accessType]
    const trimmedDocId = docId.trim()
    const customerEmail = contactPayload.email?.trim() || user.value?.email?.trim() || null
    const customerPhone = contactPayload.phone?.trim() || null

    if ((accessType === 'results' || accessType === 'ia') && !trimmedDocId) {
      throw new Error('La session est encore en cours de sauvegarde. Reessaie dans quelques instants.')
    }

    if (!selectedProduct.productPriceId) {
      throw new Error('Produit Stripe non configure pour cet environnement.')
    }

    if ((accessType === 'coachingZen' || accessType === 'coachingExpress') && (!customerEmail || !customerPhone)) {
      throw new Error('Renseigne ton email et ton numero de telephone pour reserver ta seance.')
    }
    
    const successCheckoutUrl = accessType === 'ebook'
      ? `${window.location.origin}/user/profil?checkout=success`
      : accessType === 'testLive'
        ? `${window.location.origin}/admin?checkout=success`
        : accessType === 'coachingZen'
          ? `${window.location.origin}/user/profil?checkout=success&type=zen`
          : accessType === 'coachingExpress'
            ? `${window.location.origin}/user/profil?checkout=success&type=express`
            : `${window.location.origin}/user/${successUrl}/results?sessionId=${trimmedDocId}`

    const cancelCheckoutUrl = accessType === 'ebook'
      ? `${window.location.origin}/ebook`
      : accessType === 'testLive'
        ? `${window.location.origin}/admin`
        : accessType === 'coachingZen' || accessType === 'coachingExpress'
          ? `${window.location.origin}/contact`
          : `${window.location.origin}/user/profil/`

    const collectionRef = collection(firebaseClient.db, 'customers', user.value?.id ?? 'unknown_user', 'checkout_sessions')

    const docRef = await addDoc(collectionRef, {
      mode: selectedProduct.mode,
      line_items: [
        {
          quantity: 1,
          price: selectedProduct.productPriceId, // Stripe product price_ID
        },
      ],
      metadata: {
        entityType,
        entitySubType,
        accessType,
        entityVersion,
        successUrl,
        docId: trimmedDocId,
        checkoutOrigin: contactPayload.checkoutOrigin || (accessType === 'testLive' ? 'admin' : entityType === 'coaching' ? 'contact' : 'app'),
        customerEmail,
        customerPhone,
      },
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      ...(entityType === 'coaching'
        ? {
            phone_number_collection: {
              enabled: true,
            },
          }
        : {}),
      // Mirror metadata onto the PaymentIntent (payment mode) or Subscription (subscription mode)
      // so the Stripe Extension propagates it to customers/{uid}/payments or /subscriptions.
      // Without this, the Cloud Functions cannot read docId / accessType from those documents.
      ...(selectedProduct.mode === 'payment'
        ? {
            payment_intent_data: {
              metadata: {
                entityType,
                entitySubType,
                accessType,
                entityVersion,
                successUrl,
                docId: trimmedDocId,
                checkoutOrigin: contactPayload.checkoutOrigin || (accessType === 'testLive' ? 'admin' : entityType === 'coaching' ? 'contact' : 'app'),
                customerEmail,
                customerPhone,
              },
            },
          }
        : {
            subscription_data: {
              metadata: {
                entityType,
                entitySubType,
                accessType,
                entityVersion,
                successUrl,
                docId: trimmedDocId,
                checkoutOrigin: contactPayload.checkoutOrigin || (accessType === 'testLive' ? 'admin' : entityType === 'coaching' ? 'contact' : 'app'),
                customerEmail,
                customerPhone,
              },
            },
          }),
      success_url: successCheckoutUrl,
      cancel_url: cancelCheckoutUrl,
    })

    return await new Promise<void>((resolve, reject) => {
      // Initialisé à un no-op pour éviter la temporal dead zone si onSnapshot
      // appelle le callback synchroniquement (cas des mocks de test).
      // En production, Firestore appelle toujours le callback de manière async.
      let unsubscribe: () => void = () => {}

      const timeout = setTimeout(() => {
        unsubscribe()
        reject(new Error('Impossible de joindre la page de paiement. Réessaie.'))
      }, 15000)

      unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data()
        if (data?.error) {
          clearTimeout(timeout)
          unsubscribe()
          reject(new Error(data.error.message))
          return
        }

        if (data?.url) {
          clearTimeout(timeout)
          unsubscribe()
          resolve()
          window.location.assign(data.url)
        }
      },
      (error) => {
        clearTimeout(timeout)
        unsubscribe()
        reject(new Error(error.message))
      }
      )
    })
  }
    // retourner le statut de la création de la session de checkout ou un message d'erreur en cas d'échec de création de la session (ex: problème de connexion internet, ou autre)


  return {
    payments,
    subscriptions,
    isLoadingHistory,
    hasPaidResults,
    hasPaidIa,
    hasPaidMembership,
    hasPaidFormation,
    loadPurchaseHistory,
    openCustomerPortal,
    goToCheckout,
    checkUserPermissions,
  }
})
