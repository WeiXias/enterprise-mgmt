import { defineEventHandler } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema'
import { eq } from 'drizzle-orm'
import {
  UserRole, UserRoleLabels,
  CustomerStatus, CustomerStatusLabels,
  OpportunityStatus, OpportunityStatusLabels,
  ContractStatus, ContractStatusLabels,
  ProjectStatus, ProjectStatusLabels,
  TaskStatus, TaskStatusLabels,
  TaskPriority, TaskPriorityLabels,
  ProductStatus, ProductStatusLabels,
  CommissionStatus, CommissionStatusLabels,
  FollowUpType, FollowUpTypeLabels,
  PaymentMethod, PaymentMethodLabels,
  AIEmployeeRole, AIEmployeeRoleLabels,
  AIProviderType, AIProviderTypeLabels,
  AIReviewStatus, AIReviewStatusLabels,
  AIRiskLevel, AIRiskLevelLabels,
  TodoPriority, TodoPriorityLabels,
  TodoStatus, TodoStatusLabels,
  ListColor, ListColorLabels,
  TransactionType, TransactionTypeLabels,
  TransactionSourceType, TransactionSourceTypeLabels,
  ReimbursementStatus, ReimbursementStatusLabels,
  InventoryTransactionType, InventoryTransactionTypeLabels,
  InvoiceType, InvoiceTypeLabels,
  InvoiceStatus, InvoiceStatusLabels,
  IMConversationType, IMConversationTypeLabels,
  IMMessageType, IMMessageTypeLabels,
  IMMemberRole, IMMemberRoleLabels,
  RiskType, RiskTypeLabels,
  RiskStatus, RiskStatusLabels,
  ImpactLevel, ImpactLevelLabels,
  DeliverableStatus, DeliverableStatusLabels,
  QuoteStatus, QuoteStatusLabels,
  TimeLogStatus, TimeLogStatusLabels,
  PaymentPlanStatus, PaymentPlanStatusLabels,
  ContractType, ContractTypeLabels,
  ContractTemplateCategory, ContractTemplateCategoryLabels,
  ProjectMemberRole, ProjectMemberRoleLabels,
  ProjectTemplateCategory, ProjectTemplateCategoryLabels,
  CommentTargetType, CommentTargetTypeLabels,
  CommissionRuleBaseType, CommissionRuleBaseTypeLabels,
  CommissionPayoutStatus, CommissionPayoutStatusLabels,
  NotificationType, NotificationTypeLabels,
  UserStatus, UserStatusLabels,
  CodeRuleDatePart, CodeRuleDatePartLabels,
  enumToOptions
} from '#enums'

