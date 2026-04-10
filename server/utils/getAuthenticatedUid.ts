import type { H3Event } from 'h3'
import { adminAuth } from './firebaseAdmin'

export const getAuthenticatedUid = async (event: H3Event) => {
  const authorization = getHeader(event, 'authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing Firebase auth token.',
    })
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authorization.slice(7))
    return decoded.uid
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid Firebase auth token.',
    })
  }
}
