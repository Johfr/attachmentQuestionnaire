// Labels stables pour le questionnaire d'attachement v1.
// Hardcodés intentionnellement : les JSON métier ne doivent pas être chargés
// côté client uniquement pour la traduction.
export const profileTranslations: Record<string, string> = {
  // Profils globaux
  globallySecure: 'Globalement sécure',
  anxious: 'Anxieux',
  dismissiveAvoidant: 'Evitant détaché (dismissive-avoidant)',
  fearfulAvoidant: 'Evitant craintif (fearful-avoidant)',
  mixedProfile: 'Profil mixte ou nuancé',
  // Sous-profils anxieux
  anxiousActivated: 'Anxieux activé',
  anxiousRegulated: 'Anxieux régulé',
  anxiousAmbivalent: 'Anxieux ambivalent',
  // Sous-profils évitants
  avoidantRigid: 'Évitant rigide',
  avoidantFlexible: 'Évitant flexible',
  avoidantAdaptive: 'Évitant adaptatif',
  // Autres
  fearfulAvoidantActivated: 'Fearful-avoidant activé',
  notSignificant: 'Non significatif',
}

export const getProfileLabel = (profileKey: string): string =>
  profileTranslations[profileKey] || profileKey
