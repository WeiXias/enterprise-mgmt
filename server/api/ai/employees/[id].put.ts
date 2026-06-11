import { defineEventHandler, readBody, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { aiEmployees } from '#schema/ai'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(50).optional(),
  role: z.enum(['contract_reviewer', 'opportunity_analyst', 'customer_insight', 'custom']).optional(),
  roleLabel: z.string().min(1).max(30).optional(),
  providerId: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(128000).optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ai:manage')

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: aiEmployees.id }).from(aiEmployees).where(eq(aiEmployees.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: 'AI 员工不存在' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, any> = { updatedAt: now }

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role
  if (parsed.data.roleLabel !== undefined) updateData.roleLabel = parsed.data.roleLabel
  if (parsed.data.providerId !== undefined) updateData.providerId = parsed.data.providerId
  if (parsed.data.model !== undefined) updateData.model = parsed.data.model
  if (parsed.data.systemPrompt !== undefined) updateData.systemPrompt = parsed.data.systemPrompt
  if (parsed.data.temperature !== undefined) updateData.temperature = parsed.data.temperature
  if (parsed.data.maxTokens !== undefined) updateData.maxTokens = parsed.data.maxTokens
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive

  await db.update(aiEmployees).set(updateData).where(eq(aiEmployees.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'ai_employee', targetId: id, detail: '更新了 AI 数字员工' })

  return { code: 0, data: null, message: 'AI 员工已更新' }
})
