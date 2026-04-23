import { createRequire } from 'node:module'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { syncPaymentConfirmationEmail } = require('../../functions/emailSync.js')

const ORIGINAL_ENV = { ...process.env }

const makePaymentRef = () => ({
  update: vi.fn().mockResolvedValue(undefined),
})

const makeFetchResponse = (id: string) => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ id }),
})

describe('emailSync', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = {
      ...ORIGINAL_ENV,
      NUXT_RESEND_API_KEY: 'resend-key',
      NUXT_MAIL_FROM: 'Relation anxieux-evitant <noreply@relation-anxieux-evitant.fr>',
      NUXT_MAIL_REPLY_TO: 'admin@example.com',
      NUXT_CONTACT_ADMIN_EMAIL: 'admin@example.com',
    }
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => makeFetchResponse('email-user-1'))
      .mockImplementationOnce(() => makeFetchResponse('email-admin-1')))
  })

  it('sends one user confirmation email for a results payment', async () => {
    const paymentRef = makePaymentRef()

    await syncPaymentConfirmationEmail(
      {
        before: { status: 'processing' },
        after: {
          status: 'succeeded',
          amount: 199,
          currency: 'eur',
          customer_email: 'user@example.com',
        },
        uid: 'user-1',
        paymentId: 'payment-1',
        metadata: { accessType: 'results' },
      },
      {
        paymentRef,
        serverTimestamp: 'SERVER_TIMESTAMP',
      },
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('résultats détaillés'),
      }),
    )
    expect(paymentRef.update).toHaveBeenCalledWith({
      appEmailStatus: {
        confirmation: 'sent',
        admin: 'not_required',
        confirmationSentAt: 'SERVER_TIMESTAMP',
        adminSentAt: null,
        confirmationMessageId: 'email-user-1',
        adminMessageId: null,
        lastError: null,
      },
      updatedAt: 'SERVER_TIMESTAMP',
    })
  })

  it('sends user and admin emails for a coaching payment', async () => {
    const paymentRef = makePaymentRef()

    await syncPaymentConfirmationEmail(
      {
        before: { status: 'processing' },
        after: {
          status: 'succeeded',
          amount: 4500,
          currency: 'eur',
          customer_email: 'user@example.com',
        },
        uid: 'user-1',
        paymentId: 'payment-2',
        metadata: {
          accessType: 'coachingZen',
          customerPhone: '0612345678',
        },
      },
      {
        paymentRef,
        serverTimestamp: 'SERVER_TIMESTAMP',
      },
    )

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.resend.com/emails',
      expect.objectContaining({
        body: expect.stringContaining('rdv coaching zen'),
      }),
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.resend.com/emails',
      expect.objectContaining({
        body: expect.stringContaining('0612345678'),
      }),
    )
    expect(paymentRef.update).toHaveBeenCalledWith({
      appEmailStatus: {
        confirmation: 'sent',
        admin: 'sent',
        confirmationSentAt: 'SERVER_TIMESTAMP',
        adminSentAt: 'SERVER_TIMESTAMP',
        confirmationMessageId: 'email-user-1',
        adminMessageId: 'email-admin-1',
        lastError: null,
      },
      updatedAt: 'SERVER_TIMESTAMP',
    })
  })

  it('does not send emails for already handled payments', async () => {
    const paymentRef = makePaymentRef()

    const alreadySucceeded = await syncPaymentConfirmationEmail(
      {
        before: { status: 'succeeded' },
        after: { status: 'succeeded', customer_email: 'user@example.com' },
        uid: 'user-1',
        paymentId: 'payment-3',
        metadata: { accessType: 'results' },
      },
      {
        paymentRef,
        serverTimestamp: 'SERVER_TIMESTAMP',
      },
    )

    const alreadySent = await syncPaymentConfirmationEmail(
      {
        before: { status: 'processing' },
        after: {
          status: 'succeeded',
          customer_email: 'user@example.com',
          appEmailStatus: { confirmation: 'sent' },
        },
        uid: 'user-1',
        paymentId: 'payment-4',
        metadata: { accessType: 'results' },
      },
      {
        paymentRef,
        serverTimestamp: 'SERVER_TIMESTAMP',
      },
    )

    expect(alreadySucceeded).toEqual({ skipped: 'already_succeeded' })
    expect(alreadySent).toEqual({ skipped: 'confirmation_already_sent' })
    expect(fetch).not.toHaveBeenCalled()
    expect(paymentRef.update).not.toHaveBeenCalled()
  })
})
