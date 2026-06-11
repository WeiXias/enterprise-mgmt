import { H3Event } from 'h3'
import { db } from '#database'
import { operationLogs } from '#schema/users'
import { generateId } from './id'

const MODULE_NAMES: Record<string, string> = {
  customer: '客户', contact: '联系人', followup: '跟进记录', tag: '标签',
  opportunity: '商机', quote: '报价',
  product: '产品', category: '产品分类',
  contract: '合同', payment: '收付款',
  subcontract: '分包',
  project: '项目', task: '任务', deliverable: '交付物',
  commission: '提成', payout: '提成发放',
  finance: '财务', reimbursement: '报销',
  ai_employee: 'AI 员工', ai_review: 'AI 审核',
  user: '用户', system: '系统',
}

const ACTION_NAMES: Record<string, string> = {
  CREATE: '创建了', UPDATE: '更新了', DELETE: '删除了', APPROVE: '审批通过了', REJECT: '驳回了',
}

function buildDetail(
  module: string,
  action: string,
  detail: unknown,
): string {
  if (detail) {
    return typeof detail === 'string' ? detail : JSON.stringify(detail)
  }
  const moduleName = MODULE_NAMES[module] || module
  const actionName = ACTION_NAMES[action] || action
  return `${actionName}${moduleName}`
}

export async function logOperation(
  event: H3Event,
  params: {
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
    module: string
    targetId?: string
    detail?: unknown
  }
) {
  try {
    const user = event.context.user
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const ip = event.headers.get('x-forwarded-for')
      || event.headers.get('x-real-ip')
      || event.node?.req?.socket?.remoteAddress
      || ''

    await db.insert(operationLogs).values({
      id: generateId(),
      userId: user?.userId || 'system',
      module: params.module,
      action: params.action,
      targetId: params.targetId || null,
      detail: buildDetail(params.module, params.action, params.detail),
      ip,
      createdAt: now,
    })
  } catch { /* 日志写入失败不影响主流程 */ }
}
