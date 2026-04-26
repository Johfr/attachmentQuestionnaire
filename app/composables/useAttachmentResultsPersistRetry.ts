/**
 * useAttachmentResultsPersistRetry
 *
 * Orchestre le calcul, l'affichage et la persistance fiable des résultats
 * du questionnaire d'attachement lors du premier rendu post-questionnaire.
 *
 * ──────────────────────────────────────────────────────────────
 * Pourquoi ce composable n'est pas un composable front classique
 * ──────────────────────────────────────────────────────────────
 * Un composable front classique encapsule de la logique de présentation
 * (format de date, état d'ouverture d'une modale, debounce d'input…).
 * Celui-ci encapsule une garantie de fiabilité côté données :
 *
 *   1. L'API /api/attachment/results calcule ET persiste en un seul appel.
 *      Si la persistance Firestore échoue (réseau, cold start, quota),
 *      l'API renvoie quand même les résultats calculés (persisted=false).
 *
 *   2. Les résultats sont toujours affichés, indépendamment du succès
 *      de la persistance. L'affichage ne bloque jamais sur le retry.
 *
 *   3. Aujourd'hui, le retry relance le meme endpoint calcul + persistance.
 *      L'idempotence cote serveur reste une cible documentaire, pas encore
 *      l'etat reel de l'implementation.
 *
 *   4. La boucle s'arrête tôt si persisted passe à true (une tentative
 *      précédente a réussi pendant qu'une autre attendait son délai).
 *
 * Ce composable possède l'intégralité de la responsabilité "obtenir et
 * sauvegarder les résultats" : construction de l'appel API, chargement
 * initial, état réactif, et boucle de retry. La page ne contient que
 * du rendu.
 *
 * ──────────────────────────────────────────────────────
 * Stratégie de retry : immédiat + 2 s + 8 s + 20 s (4 tentatives max)
 * ──────────────────────────────────────────────────────
 * Ces délais sont intentionnellement asymétriques :
 *   - 0 ms  : relance immédiate après l'échec initial (cas réseau bref)
 *   - 2 s   : laisse le temps à un cold start Firebase Functions
 *   - 8 s   : backoff pour un problème de quota court
 *   - 20 s  : dernière chance avant d'afficher un message d'erreur définitif
 *
 * ──────────────────────────────────────────────────────
 * Usage (page)
 * ──────────────────────────────────────────────────────
 * ```ts
 * const { computedResults, sessionId, persisted, persistRetryFailed, computeError, load } =
 *   useAttachmentResultsPersistRetry()
 *
 * await load() // chargement initial (await possible car Nuxt suspend le rendu)
 * ```
 */

import { useAttachmentQuestionnaireWizardStore } from '~/stores/attachmentQuestionnaireWizard'
import { useAuthStore } from '~/stores/auth'
import { firebaseClient } from '~/composables/firebase/useFirebaseClient.js'
import type {
  AttachmentQuestion,
  AttachmentQuestionnaireDisplayResults,
  ComputeAttachmentResultsApiResponse,
} from '~/types/attachmentQuestionnaireResults'
import questions from '~/assets/data/attachment/questions.json'

// Délais fixes entre chaque tentative (ms). Modifiable ici sans toucher à la page.
const RETRY_DELAYS_MS = [0, 2000, 8000, 20000] as const

export function useAttachmentResultsPersistRetry() {
  const questionnaireWizardStore = useAttachmentQuestionnaireWizardStore()
  const authStore = useAuthStore()
  const questionList = questions.questions as unknown as AttachmentQuestion[]

  // ── État réactif exposé à la page ───────────────────────────────────────────
  const computedResults = ref<AttachmentQuestionnaireDisplayResults | null>(null)
  const sessionId = ref<string | null>(null)
  const persisted = ref(false)
  // Nombre de tentatives effectuées (hors appel initial). Utile pour analytics.
  const persistRetryCount = ref(0)
  // Passe à true une fois tous les retries épuisés sans succès.
  const persistRetryFailed = ref(false)
  const computeError = ref<string | null>(null)
  const wait = (delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs))

  const getFirebaseIdToken = async () => {
    const existingToken = await firebaseClient.auth.currentUser?.getIdToken()
    if (existingToken) {
      return existingToken
    }

    if (!authStore.isLoggedIn) {
      return null
    }

    // Juste apres une creation/connexion Firebase, currentUser peut rester
    // null pendant un court instant alors que le store local est deja hydrate.
    // On attend brievement avant le premier persist pour eviter un appel API
    // sans Authorization et donc une session non sauvegardee.
    for (let attempt = 0; attempt < 10; attempt++) {
      await wait(100)

      const retryToken = await firebaseClient.auth.currentUser?.getIdToken()
      if (retryToken) {
        return retryToken
      }
    }

    return null
  }

  // ── Appel API partagé par le chargement initial et les retries ──────────────
  // Attention : ce retry relance aujourd'hui le meme endpoint /results.
  // L'API persiste encore via add(), donc l'idempotence serveur documentee
  // reste une cible et non une garantie effective a ce stade.
  const callApi = async (): Promise<ComputeAttachmentResultsApiResponse> => {
    const token = await getFirebaseIdToken()
    const partnerCtx = authStore.currentPartnerContext
    const partnerShareSource = questionnaireWizardStore.partnerShareSource
    return $fetch<ComputeAttachmentResultsApiResponse>('/api/attachment/results', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        results: questionnaireWizardStore.result,
        questions: questionList,
        relationContext: partnerCtx || partnerShareSource
          ? {
              partnerFirstName: partnerCtx?.firstName ?? null,
              partnerAge: partnerCtx?.age ?? null,
              partnerGender: partnerCtx?.gender ?? null,
              partnerShareSource,
            }
          : null,
      },
    })
  }

  // ── Boucle de retry ─────────────────────────────────────────────────────────
  const attemptPersistRetry = async (): Promise<boolean> => {
    try {
      const response = await callApi()
      if (response.persisted && response.sessionId) {
        sessionId.value = response.sessionId
        persisted.value = true
        return true
      }
    } catch {
      // Swallowé : la prochaine tentative prendra le relais,
      // ou persistRetryFailed basculera pour informer l'utilisateur.
    }
    return false
  }

  const scheduleRetry = () => {
    let attempt = 0

    const tryNext = async () => {
      if (attempt >= RETRY_DELAYS_MS.length) {
        persistRetryFailed.value = true
        return
      }
      const delay = RETRY_DELAYS_MS[attempt]
      attempt++
      await new Promise((r) => setTimeout(r, delay))
      // Arrêt anticipé : une tentative précédente a pu réussir pendant le délai.
      if (persisted.value) return
      persistRetryCount.value = attempt
      const ok = await attemptPersistRetry()
      if (!ok) tryNext()
    }

    tryNext()
  }

  // ── Chargement initial ──────────────────────────────────────────────────────
  // À appeler une seule fois depuis la page avec `await load()`.
  // Nuxt suspend le rendu le temps de la résolution (top-level await compatible).
  const load = async () => {
    if (!questionnaireWizardStore.result?.length) return

    try {
      const response = await callApi()
      computedResults.value = response.results
      sessionId.value = response.sessionId
      persisted.value = response.persisted

      if (!response.persisted) {
        console.warn('[results] Firestore persist failed, code:', response.persistErrorCode)
        scheduleRetry()
      }
    } catch (error) {
      computeError.value = error instanceof Error
        ? error.message
        : 'Impossible de calculer les résultats pour le moment.'
    }
  }

  return {
    computedResults,
    sessionId,
    persisted,
    persistRetryCount,
    persistRetryFailed,
    computeError,
    load,
  }
}
