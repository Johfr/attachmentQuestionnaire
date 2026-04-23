export type ContactMailStatus = {
  admin?: 'pending' | 'sent' | 'failed'
  user?: 'pending' | 'sent' | 'failed'
  adminMessageId?: string | null
  userMessageId?: string | null
  lastError?: string | null
}

export type ContactRequest = {
  id: string
  type: 'contact'
  status: 'new' | string
  uid: string | null
  email: string
  message: string
  mailStatus?: ContactMailStatus
  createdAt?: unknown
  updatedAt?: unknown
}
