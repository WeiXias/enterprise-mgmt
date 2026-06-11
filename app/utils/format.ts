/**
 * 共享格式化函数
 * 从 dashboard/index.vue, contracts/[id].vue, opportunities/[id].vue 等页面提取
 */

/**
 * 金额格式化: 12345.67 → '¥12,345.67'
 */
export function formatMoney(value: unknown): string {
  const n = Number(value)
  if (!n || isNaN(n)) return '¥0'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * 金额格式化（不含零头）: 12345 → '¥12,345'
 */
export function formatMoneyInt(value: unknown): string {
  const n = Number(value)
  if (!n || isNaN(n)) return '¥0'
  return '¥' + n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

/**
 * 日期格式化: '2024-01-15T10:30:00Z' → '2024-01-15'
 */
export function formatDate(value: unknown, fmt: 'date' | 'datetime' = 'date'): string {
  if (!value) return '-'
  const s = String(value).slice(0, fmt === 'datetime' ? 19 : 10)
  return s.replace('T', ' ')
}

/**
 * 百分比格式化: 0.1 → '10%'
 */
export function formatPercent(value: number, total: number): string {
  if (!total || !value) return '0%'
  return Math.round((value / total) * 100) + '%'
}

/**
 * 进度百分比: formatProgress(3000, 10000) → '30%'
 */
export function formatProgress(current: number, total: number): string {
  return formatPercent(current, total)
}

/**
 * 简短百分比: 0.1 → '10%'（直接乘 100）
 */
export function formatPercentValue(value: number): string {
  if (value == null || isNaN(value)) return '0%'
  return Math.round(value * 100) + '%'
}

/**
 * 手机号脱敏: 13812345678 → '138****5678'
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || '-'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

/**
 * 文件大小: 1024000 → '1 MB'
 */
export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(1) + ' ' + units[i]
}
