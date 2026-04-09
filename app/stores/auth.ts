import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { firebaseFunctions } from "~/composables/firebase/init.js"
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { createUserAccountWithEmailAndPassword, signInUserWithEmailAndPassword, signOutUser } from '~/composables/firebase/Authentification.js'
import type {
  AuthFormPayload,
  CurrentPartnerContext,
  QuestionnaireAccessEntry,
  QuestionnaireAccessMap,
  UserLoginForm,
} from '~/types/User'

type PartnerContextPayload = {
  partnerName?: string | null
  partnerAge?: number | null
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

  const buildPartnerContext = ({ partnerName, partnerAge }: PartnerContextPayload) => {
    const normalizedName = (partnerName || '').trim() || null
    const normalizedAge = typeof partnerAge === 'number' ? partnerAge : null

    if (!normalizedName && normalizedAge === null) {
      return null
    }

    return {
      firstName: normalizedName,
      age: normalizedAge,
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

    if (!firstName && age === null) {
      return null
    }

    return {
      firstName,
      age,
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
    const currentUser = firebaseFunctions.auth.currentUser
    if (!currentUser) return false

    try {
      const partnerContext = buildPartnerContext(partnerData)
      if (!partnerContext) {
        return true
      }

      await setDoc(
        doc(firebaseFunctions.db, 'users', currentUser.uid),
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
    const userDocRef = doc(firebaseFunctions.db, 'users', uid)
    const userDoc = await getDoc(userDocRef)
    const data = userDoc.exists() ? userDoc.data() : {}

    return {
      localUser: {
        id: uid,
        email: (data?.email as string) || fallbackEmail,
        name: (data?.name as string) || '',
        age: (typeof data?.age === 'number' ? data.age : null),
        password: '',
      } as UserLoginForm,
      partnerContext: normalizeStoredPartnerContext(data?.currentPartnerContext),
      questionnaireAccess: normalizeQuestionnaireAccess(data?.questionnaireAccess),
    }
  }

  const loadCurrentPartnerContext = async () => {
    const uid = firebaseFunctions.auth.currentUser?.uid || user.value?.id
    const fallbackEmail = firebaseFunctions.auth.currentUser?.email || user.value?.email || ''

    if (!uid) {
      currentPartnerContext.value = null
      return null
    }

    try {
      const profile = await getUserProfileFromFirestore(uid, fallbackEmail)
      currentPartnerContext.value = profile.partnerContext
      questionnaireAccess.value = profile.questionnaireAccess
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
      if (!userLoginForm.name || userLoginForm.age === null || userLoginForm.age === undefined) {
        return {
          success: false,
          errorMessage: 'Nom et age sont obligatoires pour creer un compte.',
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
          doc(firebaseFunctions.db, 'users', firebaseUser.uid),
          {
            uid: firebaseUser.uid,
            email: firebaseUser.email || userLoginForm.email,
            name: userLoginForm.name || null,
            age: userLoginForm.age ?? null,
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
          password: '',
        }
        currentPartnerContext.value = partnerContext
        questionnaireAccess.value = {}
      } else {
        const loginDocPayload: Record<string, unknown> = {
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        }

        if (partnerContext) {
          loginDocPayload.currentPartnerContext = partnerContext
        }

        await setDoc(
          doc(firebaseFunctions.db, 'users', firebaseUser.uid),
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
      firebaseFunctions.onAuthStateChanged(
        firebaseFunctions.auth,
        async (firebaseUser) => {
          if (firebaseUser) {
            const profile = await getUserProfileFromFirestore(firebaseUser.uid, firebaseUser.email || '')
            user.value = profile.localUser
            currentPartnerContext.value = profile.partnerContext
            questionnaireAccess.value = profile.questionnaireAccess
          } else {
            user.value = null
            currentPartnerContext.value = null
            questionnaireAccess.value = {}
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
    login,
    logout,
    initAuth
  }
})
