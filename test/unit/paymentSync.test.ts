import { createRequire } from 'node:module'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { extractPaymentMetadata, syncPaymentToSession } = require('../../functions/paymentSync.js')

describe('paymentSync', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts metadata from nested payment_intent metadata', () => {
    const metadata = extractPaymentMetadata({
      payment_intent: {
        metadata: {
          docId: 'session-1',
          accessType: 'results',
        },
      },
    })

    expect(metadata).toEqual({
      docId: 'session-1',
      accessType: 'results',
    })
  })

  it('updates the linked session when a results payment succeeds', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const get = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        billingInfo: {
          hasPaidResults: false,
        },
      }),
    })

    const db = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get,
          update,
        })),
      })),
    }

    await syncPaymentToSession(
      {
        before: { status: 'processing' },
        after: {
          status: 'succeeded',
          payment_intent: {
            metadata: {
              docId: 'session-1',
              accessType: 'results',
            },
          },
        },
        uid: 'user-1',
        paymentId: 'payment-1',
      },
      {
        db,
        serverTimestamp: 'SERVER_TIMESTAMP',
      },
    )

    expect(update).toHaveBeenCalledWith({
      'billingInfo.hasPaidResults': true,
      updatedAt: 'SERVER_TIMESTAMP',
    })
  })
})
