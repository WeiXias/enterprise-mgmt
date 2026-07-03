// ---- 导出 ----
export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: { row: number; reason: string }[]
}
