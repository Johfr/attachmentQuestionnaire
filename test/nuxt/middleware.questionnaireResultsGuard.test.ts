/**
 * P0 — questionnaire-results-guard middleware
 *
 * Tests the questionnaire-results-guard.ts route middleware.
 * Verifies that a user cannot access the /results page unless
 * the wizard store marks the questionnaire as completed with a non-null result.
 *
 * Guard logic:
 *   if (!isCompleted || !result) navigateTo('/')
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// ── Hoisted mock state ────────────────────────────────────────────────────
const mockWizardStore = vi.hoisted(() => ({
  isCompleted: false as boolean,
  result: null as unknown[] | null,
}))

const navigateToMock = vi.hoisted(() => vi.fn())

// ── Mock Nuxt auto-imports ────────────────────────────────────────────────
mockNuxtImport('navigateTo', () => navigateToMock)

// ── Mock explicit store import ────────────────────────────────────────────
vi.mock('~/stores/attachmentQuestionnaireWizard', () => ({
  useAttachmentQuestionnaireWizardStore: vi.fn(() => mockWizardStore),
}))

import resultsGuard from '../../app/middleware/questionnaire-results-guard'

// ─────────────────────────────────────────────────────────────────────────

const DUMMY_ROUTE = {} as any

describe('middleware/questionnaire-results-guard', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    mockWizardStore.isCompleted = false
    mockWizardStore.result = null
  })

  // ── Guard blocks ──────────────────────────────────────────────────────────

  it('redirects to "/" when isCompleted=false and result=null (initial state)', async () => {
    mockWizardStore.isCompleted = false
    mockWizardStore.result = null
    await resultsGuard(DUMMY_ROUTE, DUMMY_ROUTE)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('redirects to "/" when isCompleted=true but result=null', async () => {
    mockWizardStore.isCompleted = true
    mockWizardStore.result = null
    await resultsGuard(DUMMY_ROUTE, DUMMY_ROUTE)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('redirects to "/" when isCompleted=false but result is set', async () => {
    mockWizardStore.isCompleted = false
    mockWizardStore.result = [{ id: 1, dimension: 'anxiety', value: 3, tags: [] }]
    await resultsGuard(DUMMY_ROUTE, DUMMY_ROUTE)
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  // ── Guard passes ──────────────────────────────────────────────────────────

  it('does not redirect when isCompleted=true AND result is not null', async () => {
    mockWizardStore.isCompleted = true
    mockWizardStore.result = [{ id: 1, dimension: 'anxiety', value: 3, tags: [] }]
    await resultsGuard(DUMMY_ROUTE, DUMMY_ROUTE)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('does not redirect when result has multiple entries', async () => {
    mockWizardStore.isCompleted = true
    mockWizardStore.result = [
      { id: 1, dimension: 'anxiety', value: 4, tags: ['fearOfLoss'] },
      { id: 2, dimension: 'avoidance', value: 2, tags: ['proximityDiscomfort'] },
    ]
    await resultsGuard(DUMMY_ROUTE, DUMMY_ROUTE)
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
