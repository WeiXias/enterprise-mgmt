import { createError } from 'h3'

// 各业务模块的状态转换表
// key: 当前状态 → value: 允许变更到哪些状态
const STATE_MACHINES: Record<string, Record<string, string[]>> = {
  contracts: {
    draft: ['approved', 'terminated'],
    approved: ['in_progress', 'terminated', 'draft'], // draft = 驳回
    in_progress: ['completed', 'terminated'],
    completed: [],
    terminated: [],
  },
  commissions: {
    pending: ['approved', 'rejected'],
    approved: ['paid', 'rejected'],
    rejected: [],
    paid: [],
  },
  reimbursements: {
    pending: ['approved', 'rejected'],
    approved: ['paid'],
    rejected: [],
    paid: [],
  },
}

/**
 * 校验状态转换是否合法，不合法直接抛 400 错误
 */
export function requireTransition(
  module: keyof typeof STATE_MACHINES,
  currentStatus: string,
  targetStatus: string,
) {
  const machine = STATE_MACHINES[module]
  if (!machine) {
    throw createError({ statusCode: 500, statusMessage: `未知的工作流模块: ${module}` })
  }
  const allowed = machine[currentStatus]
  if (!allowed || !allowed.includes(targetStatus)) {
    throw createError({
      statusCode: 400,
      statusMessage: `当前状态「${currentStatus}」不能变更为「${targetStatus}」`,
    })
  }
}
