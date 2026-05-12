import type { SiteConfigPatch } from '../../../app/utils/siteConfig'
import { assertAdminUser } from '../../utils/assertAdminUser'
import { saveAppConfig } from '../../utils/siteConfig'

type UpdateSiteConfigBody = SiteConfigPatch

export default defineEventHandler(async event => {
  await assertAdminUser(event)

  const body = await readBody<UpdateSiteConfigBody>(event)
  const features = body?.features ?? {}
  const maintenance = body?.maintenance ?? {}

  return await saveAppConfig({
    features: {
      ...(typeof features.resultsPaywallEnabled === 'boolean' ? { resultsPaywallEnabled: features.resultsPaywallEnabled } : {}),
      ...(typeof features.resultsSharingEnabled === 'boolean' ? { resultsSharingEnabled: features.resultsSharingEnabled } : {}),
      ...(typeof features.resultsSharing === 'boolean' ? { resultsSharingEnabled: features.resultsSharing } : {}),
      ...(typeof features.contactForm === 'boolean' ? { contactForm: features.contactForm } : {}),
    },
    maintenance: {
      ...(typeof maintenance.siteDisabled === 'boolean' ? { siteDisabled: maintenance.siteDisabled } : {}),
      ...(typeof maintenance.questionnaireStartDisabled === 'boolean' ? { questionnaireStartDisabled: maintenance.questionnaireStartDisabled } : {}),
      ...(typeof maintenance.message === 'string' ? { message: maintenance.message } : {}),
    },
  })
})
