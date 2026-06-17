import { defineEventHandler, getRouterParams, createError } from 'h3'
import Database from 'better-sqlite3'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const sqlite = new Database(process.env.DB_PATH || './data/enterprise.db')
  sqlite.pragma('foreign_keys = ON')
  sqlite.prepare('UPDATE suppliers SET deleted_at = ? WHERE id = ?').run(now, id)
  sqlite.close()
  return { code: 0, data: null, message: '已删除' }
})
