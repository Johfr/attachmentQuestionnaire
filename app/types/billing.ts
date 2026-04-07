// billing.ts

export type EntityType = 'questionnaire' | 'article' | 'formation'
export type EntitySubType = 'attachment' | 'conscience' | 'compatibility' | 'other' // à adapter selon les types de contenus proposés 
export type AccessType = 'results' | 'ia' | 'membership' | 'formation'
export type EntityVersion = 'v1' | 'v2' | 'v3' // à adapter selon les versions disponibles

export type PaymentMetadata = {
  entityType?: string
  entitySubType?: string
  accessType?: string
  entityVersion?: string
  docId?: string
  successUrl?: string
}

export type UserPayment = {
  id: string
  status: string
  amount: number
  currency: string
  created: unknown // Firestore Timestamp
  metadata: PaymentMetadata
}

export type UserSubscription = {
  id: string
  status: string
  created: unknown // Firestore Timestamp
  current_period_end: unknown // Firestore Timestamp
  cancel_at_period_end: boolean
  metadata: PaymentMetadata
}