import { db } from '#database'
import { users } from '#schema/users'
import { eq, sql } from 'drizzle-orm'
import { requireAuth } from '../../utils/permission'
import { success } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  // 递增 tokenVersion 使所有已签发的 token 失效
  await db.update(users).set({ tokenVersion: sql`token_version + 1` }).where(eq(users.id, user.userId))
  return success({ message: '已登出' }, '已登出，下次见！')
})
