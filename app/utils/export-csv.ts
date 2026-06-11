/**
 * CSV 导出工具
 * 将 JSON 数组转为 CSV 并在浏览器中触发下载
 */

export interface CsvColumn {
  key: string
  label: string
  format?: (value: unknown, row: Record<string, unknown>) => string
}

export function jsonToCsv(data: Record<string, unknown>[], columns: CsvColumn[]): string {
  const rows: string[] = ['﻿' + columns.map(c => escapeCsvField(c.label)).join(',')]

  for (const row of data) {
    const values = columns.map(col => {
      const val = col.format ? col.format(row[col.key], row) : row[col.key]
      return escapeCsvField(String(val ?? ''))
    })
    rows.push(values.join(','))
  }

  return rows.join('\n')
}

/**
 * CSV 字段转义（处理逗号、引号、换行）
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

/**
 * 触发浏览器下载 CSV 文件
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 一键导出：获取全部数据 → 转 CSV → 下载
 * @param fetchAll 获取全部数据的函数（应忽略分页限制）
 * @param columns 列定义
 * @param filename 文件名
 */
export async function exportTableToCsv(
  fetchAll: () => Promise<Record<string, unknown>[]>,
  columns: CsvColumn[],
  filename: string
): Promise<void> {
  try {
    const data = await fetchAll()
    const csv = jsonToCsv(data, columns)
    downloadCsv(csv, filename)
  } catch {
    // 错误由调用方处理
  }
}
