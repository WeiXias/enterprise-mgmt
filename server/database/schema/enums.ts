// db/schema/enums.ts
// 枚举定义 - 统一管理所有状态枚举

// ---- UserRole ----
export const UserRole = {
  ADMIN: 'admin',
  SALES_MANAGER: 'sales_manager',
  SALES_MEMBER: 'sales_member',
  FINANCE: 'finance',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: '管理员',
  [UserRole.SALES_MANAGER]: '销售负责人',
  [UserRole.SALES_MEMBER]: '销售/项目成员',
  [UserRole.FINANCE]: '财务',
}

// ---- CustomerStatus ----
export const CustomerStatus = {
  POTENTIAL: 'potential',
  INTENTIONAL: 'intentional',
  CLOSED: 'closed',
  LOST: 'lost',
} as const

export type CustomerStatus = (typeof CustomerStatus)[keyof typeof CustomerStatus]

export const CustomerStatusLabels: Record<CustomerStatus, string> = {
  [CustomerStatus.POTENTIAL]: '潜在客户',
  [CustomerStatus.INTENTIONAL]: '意向客户',
  [CustomerStatus.CLOSED]: '成交客户',
  [CustomerStatus.LOST]: '流失客户',
}

// ---- OpportunityStatus ----
export const OpportunityStatus = {
  INITIAL_CONTACT: 'initial_contact',
  REQUIREMENT_CONFIRMED: 'requirement_confirmed',
  PROPOSAL_SUBMITTED: 'proposal_submitted',
  BUSINESS_NEGOTIATION: 'business_negotiation',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
} as const

export type OpportunityStatus = (typeof OpportunityStatus)[keyof typeof OpportunityStatus]

export const OpportunityStatusLabels: Record<OpportunityStatus, string> = {
  [OpportunityStatus.INITIAL_CONTACT]: '初步接触',
  [OpportunityStatus.REQUIREMENT_CONFIRMED]: '需求确认',
  [OpportunityStatus.PROPOSAL_SUBMITTED]: '方案提交',
  [OpportunityStatus.BUSINESS_NEGOTIATION]: '商务谈判',
  [OpportunityStatus.CLOSED_WON]: '已成交',
  [OpportunityStatus.CLOSED_LOST]: '已输单',
}

// ---- ContractStatus ----
export const ContractStatus = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  TERMINATED: 'terminated',
} as const

export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus]

export const ContractStatusLabels: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: '草稿',
  [ContractStatus.APPROVED]: '已审批',
  [ContractStatus.IN_PROGRESS]: '执行中',
  [ContractStatus.COMPLETED]: '已完成',
  [ContractStatus.TERMINATED]: '已终止',
}

// ---- ProjectStatus ----
export const ProjectStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DELAYED: 'delayed',
} as const

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus]

export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.NOT_STARTED]: '未开始',
  [ProjectStatus.IN_PROGRESS]: '进行中',
  [ProjectStatus.COMPLETED]: '已完成',
  [ProjectStatus.DELAYED]: '已延期',
}

// ---- TaskStatus ----
export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: '待办',
  [TaskStatus.IN_PROGRESS]: '进行中',
  [TaskStatus.COMPLETED]: '已完成',
}

// ---- TaskPriority ----
export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority]

export const TaskPriorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: '低',
  [TaskPriority.MEDIUM]: '中',
  [TaskPriority.HIGH]: '高',
}

// ---- ProductStatus ----
export const ProductStatus = {
  ON_SALE: 'on_sale',
  OFF_SHELF: 'off_shelf',
} as const

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus]

export const ProductStatusLabels: Record<ProductStatus, string> = {
  [ProductStatus.ON_SALE]: '在售',
  [ProductStatus.OFF_SHELF]: '下架',
}

// ---- CommissionStatus ----
export const CommissionStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
} as const

export type CommissionStatus = (typeof CommissionStatus)[keyof typeof CommissionStatus]

export const CommissionStatusLabels: Record<CommissionStatus, string> = {
  [CommissionStatus.PENDING]: '待审批',
  [CommissionStatus.APPROVED]: '已通过',
  [CommissionStatus.PAID]: '已发放',
}

// ---- FollowUpType ----
export const FollowUpType = {
  PHONE: 'phone',
  VISIT: 'visit',
  WECHAT: 'wechat',
  EMAIL: 'email',
  OTHER: 'other',
} as const

export type FollowUpType = (typeof FollowUpType)[keyof typeof FollowUpType]

export const FollowUpTypeLabels: Record<FollowUpType, string> = {
  [FollowUpType.PHONE]: '电话',
  [FollowUpType.VISIT]: '拜访',
  [FollowUpType.WECHAT]: '微信',
  [FollowUpType.EMAIL]: '邮件',
  [FollowUpType.OTHER]: '其他',
}

