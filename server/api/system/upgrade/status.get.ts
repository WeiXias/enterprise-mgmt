import { defineEventHandler } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { getUpgradeStatus } from '#server-utils/upgrade-state'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:upgrade')
  return { code: 0, data: getUpgradeStatus() }
})
