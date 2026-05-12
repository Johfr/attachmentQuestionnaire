import { describe, expect, it } from 'vitest'

import { DEFAULT_SITE_CONFIG, mergeSiteConfigPatch, normalizeSiteConfig } from '../../app/utils/siteConfig'

describe('site config', () => {
  it('keeps the results paywall enabled by default', () => {
    expect(DEFAULT_SITE_CONFIG.features.resultsPaywallEnabled).toBe(true)
    expect(normalizeSiteConfig(undefined).features.resultsPaywallEnabled).toBe(true)
  })

  it('preserves a false paywall flag through normalization', () => {
    const config = normalizeSiteConfig({
      features: {
        resultsPaywallEnabled: false,
      },
    })

    expect(config.features.resultsPaywallEnabled).toBe(false)
  })

  it('merges a paywall patch without dropping the other feature flags', () => {
    const updated = mergeSiteConfigPatch(DEFAULT_SITE_CONFIG, {
      features: {
        resultsPaywallEnabled: false,
      },
    })

    expect(updated.features.resultsPaywallEnabled).toBe(false)
    expect(updated.features.resultsSharingEnabled).toBe(DEFAULT_SITE_CONFIG.features.resultsSharingEnabled)
    expect(updated.features.contactForm).toBe(DEFAULT_SITE_CONFIG.features.contactForm)
  })

  it('keeps backward compatibility with the legacy resultsSharing key', () => {
    const config = normalizeSiteConfig({
      features: {
        resultsSharing: true,
      },
    })

    expect(config.features.resultsSharingEnabled).toBe(true)
  })
})
