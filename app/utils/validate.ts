/**
 * 表单校验函数
 */

/** 必填校验 */
export function isRequired(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return !isNaN(value)
  return true
}

/** 手机号校验（中国大陆） */
export function isPhone(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value.trim())
}

/** 邮箱校验 */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** 金额校验（正数） */
export function isPositiveAmount(value: unknown): boolean {
  const n = Number(value)
  return !isNaN(n) && n > 0
}

/** 金额校验（非负） */
export function isNonNegativeAmount(value: unknown): boolean {
  const n = Number(value)
  return !isNaN(n) && n >= 0
}

/** 字符串长度范围 */
export function isLengthInRange(value: string, min: number, max: number): boolean {
  const len = value.trim().length
  return len >= min && len <= max
}

/** 获取校验错误消息 */
export function getValidationError(field: string, rule: string): string {
  const messages: Record<string, Record<string, string>> = {
    name: {
      required: '名称得填一下',
    },
    phone: {
      required: '手机号得填一下',
      invalid: '手机号格式不太对',
    },
    email: {
      invalid: '邮箱格式不太对',
    },
    amount: {
      required: '金额得填一下',
      invalid: '金额得大于 0',
    },
    password: {
      required: '密码得填一下',
      minLength: '密码至少 8 位',
    },
  }
  return messages[field]?.[rule] || '有点问题，检查一下再试'
}
