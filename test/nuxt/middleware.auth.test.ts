/**
 * P0 — Auth middleware
 *
 * Tests the auth.ts route middleware in the Nuxt environment.
 * Verifies that:
 *  - An unauthenticated user reaching a route with requiresAuth:true
 *    is redirected to "/" and the login modal is opened.
 *  - An authenticated user is allowed through without redirect.
 *  - A public route (no requiresAuth) is never redirected regardless of auth.
 *  - initAuth() is always called (Firebase state sync).
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// ── Hoisted mock state ────────────────────────────────────────────────────
// vi.hoisted runs before vi.mock so the values are available inside factories.
const mockAuthStore = vi.hoisted(() => ({
  isLoggedIn: false as boolean,
  initAuth: vi.fn().mockResolvedValue(undefined),
  openLoginModal: vi.fn(),
}))

const navigateToMock = vi.hoisted(() => vi.fn())

// ── Mock Nuxt auto-imports ────────────────────────────────────────────────
mockNuxtImport('navigateTo', () => navigateToMock)

// ── Mock explicit store import ────────────────────────────────────────────
vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

// Import AFTER mocks so hoisted mocks are already applied
import authMiddleware from '../../app/middleware/auth'

// ─────────────────────────────────────────────────────────────────────────

describe('middleware/auth', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    mockAuthStore.initAuth.mockReset().mockResolvedValue(undefined)
    mockAuthStore.openLoginModal.mockReset()
    mockAuthStore.isLoggedIn = false
  })

  it('redirects unauthenticated user to "/" on a protected route', async () => {
    mockAuthStore.isLoggedIn = false
    const to = { meta: { requiresAuth: true }, fullPath: '/user/profil' }
    await authMiddleware(to as any, {} as any)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('opens login modal for unauthenticated user on a protected route', async () => {
    mockAuthStore.isLoggedIn = false
    const to = { meta: { requiresAuth: true }, fullPath: '/user/profil' }
    await authMiddleware(to as any, {} as any)
    expect(mockAuthStore.openLoginModal).toHaveBeenCalledOnce()
  })

  it('does not redirect authenticated user on a protected route', async () => {
    mockAuthStore.isLoggedIn = true
    const to = { meta: { requiresAuth: true }, fullPath: '/user/profil' }
    await authMiddleware(to as any, {} as any)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('does not open login modal for authenticated user', async () => {
    mockAuthStore.isLoggedIn = true
    const to = { meta: { requiresAuth: true }, fullPath: '/user/profil' }
    await authMiddleware(to as any, {} as any)
    expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
  })

  it('does not redirect from a public route even when unauthenticated', async () => {
    mockAuthStore.isLoggedIn = false
    const to = { meta: {}, fullPath: '/' }
    await authMiddleware(to as any, {} as any)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('does not redirect from a public route when authenticated', async () => {
    mockAuthStore.isLoggedIn = true
    const to = { meta: {}, fullPath: '/' }
    await authMiddleware(to as any, {} as any)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('calls initAuth on every navigation', async () => {
    const to = { meta: {}, fullPath: '/' }
    await authMiddleware(to as any, {} as any)
    expect(mockAuthStore.initAuth).toHaveBeenCalledOnce()
  })

  it('calls initAuth even on protected routes before checking auth', async () => {
    mockAuthStore.isLoggedIn = true
    const to = { meta: { requiresAuth: true }, fullPath: '/user/profil' }
    await authMiddleware(to as any, {} as any)
    expect(mockAuthStore.initAuth).toHaveBeenCalledOnce()
  })

  // ── Smoke: critical protected routes ──────────────────────────────────────

  it.each([
    '/user/profil',
    '/attachment-questionnaire/questionnaire',
    '/attachment-questionnaire/results',
    '/user/attachment-questionnaire/results',
  ])('unauthenticated user is redirected away from %s', async (path) => {
    mockAuthStore.isLoggedIn = false
    const to = { meta: { requiresAuth: true }, fullPath: path }
    await authMiddleware(to as any, {} as any)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it.each([
    '/',
    '/questionnaires',
    '/attachment-questionnaire/introduction',
  ])('unauthenticated user can access public route %s', async (path) => {
    mockAuthStore.isLoggedIn = false
    const to = { meta: {}, fullPath: path }
    await authMiddleware(to as any, {} as any)
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
