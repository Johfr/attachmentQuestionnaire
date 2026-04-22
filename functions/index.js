const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { syncPaymentToSession } = require('./paymentSync')
const { syncPaymentToCoachingBooking } = require('./coachingBookingSync')

initializeApp()

const db = getFirestore()

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
    await syncPaymentToSession(
      {
        before: event.data?.before?.data(),
        after: event.data?.after?.data(),
        uid: event.params.uid,
        paymentId: event.params.paymentId,
      },
      {
        db,
        serverTimestamp: FieldValue.serverTimestamp(),
      },
    )
  },
)

/**
 * onCoachingBookingPaymentWritten
 *
 * Triggered when a payment document is created or updated in customers/{uid}/payments/{paymentId}.
 * When a coaching payment becomes 'succeeded', creates a dedicated métier document in
 * coachingBookings/{paymentId} so the future admin can manage booking validation / scheduling
 * without depending on Stripe extension documents as the primary working surface.
 *
 * Idempotent:
 *   - skips if the payment was already succeeded before
 *   - skips if coachingBookings/{paymentId} already exists
 */
exports.onCoachingBookingPaymentWritten = onDocumentWritten(
  { document: 'customers/{uid}/payments/{paymentId}' },
  async (event) => {
    await syncPaymentToCoachingBooking(
      {
        before: event.data?.before?.data(),
        after: event.data?.after?.data(),
        uid: event.params.uid,
        paymentId: event.params.paymentId,
      },
      {
        db,
        serverTimestamp: FieldValue.serverTimestamp(),
      },
    )
  },
)

/**
 * onSubscriptionWritten
 *
 * Triggered when a subscription document is created or updated in customers/{uid}/subscriptions/{subscriptionId}.
 * The Stripe Firebase Extension writes here on subscription status changes.
 *
 * Propagates hasPaidMembership to ALL questionnaireSessions for this user:
 *   - active / trialing  -> hasPaidMembership = true
 *   - any other status   -> hasPaidMembership = false  (canceled, past_due, unpaid, etc.)
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
      if (current === hasMembership) continue

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
