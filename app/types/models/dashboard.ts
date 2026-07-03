// ---- 仪表盘 ----
export interface DashboardData {
  todayReminders: {
    followUps: number
    expiringContracts: number
    overduePayments?: number
    dueTasks: number
  }
  kpi: {
    customerTotal: number
    opportunityInProgress: number
    contractAmountThisMonth: number
    receivedAmountThisMonth: number
  }
  recentActivities: ActivityItem[]
  recentCustomers: Customer[]
  recentOpportunities: Opportunity[]
  funnelData: SalesFunnelData
  paymentTrend: { month: string; contracted: number; received: number }[]
}

export interface ActivityItem {
  id: string
  type: string
  description: string
  user: string
  createdAt: string
}

export interface SalesFunnelData {
  stages: SalesFunnelStage[]
  total: number
  totalAmount: number
  winRate: number
}

export interface SalesFunnelStage {
  status: OpportunityStatus
  label: string
  count: number
  totalAmount: number
}

