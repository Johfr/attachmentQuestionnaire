import type { Timestamp } from "firebase/firestore"

export type User = {
  uid: string
  email: string
  name: string
  age: number | null

  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt: Timestamp | null

  authProvider: 'password' | 'google' | 'anonymous'
  emailVerified: boolean

  currentPartnerContext: {
    firstName: string | null
    age: number | null
  } | null

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
}

export type AuthFormMode = 'login' | 'signup'

export type AuthFormPayload = {
  currentForm: AuthFormMode
  userLoginForm: UserLoginForm
}
