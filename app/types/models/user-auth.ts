// ============================================================
// 业务模型类型定义
// ============================================================

// ---- 用户与认证 ----
export type UserRole = 'admin' | 'sales_manager' | 'sales_member' | 'finance'

export interface User {
  id: string
  username: string
  name: string
  phone?: string
  email?: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: Pick<User, 'id' | 'username' | 'name' | 'role' | 'avatarUrl'>
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

