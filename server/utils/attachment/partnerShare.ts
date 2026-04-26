import type { H3Event } from 'h3'
import type { Firestore } from 'firebase-admin/firestore'

type ResendEmailPayload = {
  from: string
  to: string[]
  subject: string
  html: string
}

export const normalizeText = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : ''
}

export const normalizeEnvValue = (value: unknown) => {
  const normalized = normalizeText(value)
  if (
    (normalized.startsWith('"') && normalized.endsWith('"'))
    || (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    return normalized.slice(1, -1)
  }

  return normalized
}

export const isEmailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const escapeHtml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export const sendEmail = async (apiKey: string, payload: ResendEmailPayload) => {
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

export const getBaseUrl = (event: H3Event) => {
  const host = getHeader(event, 'x-forwarded-host')
    || getHeader(event, 'host')
    || 'relation-anxieux-evitant.web.app'
  const protocol = getHeader(event, 'x-forwarded-proto') || 'https'

  return `${protocol}://${host}`
}

export const getLatestAttachmentSessionForUid = async (adminDb: Firestore, uid: string) => {
  const snapshot = await adminDb
    .collection('questionnaireSessions')
    .where('uid', '==', uid)
    .where('questionnaireType', '==', 'attachment')
    .where('status', '==', 'completed')
    .get()

  const sessions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<Record<string, unknown> & { id: string }>

  return sessions.sort((a, b) => {
    const getTime = (value: unknown) => {
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

    const timeA = getTime(a.completedAt) || getTime(a.updatedAt) || getTime(a.createdAt)
    const timeB = getTime(b.completedAt) || getTime(b.updatedAt) || getTime(b.createdAt)
    return timeB - timeA
  })[0] ?? null
}
