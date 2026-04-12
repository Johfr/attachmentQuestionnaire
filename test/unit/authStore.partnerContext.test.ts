import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}))

const firebaseInitMock = vi.hoisted(() => ({
  firebaseClient: {
    auth: {
      currentUser: {
        uid: 'user-123',
        email: 'alex@example.com',
      },
    },
    db: {},
    onAuthStateChanged: vi.fn(),
  },
}))

vi.mock('firebase/firestore', () => ({
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  setDoc: firestoreMocks.setDoc,
  serverTimestamp: firestoreMocks.serverTimestamp,
}))

vi.mock('~/composables/firebase/init.js', () => firebaseInitMock)

vi.mock('~/composables/firebase/Authentification.js', () => ({
  createUserAccountWithEmailAndPassword: vi.fn(),
  signInUserWithEmailAndPassword: vi.fn(),
  signOutUser: vi.fn(),
}))

import { useAuthStore } from '../../app/stores/auth'

describe('useAuthStore partner context persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    firestoreMocks.doc.mockReturnValue('users/user-123')
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        email: 'alex@example.com',
        name: 'Alex',
        age: 31,
        currentPartnerContext: {
          firstName: 'Camille',
          age: 30,
        },
        questionnaireAccess: {
          attachment: {
            lastCompletedAt: { seconds: 1700000000 },
            nextAllowedAt: { seconds: Math.floor(Date.now() / 1000) + (5 * 24 * 60 * 60) },
            cooldownDays: 30,
          },
        },
      }),
    })
  })

  it('keeps existing currentPartnerContext when partner fields are submitted empty', async () => {
    const store = useAuthStore()
    store.currentPartnerContext = {
      firstName: 'Camille',
      age: 30,
    }

    const result = await store.savePartnerContext({
      partnerName: '   ',
      partnerAge: null,
    })

    expect(result).toBe(true)
    expect(firestoreMocks.doc).not.toHaveBeenCalled()
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled()
    expect(store.currentPartnerContext).toEqual({
      firstName: 'Camille',
      age: 30,
    })
  })

  it('computes questionnaire cooldown status from the mirrored user document', async () => {
    const store = useAuthStore()

    await store.loadCurrentPartnerContext()

    const cooldown = store.getQuestionnaireCooldownStatus('attachment')

    expect(cooldown.blocked).toBe(true)
    expect(cooldown.remainingDays).toBeGreaterThan(0)
  })
})
