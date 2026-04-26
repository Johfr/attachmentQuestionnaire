import type { H3Event } from 'h3'
import { adminDb } from './firebaseAdmin'
import { getAuthenticatedUser } from './getAuthenticatedUser'

export const assertAdminUser = async (event: H3Event) => {
  const authenticatedUser = await getAuthenticatedUser(event)

  if (authenticatedUser.admin === true) {
    return authenticatedUser
  }

  const userSnap = await adminDb.collection('users').doc(authenticatedUser.uid).get()
  if (userSnap.exists && userSnap.data()?.admin === true) {
    return authenticatedUser
  }

  throw createError({
    statusCode: 403,
    statusMessage: 'Action réservée à l’administration.',
  })
}
