/**
 * validateAttachmentResults / validateQuestionsMatchCanonical
 *
 * Validation centralisée des données d'entrée du questionnaire d'attachement.
 *
 * Ces deux fonctions constituent la frontière de confiance : aucune donnée
 * issue du client ne doit atteindre l'algorithme de calcul sans être passée
 * par ce filtre.
 *
 * ── Pourquoi une validation explicite ici ? ──────────────────────────────────
 * L'endpoint /api/attachment/results reçoit results ET questions depuis le
 * client. Un payload malveillant peut :
 *   - supprimer des questions pour biaiser les scores moyens
 *   - dupliquer des réponses pour gonfler artificiellement un score
 *   - falsifier dimension ou tags pour faire correspondre un profil ciblé
 *   - envoyer des valeurs hors plage (NaN, négatif, > 4) et provoquer un état
 *     incohérent persisté en Firestore
 *
 * La validation compare toujours les données client aux questions canoniques
 * chargées côté serveur. Elle ne fait confiance à aucun champ du payload.
 *
 * ── Utilisation ──────────────────────────────────────────────────────────────
 * ```ts
 * // Dans l'endpoint (avec createError pour HTTP 400) :
 * try {
 *   validateQuestionsMatchCanonical(body.questions, CANONICAL_QUESTIONS)
 *   validateAttachmentResults(body.results, CANONICAL_QUESTIONS)
 * } catch (err) {
 *   throw createError({ statusCode: 400, statusMessage: err.message })
 * }
 *
 * // Dans computeAttachmentQuestionnaireResults (filet de sécurité) :
 * validateAttachmentResults(results, questions) // lance ErrorAttachmentValidation
 * ```
 */

import type { AttachmentQuestion, QuestionResult } from '../../../app/types/attachmentQuestionnaireResults'

/**
 * Erreur typée pour distinguer les erreurs de validation métier des erreurs
 * runtime. Permet à l'endpoint de la catcher et de la convertir en HTTP 400
 * sans masquer d'autres exceptions inattendues.
 */
export class AttachmentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AttachmentValidationError'
  }
}

/**
 * Valide les réponses du questionnaire contre la liste canonique des questions.
 *
 * Vérifie :
 *  - aucun id en double
 *  - toutes les questions canoniques ont une réponse (exhaustivité)
 *  - aucun id inconnu (pas de questions injectées)
 *  - valeur dans [0, 4] et finie (pas de NaN, négatif, > 4)
 *  - dimension conforme à la question canonique
 *  - tags identiques à la question canonique (ordre indifférent)
 *
 * @throws {AttachmentValidationError}
 */
export function validateAttachmentResults(
  results: QuestionResult[],
  canonicalQuestions: AttachmentQuestion[],
): void {
  // ── Doublons ──────────────────────────────────────────────────────────────
  const ids = results.map((r) => r.id)
  const uniqueIds = new Set(ids)
  if (uniqueIds.size !== ids.length) {
    throw new AttachmentValidationError('Duplicate question ids in results')
  }

  const canonicalMap = new Map(canonicalQuestions.map((q) => [q.id, q]))

  // ── Exhaustivité ─────────────────────────────────────────────────────────
  for (const [id] of canonicalMap) {
    if (!uniqueIds.has(id)) {
      throw new AttachmentValidationError(`Missing answer for question id ${id}`)
    }
  }

  // ── Ids inconnus ─────────────────────────────────────────────────────────
  for (const id of uniqueIds) {
    if (!canonicalMap.has(id)) {
      throw new AttachmentValidationError(`Unknown question id ${id}`)
    }
  }

  // ── Vérifications par réponse ─────────────────────────────────────────────
  for (const result of results) {
    const question = canonicalMap.get(result.id)!

    // Valeur dans [0, 4]
    if (!Number.isFinite(result.value) || result.value < 0 || result.value > 4) {
      throw new AttachmentValidationError(
        `Value ${result.value} is out of range [0–4] for question ${result.id}`,
      )
    }

    // Dimension conforme
    if (result.dimension !== question.dimension) {
      throw new AttachmentValidationError(
        `Dimension mismatch for question ${result.id}: expected "${question.dimension}", got "${result.dimension}"`,
      )
    }

    // Tags identiques (comparaison insensible à l'ordre)
    const canonicalTagsSorted = [...question.tags].sort()
    const resultTagsSorted = [...result.tags].sort()
    if (
      canonicalTagsSorted.length !== resultTagsSorted.length
      || canonicalTagsSorted.some((t, i) => t !== resultTagsSorted[i])
    ) {
      throw new AttachmentValidationError(`Tags mismatch for question ${result.id}`)
    }
  }
}

/**
 * Valide que les questions fournies par le client correspondent exactement
 * à la liste canonique serveur (id → dimension + tags).
 *
 * Rejette toute tentative de falsification de la liste de questions qui
 * permettrait de faire correspondre un profil ciblé en modifiant les règles
 * de tagging côté client.
 *
 * @throws {AttachmentValidationError}
 */
export function validateQuestionsMatchCanonical(
  clientQuestions: AttachmentQuestion[],
  canonicalQuestions: AttachmentQuestion[],
): void {
  if (clientQuestions.length !== canonicalQuestions.length) {
    throw new AttachmentValidationError(
      `Question list length mismatch: expected ${canonicalQuestions.length}, got ${clientQuestions.length}`,
    )
  }

  const clientMap = new Map(clientQuestions.map((q) => [q.id, q]))

  for (const canonical of canonicalQuestions) {
    const client = clientMap.get(canonical.id)
    if (!client) {
      throw new AttachmentValidationError(`Client questions missing id ${canonical.id}`)
    }

    if (client.dimension !== canonical.dimension) {
      throw new AttachmentValidationError(
        `Dimension mismatch in questions for id ${canonical.id}`,
      )
    }

    const clientTagsSorted = [...client.tags].sort()
    const canonicalTagsSorted = [...canonical.tags].sort()
    if (
      clientTagsSorted.length !== canonicalTagsSorted.length
      || clientTagsSorted.some((t, i) => t !== canonicalTagsSorted[i])
    ) {
      throw new AttachmentValidationError(`Tags mismatch in questions for id ${canonical.id}`)
    }
  }
}
