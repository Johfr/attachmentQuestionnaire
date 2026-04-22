import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { firebaseClient } from "~/composables/firebase/useFirebaseClient.js"
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { createUserAccountWithEmailAndPassword, signInUserWithEmailAndPassword, signOutUser } from '~/composables/firebase/useFirebaseAuthentication.js'
import type {
  AuthFormPayload,
  CurrentPartnerContext,
  Gender,
  QuestionnaireAccessEntry,
  QuestionnaireAccessMap,
  UserLoginForm,
} from '~/types/User'

type PartnerContextPayload = {
  partnerName?: string | null
  partnerAge?: number | null
  partnerGender?: Gender | null
}

type AuthActionResult = {
  success: boolean
  errorCode?: string | null
  errorMessage?: string
}

// Module-scoped flag — not in Pinia state to avoid SSR hydration pollution.
let _clientInitDone = false

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserLoginForm | null>(null)
  const currentPartnerContext = ref<CurrentPartnerContext | null>(null)
  const questionnaireAccess = ref<QuestionnaireAccessMap>({})
  const isAdmin = ref(false)
  const isLoginModalOpen = ref(false)
  const redirectAfterLogin = ref<string | null>(null)
  const hasInitialized = ref(false)

  const isLoggedIn = computed(() => !!user.value)

  const openLoginModal = () => {
    isLoginModalOpen.value = true
  }

  const closeLoginModal = () => {
    isLoginModalOpen.value = false
  }

  const normalizeGender = (value: unknown): Gender | null => {
    return value === 'male' || value === 'female' ? value : null
  }

  const normalizePhone = (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return null
    }

    const trimmedValue = value.trim()
    return trimmedValue ? trimmedValue : null
  }

  const buildPartnerContext = ({ partnerName, partnerAge, partnerGender }: PartnerContextPayload) => {
    const normalizedName = (partnerName || '').trim() || null
    const normalizedAge = typeof partnerAge === 'number' ? partnerAge : null
    const normalizedGender = normalizeGender(partnerGender)

    if (!normalizedName && normalizedAge === null && !normalizedGender) {
      return null
    }

    return {
      firstName: normalizedName,
      age: normalizedAge,
      gender: normalizedGender,
    }
  }

  const normalizeStoredPartnerContext = (value: unknown): CurrentPartnerContext | null => {
    if (!value || typeof value !== 'object') {
      return null
    }

    const candidate = value as Record<string, unknown>
    const firstName = typeof candidate.firstName === 'string' && candidate.firstName.trim()
      ? candidate.firstName.trim()
      : null
    const age = typeof candidate.age === 'number' ? candidate.age : null
    const gender = normalizeGender(candidate.gender)

    if (!firstName && age === null && !gender) {
      return null
    }

    return {
      firstName,
      age,
      gender,
    }
  }

  const normalizeQuestionnaireAccess = (value: unknown): QuestionnaireAccessMap => {
    if (!value || typeof value !== 'object') {
      return {}
    }

    const normalized: QuestionnaireAccessMap = {}

    for (const [questionnaireType, rawEntry] of Object.entries(value as Record<string, unknown>)) {
      if (!rawEntry || typeof rawEntry !== 'object') continue

      const candidate = rawEntry as Record<string, unknown>
      const cooldownDays = typeof candidate.cooldownDays === 'number' ? candidate.cooldownDays : null
      if (cooldownDays === null) continue

      normalized[questionnaireType] = {
        lastCompletedAt: candidate.lastCompletedAt as QuestionnaireAccessEntry['lastCompletedAt'] ?? null,
        nextAllowedAt: candidate.nextAllowedAt as QuestionnaireAccessEntry['nextAllowedAt'] ?? null,
        cooldownDays,
      }
    }

    return normalized
  }

  const getTimestampMs = (value: unknown): number => {
    if (!value || typeof value !== 'object') return 0

    const candidate = value as { toMillis?: () => number; seconds?: number }
    if (typeof candidate.toMillis === 'function') {
      return candidate.toMillis()
    }

    if (typeof candidate.seconds === 'number') {
      return candidate.seconds * 1000
    }

    return 0
  }

  const savePartnerContext = async (partnerData: PartnerContextPayload) => {
    const currentUser = firebaseClient.auth.currentUser
    if (!currentUser) return false

    try {
      const partnerContext = buildPartnerContext(partnerData)
      if (!partnerContext) {
        return true
      }

      await setDoc(
        doc(firebaseClient.db, 'users', currentUser.uid),
        {
          currentPartnerContext: partnerContext,
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        },
        { merge: true },
      )

      currentPartnerContext.value = partnerContext

      return true
    } catch (error) {
      console.error('Error while saving partner context:', error)
      return false
    }
  }

  const getFirebaseAuthErrorMessage = (errorCode?: string | null) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Cet email est déjà utilisé.'
      case 'auth/invalid-email':
        return 'Le format de l email est invalidé.'
      case 'auth/user-not-found':
        return 'Aucun compte ne correspond a cet email.'
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email ou mot de passe incorrect.'
      case 'auth/too-many-requests':
        return 'Trop de tentatives. Reessaie dans quelques minutes.'
      case 'auth/weak-password':
        return 'Le mot de passe est trop faible.'
      case 'auth/network-request-failed':
        return 'Probleme reseau. Verifie ta connexion.'
      default:
        return 'Une erreur est survenue pendant l authentification.'
    }
  }

  const getUserProfileFromFirestore = async (uid: string, fallbackEmail: string) => {
    const userDocRef = doc(firebaseClient.db, 'users', uid)
    const userDoc = await getDoc(userDocRef)
    const data = userDoc.exists() ? userDoc.data() : {}
    const isFirestoreAdmin = data?.admin === true

    return {
      localUser: {
        id: uid,
        email: (data?.email as string) || fallbackEmail,
        name: (data?.name as string) || '',
        age: (typeof data?.age === 'number' ? data.age : null),
        admin: isFirestoreAdmin,
        gender: normalizeGender(data?.gender),
        phone: normalizePhone(data?.phone),
        password: '',
      } as UserLoginForm,
      partnerContext: normalizeStoredPartnerContext(data?.currentPartnerContext),
      questionnaireAccess: normalizeQuestionnaireAccess(data?.questionnaireAccess),
      isAdmin: isFirestoreAdmin,
    }
  }

  const saveUserPhoneNumber = async (phone: string | null) => {
    const currentUser = firebaseClient.auth.currentUser
    if (!currentUser) return false

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) return false

    try {
      await setDoc(
        doc(firebaseClient.db, 'users', currentUser.uid),
        {
          phone: normalizedPhone,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      if (user.value) {
        user.value = {
          ...user.value,
          phone: normalizedPhone,
        }
      }

      return true
    } catch (error) {
      console.error('Error while saving user phone number:', error)
      return false
    }
  }

  const loadAuthClaims = async (firebaseUser: { getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims?: Record<string, unknown> }> } | null) => {
    if (!firebaseUser) {
      isAdmin.value = false
      return
    }

    try {
      const tokenResult = await firebaseUser.getIdTokenResult()
      isAdmin.value = isAdmin.value || tokenResult.claims?.admin === true
    } catch (error) {
      console.error('Error while loading auth claims:', error)
    }
  }

  const loadCurrentPartnerContext = async () => {
    const uid = firebaseClient.auth.currentUser?.uid || user.value?.id
    const fallbackEmail = firebaseClient.auth.currentUser?.email || user.value?.email || ''

    if (!uid) {
      currentPartnerContext.value = null
      return null
    }

    try {
      const profile = await getUserProfileFromFirestore(uid, fallbackEmail)
      currentPartnerContext.value = profile.partnerContext
      questionnaireAccess.value = profile.questionnaireAccess
      isAdmin.value = profile.isAdmin
      return profile.partnerContext
    } catch (error) {
      console.error('Error while loading partner context:', error)
      return null
    }
  }

  const getQuestionnaireAccessEntry = (questionnaireType: string) => {
    return questionnaireAccess.value[questionnaireType] ?? null
  }

  const getQuestionnaireCooldownStatus = (questionnaireType: string) => {
    const entry = getQuestionnaireAccessEntry(questionnaireType)
    if (!entry) {
      return {
        blocked: false,
        remainingDays: 0,
        nextAllowedAt: null,
      }
    }

    const nextAllowedAtMs = getTimestampMs(entry.nextAllowedAt)
    if (!nextAllowedAtMs) {
      return {
        blocked: false,
        remainingDays: 0,
        nextAllowedAt: entry.nextAllowedAt,
      }
    }

    const remainingMs = nextAllowedAtMs - Date.now()
    if (remainingMs <= 0) {
      return {
        blocked: false,
        remainingDays: 0,
        nextAllowedAt: entry.nextAllowedAt,
      }
    }

    return {
      blocked: true,
      remainingDays: Math.ceil(remainingMs / (1000 * 60 * 60 * 24)),
      nextAllowedAt: entry.nextAllowedAt,
    }
  }

  const authenticateForQuestionnaire = async (
    authPayload: AuthFormPayload,
    partnerData: PartnerContextPayload = {},
  ): Promise<AuthActionResult> => {
    const { currentForm, userLoginForm } = authPayload
    const partnerContext = buildPartnerContext(partnerData)

    let authResult: { success: boolean, user?: any, error?: string, errorCode?: string | null }

    if (currentForm === 'signup') {
      if (!userLoginForm.name || userLoginForm.age === null || userLoginForm.age === undefined || !userLoginForm.gender) {
        return {
          success: false,
          errorMessage: 'Nom, age et sexe sont obligatoires pour creer un compte.',
        }
      }

      authResult = await createUserAccountWithEmailAndPassword(userLoginForm.email, userLoginForm.password)
    } else {
      authResult = await signInUserWithEmailAndPassword(userLoginForm.email, userLoginForm.password)
    }

    if (!authResult.success || !authResult.user) {
      return {
        success: false,
        errorCode: authResult.errorCode || null,
        errorMessage: getFirebaseAuthErrorMessage(authResult.errorCode || null),
      }
    }

    const firebaseUser = authResult.user

    try {
      if (currentForm === 'signup') {
        await setDoc(
          doc(firebaseClient.db, 'users', firebaseUser.uid),
          {
            uid: firebaseUser.uid,
            email: firebaseUser.email || userLoginForm.email,
            name: userLoginForm.name || null,
            age: userLoginForm.age ?? null,
            gender: userLoginForm.gender ?? null,
            authProvider: 'password',
            emailVerified: Boolean(firebaseUser.emailVerified),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            currentPartnerContext: partnerContext,
          },
          { merge: true },
        )

        user.value = {
          id: firebaseUser.uid,
          email: firebaseUser.email || userLoginForm.email,
          name: userLoginForm.name || '',
          age: userLoginForm.age ?? null,
          gender: userLoginForm.gender ?? null,
          phone: null,
          password: '',
        }
        currentPartnerContext.value = partnerContext
        questionnaireAccess.value = {}
        isAdmin.value = false
        await loadAuthClaims(firebaseUser)
      } else {
        const loginDocPayload: Record<string, unknown> = {
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        }

        if (partnerContext) {
          loginDocPayload.currentPartnerContext = partnerContext
        }

        await setDoc(
          doc(firebaseClient.db, 'users', firebaseUser.uid),
          loginDocPayload,
          { merge: true },
        )

        const profile = await getUserProfileFromFirestore(
          firebaseUser.uid,
          firebaseUser.email || userLoginForm.email,
        )
        user.value = profile.localUser
        currentPartnerContext.value = profile.partnerContext
        questionnaireAccess.value = profile.questionnaireAccess
        isAdmin.value = profile.isAdmin
        await loadAuthClaims(firebaseUser)
      }

      isLoginModalOpen.value = false
      return { success: true }
    } catch (error) {
      console.error('Error while saving authenticated user:', error)
      return {
        success: false,
        errorMessage: 'Connexion reussie, mais la sauvegarde du profil a echoue.',
      }
    }
  }

  const login = async (payload: UserLoginForm) => {
    const result = await authenticateForQuestionnaire({
      currentForm: 'login',
      userLoginForm: payload,
    })

    return result.success
  }

  const logout = async () => {
    try {
      await signOutUser()
      user.value = null
      currentPartnerContext.value = null
      questionnaireAccess.value = {}
      isAdmin.value = false
      return { success: true }
    } catch (error) {
      console.error('Error while signing out:', error)
      return {
        success: false,
        errorMessage: 'Impossible de te deconnecter pour le moment.',
      }
    }
  }

  const initAuth = (): Promise<void> => {
    // Skip entirely during SSR — no Firebase Auth persistence available.
    if (!import.meta.client) return Promise.resolve()

    // Use a module-scoped flag to avoid re-registering the listener.
    // Pinia's ref(hasInitialized) can be polluted by SSR hydration.
    if (_clientInitDone) {
      hasInitialized.value = true
      return Promise.resolve()
    }
    _clientInitDone = true
    hasInitialized.value = true

    return new Promise<void>((resolve) => {
      firebaseClient.onAuthStateChanged(
        firebaseClient.auth,
        async (firebaseUser) => {
          if (firebaseUser) {
            const profile = await getUserProfileFromFirestore(firebaseUser.uid, firebaseUser.email || '')
            user.value = profile.localUser
            currentPartnerContext.value = profile.partnerContext
            questionnaireAccess.value = profile.questionnaireAccess
            isAdmin.value = profile.isAdmin
            await loadAuthClaims(firebaseUser)
          } else {
            user.value = null
            currentPartnerContext.value = null
            questionnaireAccess.value = {}
            isAdmin.value = false
          }
          resolve()
        }
      )
    })
  }
  

  return {
    user,
    currentPartnerContext,
    questionnaireAccess,
    isAdmin,
    isLoggedIn,
    isLoginModalOpen,
    redirectAfterLogin,
    hasInitialized,
    openLoginModal,
    closeLoginModal,
    authenticateForQuestionnaire,
    loadCurrentPartnerContext,
    getQuestionnaireAccessEntry,
    getQuestionnaireCooldownStatus,
    savePartnerContext,
    saveUserPhoneNumber,
    login,
    logout,
    initAuth
  }
})
