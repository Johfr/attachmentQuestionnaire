const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

initializeApp()

const db = getFirestore()

/**
 * Maps accessType (from checkout metadata) to the billingInfo field in QuestionnaireSession.
 * Only one-time purchases (results, ia) are linked to a specific session via docId.
 * Membership / formation are handled by onSubscriptionWritten.
 */
const PAYMENT_FIELD_MAP = {
  results: 'hasPaidResults',
  ia: 'hasPaidIa',
}

/**
 * onPaymentWritten
 *
 * Triggered when a payment document is created or updated in customers/{uid}/payments/{paymentId}.
 * The Stripe Firebase Extension writes here when a PaymentIntent is updated.
 *
 * When status becomes 'succeeded':
 *   - reads metadata.docId (= questionnaireSessions/{sessionId}) and metadata.accessType
 *   - sets billingInfo.hasPaidResults or billingInfo.hasPaidIa to true on the linked session
 *   - for IA purchases, also unlocks detailed results on that same session
 *     and marks aiExchange as pending
 *
 * Idempotent: skips if the target field is already true.
 *
 * Requires: billing.ts goToCheckout() must include payment_intent_data.metadata so that
 * the metadata propagates from the Stripe Checkout Session to the PaymentIntent document.
 */
exports.onPaymentWritten = onDocumentWritten(
  { document: 'customers/{uid}/payments/{paymentId}' },
  async (event) => {
    const before = event.data?.before?.data()
    const after = event.data?.after?.data()

    if (!after) return // document deleted, nothing to do
    if (after.status !== 'succeeded') return
    if (before?.status === 'succeeded') return // already processed, skip

    const metadata = after.metadata ?? {}
    const { docId, accessType } = metadata

    if (!docId || !accessType) {
      console.warn('[onPaymentWritten] Missing docId or accessType in metadata', {
        uid: event.params.uid,
        paymentId: event.params.paymentId,
      })
      return
    }

    const field = PAYMENT_FIELD_MAP[accessType]
    if (!field) {
      // membership / formation are subscriptions — handled by onSubscriptionWritten
      console.info('[onPaymentWritten] accessType not session-tied, skipping', { accessType })
      return
    }

    const sessionRef = db.collection('questionnaireSessions').doc(docId)
    const sessionSnap = await sessionRef.get()

    if (!sessionSnap.exists) {
      console.warn('[onPaymentWritten] Session document not found', { docId })
      return
    }

    const sessionData = sessionSnap.data() || {}

    // Idempotence guard
    if (sessionData?.billingInfo?.[field] === true) {
      console.info('[onPaymentWritten] Field already true, skipping', { docId, field })
      return
    }

    const updatePayload = {
      [`billingInfo.${field}`]: true,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (accessType === 'ia') {
      updatePayload['billingInfo.hasPaidResults'] = true
      updatePayload['aiExchange.unlocked'] = true
      updatePayload['aiExchange.purchasedAt'] = FieldValue.serverTimestamp()
      updatePayload['aiExchange.status'] = 'pending'
    }

    await sessionRef.update(updatePayload)

    console.info('[onPaymentWritten] Session updated', { docId, field, uid: event.params.uid })
  },
)

/**
 * onSubscriptionWritten
 *
 * Triggered when a subscription document is created or updated in customers/{uid}/subscriptions/{subscriptionId}.
 * The Stripe Firebase Extension writes here on subscription status changes.
 *
 * Propagates hasPaidMembership to ALL questionnaireSessions for this user:
 *   - active / trialing  → hasPaidMembership = true
 *   - any other status   → hasPaidMembership = false  (canceled, past_due, unpaid, etc.)
 *
 * Skips if the status did not change between before and after.
 * Idempotent: skips individual session documents already at the correct value.
 */
exports.onSubscriptionWritten = onDocumentWritten(
  { document: 'customers/{uid}/subscriptions/{subscriptionId}' },
  async (event) => {
    const before = event.data?.before?.data()
    const after = event.data?.after?.data()

    const statusBefore = before?.status ?? null
    const statusAfter = after?.status ?? null

    // No status change — nothing to propagate
    if (statusBefore === statusAfter) return

    const uid = event.params.uid
    const ACTIVE_STATUSES = new Set(['active', 'trialing'])
    const hasMembership = ACTIVE_STATUSES.has(statusAfter)

    const sessionsSnap = await db
      .collection('questionnaireSessions')
      .where('uid', '==', uid)
      .get()

    if (sessionsSnap.empty) {
      console.info('[onSubscriptionWritten] No sessions found for user', { uid })
      return
    }

    const batch = db.batch()
    let updatedCount = 0

    for (const doc of sessionsSnap.docs) {
      const current = doc.data()?.billingInfo?.hasPaidMembership
      if (current === hasMembership) continue // already correct

      batch.update(doc.ref, {
        'billingInfo.hasPaidMembership': hasMembership,
        updatedAt: FieldValue.serverTimestamp(),
      })
      updatedCount++
    }

    if (updatedCount === 0) {
      console.info('[onSubscriptionWritten] All sessions already up-to-date', { uid, hasMembership })
      return
    }

    await batch.commit()
    console.info('[onSubscriptionWritten] Sessions updated', { uid, hasMembership, updatedCount })
  },
)
