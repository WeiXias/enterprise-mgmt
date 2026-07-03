// ---- 系统 ----
export interface SystemConfig {
  company_name?: string
  company_logo?: string
  system_name?: string
}

export interface CodeRule {
  module: string
  prefix: string
  digits: number
  separator: string
  dateFormat?: string
  nextCode: string
}

export interface OperationLog {
  id: string
  user?: Pick<User, 'id' | 'name'> | null
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
  module: string
  recordId?: string
  detail?: unknown
  ipAddress?: string
  createdAt: string
}

export interface BackupRecord {
  id: string
  fileName: string
  fileSize: number
  createdAt: string
}
