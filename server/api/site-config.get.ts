import { readSiteConfig } from '../utils/siteConfig'

export default defineEventHandler(async () => {
  return await readSiteConfig()
})
