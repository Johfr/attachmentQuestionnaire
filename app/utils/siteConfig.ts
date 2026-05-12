export type SiteFeatureFlags = {
  resultsPaywallEnabled: boolean
  resultsSharingEnabled: boolean
  contactForm: boolean
}

export type SiteMaintenanceConfig = {
  siteDisabled: boolean
  questionnaireStartDisabled: boolean
  message: string
}

export type SiteConfig = {
  features: SiteFeatureFlags
  maintenance: SiteMaintenanceConfig
  createdAt?: unknown
  updatedAt?: unknown
}

export type SiteConfigPatch = {
  features?: Partial<SiteFeatureFlags>
  maintenance?: Partial<SiteMaintenanceConfig>
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  features: {
    resultsPaywallEnabled: true,
    resultsSharingEnabled: false,
    contactForm: true,
  },
  maintenance: {
    siteDisabled: false,
    questionnaireStartDisabled: false,
    message: '',
  },
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export const normalizeSiteConfig = (value: unknown): SiteConfig => {
  const source = isRecord(value) ? value : {}
  const features = isRecord(source.features) ? source.features : {}
  const maintenance = isRecord(source.maintenance) ? source.maintenance : {}

  return {
    ...DEFAULT_SITE_CONFIG,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    features: {
      resultsPaywallEnabled: typeof features.resultsPaywallEnabled === 'boolean'
        ? features.resultsPaywallEnabled
        : DEFAULT_SITE_CONFIG.features.resultsPaywallEnabled,
      resultsSharingEnabled: typeof features.resultsSharingEnabled === 'boolean'
        ? features.resultsSharingEnabled
        : typeof features.resultsSharing === 'boolean'
          ? features.resultsSharing
          : DEFAULT_SITE_CONFIG.features.resultsSharingEnabled,
      contactForm: typeof features.contactForm === 'boolean'
        ? features.contactForm
        : DEFAULT_SITE_CONFIG.features.contactForm,
    },
    maintenance: {
      siteDisabled: maintenance.siteDisabled === true,
      questionnaireStartDisabled: maintenance.questionnaireStartDisabled === true,
      message: typeof maintenance.message === 'string'
        ? maintenance.message
        : DEFAULT_SITE_CONFIG.maintenance.message,
    },
  }
}

export const mergeSiteConfigPatch = (current: SiteConfig, patch: SiteConfigPatch) => {
  return normalizeSiteConfig({
    ...current,
    ...patch,
    features: {
      ...current.features,
      ...(patch.features ?? {}),
    },
    maintenance: {
      ...current.maintenance,
      ...(patch.maintenance ?? {}),
    },
  })
}
