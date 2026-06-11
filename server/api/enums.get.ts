import { defineEventHandler } from 'h3'
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
  enumToOptions
} from '#enums'

export default defineEventHandler(() => {
  return {
    code: 0,
    data: {
      userRoles: enumToOptions(UserRole, UserRoleLabels),
      customerStatus: enumToOptions(CustomerStatus, CustomerStatusLabels),
      opportunityStatus: enumToOptions(OpportunityStatus, OpportunityStatusLabels),
      contractStatus: enumToOptions(ContractStatus, ContractStatusLabels),
      projectStatus: enumToOptions(ProjectStatus, ProjectStatusLabels),
      taskStatus: enumToOptions(TaskStatus, TaskStatusLabels),
      taskPriority: enumToOptions(TaskPriority, TaskPriorityLabels),
      productStatus: enumToOptions(ProductStatus, ProductStatusLabels),
      commissionStatus: enumToOptions(CommissionStatus, CommissionStatusLabels),
      followUpType: enumToOptions(FollowUpType, FollowUpTypeLabels),
      paymentMethod: enumToOptions(PaymentMethod, PaymentMethodLabels),
      aiEmployeeRoles: enumToOptions(AIEmployeeRole, AIEmployeeRoleLabels),
      aiProviderTypes: enumToOptions(AIProviderType, AIProviderTypeLabels),
      aiReviewStatus: enumToOptions(AIReviewStatus, AIReviewStatusLabels),
      aiRiskLevels: enumToOptions(AIRiskLevel, AIRiskLevelLabels),
    }
  }
})
