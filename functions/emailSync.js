const PAYMENT_CONFIRMATION_ACCESS_TYPES = new Set(['results', 'ebook', 'coachingZen', 'coachingExpress'])
const COACHING_ACCESS_TYPES = new Set(['coachingZen', 'coachingExpress'])

const ACCESS_TYPE_LABELS = {
  results: 'résultats détaillés',
  ebook: 'ebook',
  coachingZen: 'rdv coaching zen',
  coachingExpress: 'rdv coaching express',
}

const escapeHtml = (value = '') => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const formatAmount = (amount = 0, currency = 'eur') => {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'eur',
    }).format(amount / 100)
  } catch {
    return `${amount / 100} ${currency || 'eur'}`
  }
}

const sendEmail = async (payload, config) => {
  if (!config.resendApiKey || !config.mailFrom) {
    throw new Error('Missing Resend mail configuration.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.mailFrom,
      ...payload,
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || `Resend request failed with status ${response.status}`)
  }

  return data?.id || null
}

const getPaymentCustomerEmail = (paymentDoc = {}, metadata = {}) => {
  return metadata.customerEmail
    || paymentDoc.customer_email
    || paymentDoc.customerEmail
    || paymentDoc.billing_details?.email
    || paymentDoc.charges?.data?.[0]?.billing_details?.email
    || null
}

const getEmailConfig = () => ({
  resendApiKey: process.env.NUXT_RESEND_API_KEY || '',
  mailFrom: process.env.NUXT_MAIL_FROM || 'Relation anxieux-evitant <onboarding@resend.dev>',
  mailReplyTo: process.env.NUXT_MAIL_REPLY_TO || '',
  contactAdminEmail: process.env.NUXT_CONTACT_ADMIN_EMAIL || '',
})

const syncPaymentConfirmationEmail = async ({ before, after, uid, paymentId, metadata }, { paymentRef, serverTimestamp }) => {
  if (!after) return { skipped: 'deleted' }
  if (after.status !== 'succeeded') return { skipped: 'not_succeeded' }
  if (before?.status === 'succeeded') return { skipped: 'already_succeeded' }
  if (after.appEmailStatus?.confirmation === 'sent') return { skipped: 'confirmation_already_sent' }

  const accessType = metadata.accessType
  if (!PAYMENT_CONFIRMATION_ACCESS_TYPES.has(accessType)) {
    return { skipped: 'unsupported_access_type' }
  }

  const email = getPaymentCustomerEmail(after, metadata)
  if (!email) {
    await paymentRef.update({
      'appEmailStatus.confirmation': 'failed',
      'appEmailStatus.admin': COACHING_ACCESS_TYPES.has(accessType) ? 'failed' : 'not_required',
      'appEmailStatus.lastError': 'Missing customer email.',
      updatedAt: serverTimestamp,
    })
    return { skipped: 'missing_email' }
  }

  const config = getEmailConfig()
  const amount = formatAmount(after.amount ?? 0, after.currency ?? 'eur')
  const label = ACCESS_TYPE_LABELS[accessType] || accessType

  try {
    const confirmationMessageId = await sendEmail({
      to: [email],
      ...(config.mailReplyTo ? { reply_to: [config.mailReplyTo] } : {}),
      subject: 'Paiement bien pris en compte',
      html: `
        <p>Bonjour,</p>
        <p>Ton paiement de ${escapeHtml(amount)} pour ${escapeHtml(label)} a bien été pris en compte.</p>
        <p>Tu peux retrouver toutes tes infos de paiement directement dans ton profil sur <a href="https://relation-anxieux-evitant.web.app/user/profil">relation-anxieux-evitant.web.app/user/profil</a>.</p>
      `,
    }, config)

    let adminMessageId = null
    let adminStatus = 'not_required'

    if (COACHING_ACCESS_TYPES.has(accessType)) {
      if (!config.contactAdminEmail) {
        throw new Error('Missing admin email configuration.')
      }

      adminMessageId = await sendEmail({
        to: [config.contactAdminEmail],
        ...(config.mailReplyTo ? { reply_to: [config.mailReplyTo] } : {}),
        subject: `Nouvelle séance réservée - ${label}`,
        html: `
          <p><strong>Type :</strong> ${escapeHtml(label)}</p>
          <p><strong>Montant :</strong> ${escapeHtml(amount)}</p>
          <p><strong>Email :</strong> ${escapeHtml(email)}</p>
          <p><strong>Téléphone :</strong> ${escapeHtml(metadata.customerPhone || 'Non renseigné')}</p>
          <p><strong>UID :</strong> ${escapeHtml(uid || 'Non renseigné')}</p>
          <p><strong>Payment ID :</strong> ${escapeHtml(paymentId)}</p>
        `,
      }, config)
      adminStatus = 'sent'
    }

    await paymentRef.update({
      appEmailStatus: {
        confirmation: 'sent',
        admin: adminStatus,
        confirmationSentAt: serverTimestamp,
        adminSentAt: adminStatus === 'sent' ? serverTimestamp : null,
        confirmationMessageId,
        adminMessageId,
        lastError: null,
      },
      updatedAt: serverTimestamp,
    })

    return { sent: true, confirmationMessageId, adminMessageId }
  } catch (error) {
    await paymentRef.update({
      appEmailStatus: {
        confirmation: 'failed',
        admin: COACHING_ACCESS_TYPES.has(accessType) ? 'failed' : 'not_required',
        confirmationSentAt: null,
        adminSentAt: null,
        confirmationMessageId: null,
        adminMessageId: null,
        lastError: error instanceof Error ? error.message : 'Unknown email error.',
      },
      updatedAt: serverTimestamp,
    })

    console.error('[emailSync] Payment email failed', { uid, paymentId, accessType, error })
    return { failed: true }
  }
}

module.exports = {
  syncPaymentConfirmationEmail,
}
