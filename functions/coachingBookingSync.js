const { extractPaymentMetadata } = require('./paymentSync')

const COACHING_ACCESS_TYPES = new Set(['coachingZen', 'coachingExpress'])

const syncPaymentToCoachingBooking = async ({ before, after, uid, paymentId }, { db, serverTimestamp }) => {
  if (!after) return { skipped: 'deleted' }
  if (after.status !== 'succeeded') return { skipped: 'not_succeeded' }
  if (before?.status === 'succeeded') return { skipped: 'already_succeeded' }

  const metadata = extractPaymentMetadata(after)
  const { accessType, entitySubType, customerEmail, customerPhone } = metadata

  if (!COACHING_ACCESS_TYPES.has(accessType)) {
    return { skipped: 'not_coaching_payment' }
  }

  const bookingRef = db.collection('coachingBookings').doc(paymentId)
  const bookingSnap = await bookingRef.get()

  if (bookingSnap.exists) {
    console.info('[onCoachingPaymentWritten] Booking already exists, skipping', { uid, paymentId })
    return { skipped: 'already_created' }
  }

  const payload = {
    uid,
    paymentId,
    accessType,
    entityType: metadata.entityType || 'coaching',
    entitySubType: entitySubType || null,
    customerEmail: customerEmail || null,
    customerPhone: customerPhone || null,
    amount: after.amount ?? 0,
    currency: after.currency ?? 'eur',
    paymentStatus: after.status,
    bookingStatus: 'pending',
    scheduledAt: null,
    notes: null,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  }

  await bookingRef.set(payload)
  console.info('[onCoachingPaymentWritten] Booking created', { uid, paymentId, accessType })
  return { created: true, paymentId, accessType }
}

module.exports = {
  COACHING_ACCESS_TYPES,
  syncPaymentToCoachingBooking,
}
