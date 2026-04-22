import type { Timestamp } from "firebase/firestore"

export type Gender = 'male' | 'female'

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
  gender: Gender | null
  phone: string | null

  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt: Timestamp | null

  authProvider: 'password' | 'google' | 'anonymous'
  emailVerified: boolean

  currentPartnerContext: {
    firstName: string | null
    age: number | null
    gender: Gender | null
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
  gender: Gender | null
}

export type UserLoginForm = {
  id?: string
  email: string
  password: string
  name?: string
  age?: number | null
  admin?: boolean | null
  gender?: Gender | null
  phone?: string | null
}

export type AuthFormMode = 'login' | 'signup'

export type AuthFormPayload = {
  currentForm: AuthFormMode
  userLoginForm: UserLoginForm
}
