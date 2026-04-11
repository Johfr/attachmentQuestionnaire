import type { H3Event } from 'h3'
import { getAuthenticatedUser } from './getAuthenticatedUser'

export const getAuthenticatedUid = async (event: H3Event) => {
  const decoded = await getAuthenticatedUser(event)
  return decoded.uid
}
