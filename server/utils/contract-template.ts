/**
 * 合同模板工具函数
 */
export function extractPlaceholders(html: string): { key: string; label: string }[] {
  const regex = /\{\{(\w+)\}\}/g
  const seen = new Set<string>()
  const result: { key: string; label: string }[] = []
  let match
  while ((match = regex.exec(html)) !== null) {
    if (!seen.has(match[1]!)) {
      seen.add(match[1]!)
      result.push({ key: match[1]!, label: match[1]! })
    }
  }
  return result
}
