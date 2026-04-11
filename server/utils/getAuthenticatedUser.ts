import type { H3Event } from 'h3'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { adminAuth } from './firebaseAdmin'

export const getAuthenticatedUser = async (event: H3Event): Promise<DecodedIdToken> => {
  const authorization = getHeader(event, 'authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing Firebase auth token.',
    })
  }

  try {
    return await adminAuth.verifyIdToken(authorization.slice(7))
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid Firebase auth token.',
    })
  }
}
