/**
 * 金额转换工具 — 前后端统一用「元」交互，数据库存「分」。
 *
 * API 输入边界：用户提交元 → toCents() 转分存库
 * API 输出边界：数据库分 → toYuan() 转元返回前端
 */

/** 元 → 分（输入边界） */
export function toCents(yuan: number | undefined | null): number {
  if (yuan == null || Number.isNaN(yuan)) return 0
  return Math.round(yuan * 100)
}

/** 分 → 元（输出边界），保留 2 位小数 */
export function toYuan(cents: number | undefined | null): number {
  if (cents == null || Number.isNaN(cents)) return 0
  return Math.round(cents) / 100
}

/** 批量将对象中的金额字段从元转分 */
export function mapToCents<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): T {
  const result = { ...obj }
  for (const k of keys) {
    if (result[k] !== undefined) (result as any)[k] = toCents(result[k] as number)
  }
  return result
}

/** 批量将对象中的金额字段从分转元 */
export function mapToYuan<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): T {
  const result = { ...obj }
  for (const k of keys) {
    if (result[k] !== undefined) (result as any)[k] = toYuan(result[k] as number)
  }
  return result
}