// ---- PaymentMethod ----
export const PaymentMethod = {
  BANK_TRANSFER: 'bank_transfer',
  CHECK: 'check',
  CASH: 'cash',
  ALIPAY: 'alipay',
  WECHAT_PAY: 'wechat_pay',
  OTHER: 'other',
} as const

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.BANK_TRANSFER]: '银行转账',
  [PaymentMethod.CHECK]: '支票',
  [PaymentMethod.CASH]: '现金',
  [PaymentMethod.ALIPAY]: '支付宝',
  [PaymentMethod.WECHAT_PAY]: '微信支付',
  [PaymentMethod.OTHER]: '其他',
}

// ---- 辅助函数：把枚举对象转为 {value, label} 数组 ----

// ---- TransactionType ----
export const TransactionType = { INCOME: 'income', EXPENSE: 'expense' } as const
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]
export const TransactionTypeLabels: Record<TransactionType, string> = {
  [TransactionType.INCOME]: '收入', [TransactionType.EXPENSE]: '支出',
}

// ---- TransactionSourceType ----
export const TransactionSourceType = {
  CONTRACT_PAYMENT: 'contract_payment',
  COMMISSION_PAYOUT: 'commission_payout',
  REIMBURSEMENT: 'reimbursement',
  MANUAL: 'manual',
} as const
export type TransactionSourceType = (typeof TransactionSourceType)[keyof typeof TransactionSourceType]
export const TransactionSourceTypeLabels: Record<TransactionSourceType, string> = {
  [TransactionSourceType.CONTRACT_PAYMENT]: '合同收款',
  [TransactionSourceType.COMMISSION_PAYOUT]: '提成发放',
  [TransactionSourceType.REIMBURSEMENT]: '报销',
  [TransactionSourceType.MANUAL]: '手动登记',
}

// ---- ReimbursementStatus ----
export const ReimbursementStatus = {
  PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected', PAID: 'paid',
} as const
export type ReimbursementStatus = (typeof ReimbursementStatus)[keyof typeof ReimbursementStatus]
export const ReimbursementStatusLabels: Record<ReimbursementStatus, string> = {
  [ReimbursementStatus.PENDING]: '待审批', [ReimbursementStatus.APPROVED]: '已通过',
  [ReimbursementStatus.REJECTED]: '已驳回', [ReimbursementStatus.PAID]: '已付款',
}

// ---- AIEmployeeRole ----
export const AIEmployeeRole = {
  CONTRACT_REVIEWER: 'contract_reviewer',
  OPPORTUNITY_ANALYST: 'opportunity_analyst',
  CUSTOMER_INSIGHT: 'customer_insight',
  CUSTOM: 'custom',
} as const
export type AIEmployeeRole = (typeof AIEmployeeRole)[keyof typeof AIEmployeeRole]
export const AIEmployeeRoleLabels: Record<AIEmployeeRole, string> = {
  [AIEmployeeRole.CONTRACT_REVIEWER]: '合同审核员',
  [AIEmployeeRole.OPPORTUNITY_ANALYST]: '商机分析师',
  [AIEmployeeRole.CUSTOMER_INSIGHT]: '客户洞察师',
  [AIEmployeeRole.CUSTOM]: '自定义角色',
}

// ---- AIProviderType ----
export const AIProviderType = {
  DEEPSEEK: 'deepseek',
  CUSTOM: 'custom',
} as const
export type AIProviderType = (typeof AIProviderType)[keyof typeof AIProviderType]
export const AIProviderTypeLabels: Record<AIProviderType, string> = {
  [AIProviderType.DEEPSEEK]: 'DeepSeek',
  [AIProviderType.CUSTOM]: '自定义',
}

// ---- AIReviewStatus ----
export const AIReviewStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const
export type AIReviewStatus = (typeof AIReviewStatus)[keyof typeof AIReviewStatus]
export const AIReviewStatusLabels: Record<AIReviewStatus, string> = {
  [AIReviewStatus.PENDING]: '等待中',
  [AIReviewStatus.PROCESSING]: '处理中',
  [AIReviewStatus.COMPLETED]: '已完成',
  [AIReviewStatus.FAILED]: '失败',
}

// ---- AIRiskLevel ----
export const AIRiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const
export type AIRiskLevel = (typeof AIRiskLevel)[keyof typeof AIRiskLevel]
export const AIRiskLevelLabels: Record<AIRiskLevel, string> = {
  [AIRiskLevel.LOW]: '低风险',
  [AIRiskLevel.MEDIUM]: '中风险',
  [AIRiskLevel.HIGH]: '高风险',
  [AIRiskLevel.CRITICAL]: '严重风险',
}

export function enumToOptions<K extends string>(
  enumObj: Record<string, K>,
  labels: Record<K, string>
): { value: K; label: string }[] {
  return Object.values(enumObj).map(v => ({ value: v, label: labels[v] }))
}

