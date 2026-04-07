import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { firebaseFunctions } from '~/composables/firebase/init'
import { collection, query, where, addDoc, getDocs, onSnapshot } from "firebase/firestore"
import type { EntitySubType, EntityType, AccessType, EntityVersion, UserPayment, UserSubscription } from '~/types/billing'

export const useBillingStore = defineStore('billing', () => {
  const authStore = useAuthStore()
  const user = computed(() => authStore.user)
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

  const checkUserPermissions = async () => {
    if (!user.value) {
      billingInfo.value = { hasPaidResults: false, hasPaidIa: false, hasPaidMembership: false, hasPaidFormation: false }
      return
    }

    const uid = user.value.id ?? 'unknown_user'

    // Est-ce qu'on requête customers ou alors questionnaireSessions une fois mis à jour ?
    // Paiements uniques réussis
    const paymentsSnap = await getDocs(query(
      collection(firebaseFunctions.db, 'customers', uid, 'payments'),
      where('status', '==', 'succeeded'),
    ))
    const paidProductIds = new Set<string>()
    paymentsSnap.docs.forEach((d) => {
      const items = d.data().items as Array<{ price?: { product?: string } }> | undefined
      items?.forEach(item => { if (item?.price?.product) paidProductIds.add(item.price.product) })
    })

    // Abonnements actifs
    const subsSnap = await getDocs(query(
      collection(firebaseFunctions.db, 'customers', uid, 'subscriptions'),
      where('status', 'in', ['active', 'trialing']),
    ))
    const activeSubProductIds = new Set<string>()
    subsSnap.docs.forEach((d) => {
      const items = d.data().items as Array<{ price?: { product?: string } }> | undefined
      items?.forEach(item => { if (item?.price?.product) activeSubProductIds.add(item.price.product) })
    })

    billingInfo.value = {
      hasPaidResults: paidProductIds.has('prod_UFEBJxvgmXlOxL'),
      hasPaidIa: paidProductIds.has('prod_UFEBeMrgvlyq7q'),
      hasPaidMembership: activeSubProductIds.has('prod_UFEDIkXmyJC4xO'),
      hasPaidFormation: activeSubProductIds.has('prod_xxx'),
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
        collection(firebaseFunctions.db, 'customers', uid, 'payments'),
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
        collection(firebaseFunctions.db, 'customers', uid, 'subscriptions'),
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
    const functionsInstance = firebaseFunctions.getFunctions(firebaseFunctions.app)
    const createPortalLink = firebaseFunctions.httpsCallable(
      functionsInstance,
      'ext-firestore-stripe-payments-createPortalLink',
    )
    const { data } = await createPortalLink({
      returnUrl: window.location.origin + '/user/profil',
    })
    window.location.assign((data as { url: string }).url)
  }

  const goToCheckout = async (entityType: EntityType, entitySubType: EntitySubType, accessType: AccessType, entityVersion: EntityVersion, successUrl: string, docId: string) => {
    const products: Record<AccessType, { price: number; mode: 'payment' | 'subscription', productId: string, productPriceId?: string, recurrence?: 'month' | 'year',  }> = {
      results: { price: 199, mode: 'payment', productId: 'prod_UFEBJxvgmXlOxL', productPriceId: 'price_1TGjipPH1HNS3Ks3YWPBQC7e' },
      ia: { price: 499, mode: 'payment', productId: 'prod_UFEBeMrgvlyq7q', productPriceId: 'price_1TGjjVPH1HNS3Ks362PNQVov' },
      membership: { price: 699, mode: 'subscription', productId: 'prod_UFEDIkXmyJC4xO', productPriceId : 'price_1TGjkrPH1HNS3Ks3Xajcb96w', recurrence: 'month',  },
      formation: { price: 4999, mode: 'subscription', productId: 'prod_xxx', recurrence: 'year',  },
    }
    
    const collectionRef = collection(firebaseFunctions.db, 'customers', user.value?.id ?? 'unknown_user', 'checkout_sessions')

    const docRef = await addDoc(collectionRef, {
      mode: products[accessType].mode,
      line_items: [
        {
          quantity: 1,
          price: products[accessType].productPriceId, // Stripe product price_ID
        },
      ],
      metadata: {
        entityType,
        entitySubType,
        accessType,
        entityVersion,
        successUrl,
        docId,
      },
      // Mirror metadata onto the PaymentIntent (payment mode) or Subscription (subscription mode)
      // so the Stripe Extension propagates it to customers/{uid}/payments or /subscriptions.
      // Without this, the Cloud Functions cannot read docId / accessType from those documents.
      ...(products[accessType].mode === 'payment'
        ? {
            payment_intent_data: {
              metadata: { entityType, entitySubType, accessType, entityVersion, successUrl, docId },
            },
          }
        : {
            subscription_data: {
              metadata: { entityType, entitySubType, accessType, entityVersion, successUrl, docId },
            },
          }),
      success_url: `${window.location.origin}/user/${successUrl}/results?sessionId=${docId}`,
      cancel_url: `${window.location.origin}/user/profile/`,
    })

    return await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe()
        reject(new Error('Impossible de joindre la page de paiement. Réessaie.'))
      }, 15000)

      const unsubscribe = onSnapshot(docRef, (snap) => {
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