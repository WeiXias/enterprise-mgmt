import { defineEventHandler } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema/system'

export default defineEventHandler(async (event) => {
  const list = await db.select().from(systemConfig)
  const config: Record<string, string> = {}
  list.forEach((item: any) => { config[item.key] = item.value })
  return { code: 0, data: config }
})
