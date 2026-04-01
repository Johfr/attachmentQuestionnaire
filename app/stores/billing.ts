import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useBillingStore = defineStore('billing', () => {
  // ce store récupère les informations de facturation de l'utilisateur, pour les abonnements et les paiements
  // 3 offres : achat ponctuel, membership : premium mensuelle, premium annuelle : pour la formation à venir
  // le user peut acheter l'achat de résultat pour le formulaire d'attachement ou pour les articles membership à 1.99€, l'achat d'une réponse personnalisée à 4.99€ comprenant les résultats pour le questionnaire d'attachement, ou s'abonner au membership premium à 6.99€/mois
  // Les achats sont tous ponctuels, mais le membership est un abonnement qui se renouvelle tous les mois
  // Stripe et firebase seront utilisés et configurés, il reste à implémenter les fonctions d'achat et d'abonnement, ainsi que la récupération des informations de facturation de l'utilisateur pour afficher dans son profil et gérer les accès aux contenus premium
  // L'achat du user doit permettre de savoir à quel contenu il a accès, et de lui donner accès à ce contenu dans son profil et dans les articles premium
  // utiliser un id par page ?
  type AccessType = 'results' | 'ia'

  const billingInfo = ref({
    hasPremiumAccess: true, // à remplacer par la logique de récupération des infos de facturation de l'utilisateur
    premiumExpirationDate: null,
  })

  const hasPremiumAccess = computed(() => billingInfo.value.hasPremiumAccess)
  const premiumExpirationDate = computed(() => billingInfo.value.premiumExpirationDate)

  const hasAccessToContent = (contentId: string, contentType: AccessType) => {
    // vérifier si l'utilisateur a accès au contenu en fonction de son abonnement ou de ses achats ponctuels
    if (hasPremiumAccess.value) {
      return true
    }
    // ici on peut ajouter la logique pour vérifier les achats ponctuels en fonction du contentId
    return false
  }

  return {
    hasPremiumAccess,
    premiumExpirationDate,
    hasAccessToContent
  }
})