export default defineEventHandler(async () => {
  // 读取自定义字典覆盖
  let overrides: Record<string, Record<string, string>> = {}
  try {
    const rows = await db.select().from(systemConfig).where(eq(systemConfig.key, 'dict_overrides'))
    if (rows.length > 0) {
      overrides = JSON.parse(rows[0]?.value || '{}')
    }
  } catch { /* 表可能还不存在 */ }

  function applyOverride(options: { label: string; value: string }[], overrideMap?: Record<string, string>) {
    if (!overrideMap) return options
    return options.map(opt => ({
      ...opt,
      label: overrideMap[opt.value] || opt.label,
    }))
  }

  return {
    code: 0,
    data: {
      userRoles: applyOverride(enumToOptions(UserRole, UserRoleLabels), overrides.UserRole),
      customerStatus: applyOverride(enumToOptions(CustomerStatus, CustomerStatusLabels), overrides.CustomerStatus),
      opportunityStatus: applyOverride(enumToOptions(OpportunityStatus, OpportunityStatusLabels), overrides.OpportunityStatus),
      contractStatus: applyOverride(enumToOptions(ContractStatus, ContractStatusLabels), overrides.ContractStatus),
      projectStatus: applyOverride(enumToOptions(ProjectStatus, ProjectStatusLabels), overrides.ProjectStatus),
      taskStatus: applyOverride(enumToOptions(TaskStatus, TaskStatusLabels), overrides.TaskStatus),
      taskPriority: applyOverride(enumToOptions(TaskPriority, TaskPriorityLabels), overrides.TaskPriority),
      productStatus: applyOverride(enumToOptions(ProductStatus, ProductStatusLabels), overrides.ProductStatus),
      commissionStatus: applyOverride(enumToOptions(CommissionStatus, CommissionStatusLabels), overrides.CommissionStatus),
      followUpType: applyOverride(enumToOptions(FollowUpType, FollowUpTypeLabels), overrides.FollowUpType),
      paymentMethod: applyOverride(enumToOptions(PaymentMethod, PaymentMethodLabels), overrides.PaymentMethod),
      aiEmployeeRoles: applyOverride(enumToOptions(AIEmployeeRole, AIEmployeeRoleLabels), overrides.AIEmployeeRole),
      aiProviderTypes: applyOverride(enumToOptions(AIProviderType, AIProviderTypeLabels), overrides.AIProviderType),
      aiReviewStatus: applyOverride(enumToOptions(AIReviewStatus, AIReviewStatusLabels), overrides.AIReviewStatus),
      aiRiskLevels: applyOverride(enumToOptions(AIRiskLevel, AIRiskLevelLabels), overrides.AIRiskLevel),
      todoPriority: applyOverride(enumToOptions(TodoPriority, TodoPriorityLabels), overrides.TodoPriority),
      todoStatus: applyOverride(enumToOptions(TodoStatus, TodoStatusLabels), overrides.TodoStatus),
      listColor: applyOverride(enumToOptions(ListColor, ListColorLabels), overrides.ListColor),
      transactionType: applyOverride(enumToOptions(TransactionType, TransactionTypeLabels), overrides.TransactionType),
      transactionSourceType: applyOverride(enumToOptions(TransactionSourceType, TransactionSourceTypeLabels), overrides.TransactionSourceType),
      reimbursementStatus: applyOverride(enumToOptions(ReimbursementStatus, ReimbursementStatusLabels), overrides.ReimbursementStatus),
      inventoryTransactionType: applyOverride(enumToOptions(InventoryTransactionType, InventoryTransactionTypeLabels), overrides.InventoryTransactionType),
      invoiceType: applyOverride(enumToOptions(InvoiceType, InvoiceTypeLabels), overrides.InvoiceType),
      invoiceStatus: applyOverride(enumToOptions(InvoiceStatus, InvoiceStatusLabels), overrides.InvoiceStatus),
      imConversationType: applyOverride(enumToOptions(IMConversationType, IMConversationTypeLabels), overrides.IMConversationType),
      imMessageType: applyOverride(enumToOptions(IMMessageType, IMMessageTypeLabels), overrides.IMMessageType),
      imMemberRole: applyOverride(enumToOptions(IMMemberRole, IMMemberRoleLabels), overrides.IMMemberRole),
      riskType: applyOverride(enumToOptions(RiskType, RiskTypeLabels), overrides.RiskType),
      riskStatus: applyOverride(enumToOptions(RiskStatus, RiskStatusLabels), overrides.RiskStatus),
      impactLevel: applyOverride(enumToOptions(ImpactLevel, ImpactLevelLabels), overrides.ImpactLevel),
      deliverableStatus: applyOverride(enumToOptions(DeliverableStatus, DeliverableStatusLabels), overrides.DeliverableStatus),
      quoteStatus: applyOverride(enumToOptions(QuoteStatus, QuoteStatusLabels), overrides.QuoteStatus),
      timeLogStatus: applyOverride(enumToOptions(TimeLogStatus, TimeLogStatusLabels), overrides.TimeLogStatus),
      paymentPlanStatus: applyOverride(enumToOptions(PaymentPlanStatus, PaymentPlanStatusLabels), overrides.PaymentPlanStatus),
      contractType: applyOverride(enumToOptions(ContractType, ContractTypeLabels), overrides.ContractType),
      contractTemplateCategory: applyOverride(enumToOptions(ContractTemplateCategory, ContractTemplateCategoryLabels), overrides.ContractTemplateCategory),
      projectMemberRole: applyOverride(enumToOptions(ProjectMemberRole, ProjectMemberRoleLabels), overrides.ProjectMemberRole),
      projectTemplateCategory: applyOverride(enumToOptions(ProjectTemplateCategory, ProjectTemplateCategoryLabels), overrides.ProjectTemplateCategory),
      commentTargetType: applyOverride(enumToOptions(CommentTargetType, CommentTargetTypeLabels), overrides.CommentTargetType),
      commissionRuleBaseType: applyOverride(enumToOptions(CommissionRuleBaseType, CommissionRuleBaseTypeLabels), overrides.CommissionRuleBaseType),
      commissionPayoutStatus: applyOverride(enumToOptions(CommissionPayoutStatus, CommissionPayoutStatusLabels), overrides.CommissionPayoutStatus),
      notificationType: applyOverride(enumToOptions(NotificationType, NotificationTypeLabels), overrides.NotificationType),
      userStatus: applyOverride(enumToOptions(UserStatus, UserStatusLabels), overrides.UserStatus),
      codeRuleDatePart: applyOverride(enumToOptions(CodeRuleDatePart, CodeRuleDatePartLabels), overrides.CodeRuleDatePart),
    }
  }
})