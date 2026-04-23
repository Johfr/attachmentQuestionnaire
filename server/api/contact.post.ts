import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { adminAuth, adminDb } from '../utils/firebaseAdmin'

type ContactRequestBody = {
  email?: string
  message?: string
  website?: string
}

type ResendEmailPayload = {
  from: string
  to: string[]
  subject: string
  html: string
}

const MIN_MESSAGE_LENGTH = 10
const MAX_MESSAGE_LENGTH = 3000

const isEmailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const escapeHtml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const normalizeText = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : ''
}

const normalizeEnvValue = (value: unknown) => {
  const normalized = normalizeText(value)
  if (
    (normalized.startsWith('"') && normalized.endsWith('"'))
    || (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    return normalized.slice(1, -1)
  }

  return normalized
}

const getClientIp = (event: H3Event) => {
  const forwardedFor = getHeader(event, 'x-forwarded-for') || ''
  return forwardedFor.split(',')[0]?.trim()
    || getHeader(event, 'x-real-ip')
    || 'unknown'
}

const hashValue = (value: string) => createHash('sha256').update(value).digest('hex')

const verifyOptionalUser = async (event: H3Event) => {
  const authorization = getHeader(event, 'authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  try {
    return await adminAuth.verifyIdToken(authorization.slice(7))
  } catch {
    return null
  }
}

const checkRateLimit = async (key: string, maxAttempts: number, windowMs: number) => {
  if (windowMs <= 0 || maxAttempts <= 0) {
    return true
  }

  const now = Date.now()
  const ref = adminDb.collection('contactRateLimits').doc(key)

  return adminDb.runTransaction(async transaction => {
    const snap = await transaction.get(ref)
    const data = snap.data()
    const windowStartedAt = data?.windowStartedAt as Timestamp | undefined
    const count = typeof data?.count === 'number' ? data.count : 0
    const windowStartMs = windowStartedAt?.toMillis?.() ?? 0
    const isSameWindow = now - windowStartMs < windowMs

    if (isSameWindow && count >= maxAttempts) {
      return false
    }

    transaction.set(ref, {
      count: isSameWindow ? count + 1 : 1,
      windowStartedAt: isSameWindow && windowStartedAt ? windowStartedAt : Timestamp.fromMillis(now),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    return true
  })
}

const sendEmail = async (apiKey: string, payload: ResendEmailPayload) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null) as { id?: string; message?: string } | null

  if (!response.ok) {
    throw new Error(data?.message || `Resend request failed with status ${response.status}`)
  }

  return data?.id || null
}

export default defineEventHandler(async event => {
  const body = await readBody<ContactRequestBody>(event)
  const honeypot = normalizeText(body.website)

  if (honeypot) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid contact request.' })
  }

  const message = normalizeText(body.message)
  if (message.length < MIN_MESSAGE_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: 'Ton message est trop court.' })
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: 'Ton message est trop long.' })
  }

  const decodedUser = await verifyOptionalUser(event)
  const uid = decodedUser?.uid ?? null
  const userSnap = uid ? await adminDb.collection('users').doc(uid).get() : null
  const userData = userSnap?.data() ?? null
  const email = uid
    ? normalizeText(userData?.email || decodedUser?.email)
    : normalizeText(body.email)

  if (!email || !isEmailValid(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Renseigne une adresse email valide.' })
  }

  const clientIp = getClientIp(event)
  const ipHash = hashValue(clientIp)
  const rateLimitKey = uid ? `uid_${uid}` : `ip_${ipHash}`
  const config = useRuntimeConfig(event)
  const rateLimitMax = Number(config.contactRateLimitMax || 3)
  const rateLimitWindowMs = Number(config.contactRateLimitWindowMs || 30 * 60 * 1000)
  const canSend = await checkRateLimit(rateLimitKey, rateLimitMax, rateLimitWindowMs)

  if (!canSend) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de messages envoyés en peu de temps. Réessaie un peu plus tard.',
    })
  }

  const contactRef = adminDb.collection('contactRequests').doc()
  const userSnapshot = uid
    ? {
        email,
        name: normalizeText(userData?.name),
        phone: normalizeText(userData?.phone),
        gender: normalizeText(userData?.gender),
        age: typeof userData?.age === 'number' ? userData.age : null,
      }
    : null

  await contactRef.set({
    type: 'contact',
    status: 'new',
    uid,
    email,
    message,
    userSnapshot,
    antiSpam: {
      ipHash,
      honeypotFilled: false,
      rateLimitKey,
      userAgent: getHeader(event, 'user-agent') || null,
    },
    mailStatus: {
      admin: 'pending',
      user: 'pending',
      adminMessageId: null,
      userMessageId: null,
      lastError: null,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const resendApiKey = normalizeEnvValue(config.resendApiKey)
  const mailFrom = normalizeEnvValue(config.mailFrom)
  const contactAdminEmail = normalizeEnvValue(config.contactAdminEmail)

  if (!resendApiKey || !mailFrom || !contactAdminEmail) {
    await contactRef.update({
      mailStatus: {
        admin: 'failed',
        user: 'failed',
        adminMessageId: null,
        userMessageId: null,
        lastError: 'Missing mail configuration.',
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    throw createError({ statusCode: 500, statusMessage: 'Configuration email manquante.' })
  }

  try {
    const safeMessage = escapeHtml(message).replaceAll('\n', '<br>')
    const userName = userSnapshot?.name || ''
    const greeting = userName ? `Bonjour ${escapeHtml(userName)},` : 'Bonjour,'
    const adminSubject = userName ? `Nouveau message de ${userName}` : 'Nouveau message de contact'

    const adminMessageId = await sendEmail(resendApiKey, {
      from: mailFrom,
      to: [contactAdminEmail],
      subject: adminSubject,
      html: `
        <p><strong>Email :</strong> ${escapeHtml(email)}</p>
        <p><strong>UID :</strong> ${uid ? escapeHtml(uid) : 'Utilisateur non connecté'}</p>
        <p><strong>Nom :</strong> ${escapeHtml(userSnapshot?.name || 'Non renseigné')}</p>
        <p><strong>Téléphone :</strong> ${escapeHtml(userSnapshot?.phone || 'Non renseigné')}</p>
        <hr>
        <p>${safeMessage}</p>
      `,
    })

    const userMessageId = await sendEmail(resendApiKey, {
      from: mailFrom,
      to: [email],
      subject: 'Message bien reçu',
      html: `
        <p>${greeting}</p>
        <p>Ton message a bien été reçu. Tu recevras un retour écrit dans un délai de 48h maximum.</p>
        <p>Tu peux retrouver toutes les informations directement sur ton profil à l'adresse : <a href="https://relation-anxieux-evitant.web.app/user/profil">relation-anxieux-evitant.web.app/user/profil</a></p>
      `,
    })

    await contactRef.update({
      mailStatus: {
        admin: 'sent',
        user: 'sent',
        adminMessageId,
        userMessageId,
        lastError: null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { success: true, id: contactRef.id }
  } catch (error) {
    await contactRef.update({
      mailStatus: {
        admin: 'failed',
        user: 'failed',
        adminMessageId: null,
        userMessageId: null,
        lastError: error instanceof Error ? error.message : 'Unknown email error.',
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    throw createError({ statusCode: 500, statusMessage: 'Message enregistré, mais email non envoyé.' })
  }
})
