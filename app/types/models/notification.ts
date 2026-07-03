// ---- 通知 ----
export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  content?: string
  referenceId?: string
  referenceType?: string
  isRead: boolean
  createdAt: string
}

