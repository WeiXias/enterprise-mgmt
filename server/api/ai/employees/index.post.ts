import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { aiEmployees } from '#schema/ai'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(50),
  role: z.enum(['contract_reviewer', 'opportunity_analyst', 'customer_insight', 'custom']),
  roleLabel: z.string().min(1).max(30),
  providerId: z.string().min(1),
  model: z.string().min(1),
  systemPrompt: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(128000).default(4096),
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'ai:manage')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const id = generateId()

  await db.insert(aiEmployees).values({
    id,
    name: parsed.data.name,
    role: parsed.data.role,
    roleLabel: parsed.data.roleLabel,
    providerId: parsed.data.providerId,
    model: parsed.data.model,
    systemPrompt: parsed.data.systemPrompt,
    temperature: parsed.data.temperature,
    maxTokens: parsed.data.maxTokens,
    createdBy: user.userId,
    createdAt: now,
    updatedAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'ai_employee', targetId: id, detail: `创建了 AI 数字员工「${parsed.data.name}」` })

  return { code: 0, data: { id }, message: '搞定了！AI 员工已创建' }
})
