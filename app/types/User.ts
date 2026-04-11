import type { Timestamp } from "firebase/firestore"

export type QuestionnaireAccessEntry = {
  lastCompletedAt: Timestamp | null
  nextAllowedAt: Timestamp | null
  cooldownDays: number
}

export type QuestionnaireAccessMap = Record<string, QuestionnaireAccessEntry>

export type User = {
  uid: string
  email: string
  name: string
  age: number | null
  admin?: boolean | null

  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt: Timestamp | null

  authProvider: 'password' | 'google' | 'anonymous'
  emailVerified: boolean

  currentPartnerContext: {
    firstName: string | null
    age: number | null
  } | null

  questionnaireAccess?: QuestionnaireAccessMap | null

  settings: {
    locale: 'fr'
    marketingEmailsAccepted: boolean
  }
}

export type CurrentPartnerContext = {
  firstName: string | null
  age: number | null
}

export type UserLoginForm = {
  id?: string
  email: string
  password: string
  name?: string
  age?: number | null
  admin?: boolean | null
}

export type AuthFormMode = 'login' | 'signup'

export type AuthFormPayload = {
  currentForm: AuthFormMode
  userLoginForm: UserLoginForm
}
