import { defineEventHandler } from 'h3'
import { db } from '#database'
import { codeRules } from '#schema/system'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const list = await db.select().from(codeRules).orderBy(asc(codeRules.module))
  return { code: 0, data: list }
})