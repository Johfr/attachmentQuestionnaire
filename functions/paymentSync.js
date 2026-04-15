const PAYMENT_FIELD_MAP = {
  results: 'hasPaidResults',
  ia: 'hasPaidIa',
}

const extractPaymentMetadata = (paymentDoc = {}) => {
  return (
    paymentDoc.metadata
    || paymentDoc.payment_intent?.metadata
    || paymentDoc.paymentIntent?.metadata
    || paymentDoc.checkout_session?.metadata
    || paymentDoc.checkoutSession?.metadata
    || {}
  )
}

const syncPaymentToSession = async ({ before, after, uid, paymentId }, { db, serverTimestamp }) => {
  if (!after) return { skipped: 'deleted' }
  if (after.status !== 'succeeded') return { skipped: 'not_succeeded' }
  if (before?.status === 'succeeded') return { skipped: 'already_succeeded' }

  const metadata = extractPaymentMetadata(after)
  const { docId, accessType } = metadata

  if (!docId || !accessType) {
    console.warn('[onPaymentWritten] Missing docId or accessType in metadata', { uid, paymentId })
    return { skipped: 'missing_metadata' }
  }

  const field = PAYMENT_FIELD_MAP[accessType]
  if (!field) {
    console.info('[onPaymentWritten] accessType not session-tied, skipping', { accessType })
    return { skipped: 'unsupported_access_type' }
  }

  const sessionRef = db.collection('questionnaireSessions').doc(docId)
  const sessionSnap = await sessionRef.get()

  if (!sessionSnap.exists) {
    console.warn('[onPaymentWritten] Session document not found', { docId })
    return { skipped: 'missing_session' }
  }

  const sessionData = sessionSnap.data() || {}
  if (sessionData?.billingInfo?.[field] === true) {
    console.info('[onPaymentWritten] Field already true, skipping', { docId, field })
    return { skipped: 'already_updated' }
  }

  const updatePayload = {
    [`billingInfo.${field}`]: true,
    updatedAt: serverTimestamp,
  }

  if (accessType === 'ia') {
    updatePayload['billingInfo.hasPaidResults'] = true
    updatePayload['aiExchange.unlocked'] = true
    updatePayload['aiExchange.purchasedAt'] = serverTimestamp
    updatePayload['aiExchange.status'] = 'pending'
    updatePayload['aiExchange.lastErrorCode'] = null
    updatePayload['aiExchange.lastErrorMessage'] = null
  }

  await sessionRef.update(updatePayload)
  console.info('[onPaymentWritten] Session updated', { docId, field, uid })
  return { updated: true, docId, field }
}

module.exports = {
  PAYMENT_FIELD_MAP,
  extractPaymentMetadata,
  syncPaymentToSession,
}