// ---- InventoryTransactionType ----
export const InventoryTransactionType = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  ADJUSTMENT: 'adjustment',
} as const
export type InventoryTransactionType = (typeof InventoryTransactionType)[keyof typeof InventoryTransactionType]
export const InventoryTransactionTypeLabels: Record<InventoryTransactionType, string> = {
  [InventoryTransactionType.INBOUND]: '入库',
  [InventoryTransactionType.OUTBOUND]: '出库',
  [InventoryTransactionType.ADJUSTMENT]: '盘点调整',
}

// ---- InvoiceType ----
export const InvoiceType = {
  VAT_SPECIAL: 'vat_special',
  VAT_NORMAL: 'vat_normal',
  ELECTRONIC: 'electronic',
} as const
export type InvoiceType = (typeof InvoiceType)[keyof typeof InvoiceType]
export const InvoiceTypeLabels: Record<InvoiceType, string> = {
  [InvoiceType.VAT_SPECIAL]: '增值税专票',
  [InvoiceType.VAT_NORMAL]: '增值税普票',
  [InvoiceType.ELECTRONIC]: '电子发票',
}

// ---- InvoiceStatus ----
export const InvoiceStatus = {
  PENDING: 'pending',
  ISSUED: 'issued',
  VOIDED: 'voided',
} as const
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]
export const InvoiceStatusLabels: Record<InvoiceStatus, string> = {
  [InvoiceStatus.PENDING]: '待开票',
  [InvoiceStatus.ISSUED]: '已开票',
  [InvoiceStatus.VOIDED]: '已作废',
}

// ---- IMConversationType ----
export const IMConversationType = { DIRECT: 'direct', GROUP: 'group' } as const
export type IMConversationType = (typeof IMConversationType)[keyof typeof IMConversationType]
export const IMConversationTypeLabels: Record<IMConversationType, string> = {
  [IMConversationType.DIRECT]: '私聊',
  [IMConversationType.GROUP]: '群聊',
}

// ---- IMMessageType ----
export const IMMessageType = { TEXT: 'text', FILE: 'file' } as const
export type IMMessageType = (typeof IMMessageType)[keyof typeof IMMessageType]
export const IMMessageTypeLabels: Record<IMMessageType, string> = {
  [IMMessageType.TEXT]: '文本',
  [IMMessageType.FILE]: '文件',
}

// ---- IMMemberRole ----
export const IMMemberRole = { OWNER: 'owner', MEMBER: 'member' } as const
export type IMMemberRole = (typeof IMMemberRole)[keyof typeof IMMemberRole]
export const IMMemberRoleLabels: Record<IMMemberRole, string> = {
  [IMMemberRole.OWNER]: '群主',
  [IMMemberRole.MEMBER]: '成员',
}

// ---- TodoPriority (四象限优先级) ----
export const TodoPriority = { URGENT_IMPORTANT: 'urgent_important', URGENT_NOT_IMPORTANT: 'urgent_not_important', IMPORTANT_NOT_URGENT: 'important_not_urgent', NOT_URGENT_NOT_IMPORTANT: 'not_urgent_not_important' } as const
export type TodoPriority = (typeof TodoPriority)[keyof typeof TodoPriority]
export const TodoPriorityLabels: Record<TodoPriority, string> = {
  [TodoPriority.URGENT_IMPORTANT]: '紧急重要',
  [TodoPriority.URGENT_NOT_IMPORTANT]: '紧急不重要',
  [TodoPriority.IMPORTANT_NOT_URGENT]: '重要不紧急',
  [TodoPriority.NOT_URGENT_NOT_IMPORTANT]: '不紧急不重要',
}

// ---- TodoStatus ----
export const TodoStatus = { TODO: 'todo', IN_PROGRESS: 'in_progress', COMPLETED: 'completed' } as const
export type TodoStatus = (typeof TodoStatus)[keyof typeof TodoStatus]
export const TodoStatusLabels: Record<TodoStatus, string> = {
  [TodoStatus.TODO]: '待办',
  [TodoStatus.IN_PROGRESS]: '进行中',
  [TodoStatus.COMPLETED]: '已完成',
}

// ---- ListColor (清单颜色) ----
export const ListColor = { AMBER: 'amber', TEAL: 'teal', BLUE: 'blue', CORAL: 'coral', STONE: 'stone', VIOLET: 'violet' } as const
export type ListColor = (typeof ListColor)[keyof typeof ListColor]
export const ListColorLabels: Record<ListColor, string> = {
  [ListColor.AMBER]: '琥珀',
  [ListColor.TEAL]: '青绿',
  [ListColor.BLUE]: '蓝色',
  [ListColor.CORAL]: '珊瑚',
  [ListColor.STONE]: '石色',
  [ListColor.VIOLET]: '紫罗兰',
}
