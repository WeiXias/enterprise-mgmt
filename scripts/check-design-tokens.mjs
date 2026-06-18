#!/usr/bin/env node
/**
 * 设计令牌违规检查脚本
 *
 * 检查前端 Vue 文件中是否使用了被项目规范禁止的
 * Tailwind 类名或硬编码颜色值。
 *
 * @usage
 *   node scripts/check-design-tokens.mjs          # 检查所有文件
 *   node scripts/check-design-tokens.mjs --fix    # 报告但暂不支持自动修复
 */

import { readFileSync } from 'node:fs'
import { globSync } from 'tinyglobby'

const SRC = 'app'
const EXT = '{vue,ts,js}'

// ====== 违规模式定义 ======
const CHECKS = [
  {
    id: 'forbidden-font-weight',
    description: '禁止使用 font-bold / font-semibold / font-extrabold，仅允许 font-medium(500) 和 font-normal(400)',
    severity: 'error',
    patterns: [/\bfont-bold\b/, /\bfont-semibold\b/, /\bfont-extrabold\b/],
  },
  {
    id: 'forbidden-hardcoded-white',
    description: '禁止使用 bg-white，应用 bg-surface-card 或 bg-surface-page 替代',
    severity: 'error',
    patterns: [/\bbg-white\b/],
  },
  {
    id: 'forbidden-old-tokens',
    description: '禁止使用旧令牌（blue-*/stone-*/amber-*），应使用 brand-* 或语义令牌',
    severity: 'error',
    patterns: [/\bbg-blue-\d{2,3}\b/, /\btext-blue-\d{2,3}\b/, /\bbg-stone-\d{2,3}\b/, /\btext-stone-\d{2,3}\b/, /\btext-amber-\d{2,3}\b/, /\bbg-amber-\d{2,3}\b/],
  },
  {
    id: 'forbidden-gray-colors',
    description: '禁止使用 gray 色阶（除装饰性 bg-gray-300/400），应使用语义令牌（content-secondary / surface-hover / line）',
    severity: 'warning',
    patterns: [
      /\btext-gray-\d{2,3}\b/,
      /\bborder-gray-\d{2,3}\b/,
      /\bbg-gray-(50|100|200|500|600|700|800|900)\b/,
      /\bdivide-gray-\d{2,3}\b/,
    ],
  },
  {
    id: 'forbidden-hex-colors',
    description: '禁止硬编码 hex 颜色（除 SVG 属性和 constants.ts 中的定义外）',
    severity: 'warning',
    // 匹配 class 或 style 中的 hex，但跳过已知合法的设计令牌定义文件
    patterns: [/#[0-9A-Fa-f]{6}\b/, /#[0-9A-Fa-f]{3}\b/],
    // 跳过模式：constants.ts 中的颜色定义、SVG 属性中的 fill/stroke、CSS 变量
    skipIfLine: [
      /^\s*(export\s+)?const\s+\w+.*=/, // 常量定义
      /\bfill="/,                          // SVG fill
      /\bstroke="/,                        // SVG stroke
      /\bvar\(--/,                         // CSS 变量引用
      /^\s*\\/,                            // 注释行
      /\.document\.write\(/,               // 动态打印模板
      /\bpenColors\b/,                     // 签名笔颜色常量
      /\bwatermark_color\b/,               // watermark 配置项
      /\bcolor:\s*['"]/,                   // JS/TS 颜色配置
      /\bcolor in/,                        // v-for="color in [...]"
      /\btag\.color\b/,                    // 标签颜色动态值降级
      /\bbarChart\b|\bbar-chart\b/,        // 图表组件内联样式
    ],
  },
  {
    id: 'forbidden-inline-z-index',
    description: '禁止内联 style="z-index: NNNN"（仅拦截 ≥3 位数），Tailwind 预设类名允许',
    severity: 'warning',
    patterns: [/\bz-index:\s*\d{3,}\b/],
  },
]

// ====== 执行检查 ======
const files = globSync([`${SRC}/**/*.${EXT}`], { absolute: true })
let totalErrors = 0
let totalWarnings = 0

for (const file of files) {
  const lines = readFileSync(file, 'utf-8').split('\n')
  const violations = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    for (const check of CHECKS) {
      for (const pattern of check.patterns) {
        if (pattern.test(line)) {
          // 检查是否应该跳过此行
          if (check.skipIfLine?.some((skip) => skip.test(line))) continue

          const match = line.match(pattern)
          violations.push({
            line: lineNum,
            col: match?.index ?? 0,
            id: check.id,
            severity: check.severity,
            message: check.description,
            snippet: line.trim().substring(0, 120),
          })
          break // 同一行同一检查只报一次
        }
      }
    }
  }

  if (violations.length > 0) {
    const fileErrors = violations.filter((v) => v.severity === 'error').length
    const fileWarnings = violations.filter((v) => v.severity === 'warning').length
    totalErrors += fileErrors
    totalWarnings += fileWarnings

    // 仅当有 error 时才输出详情，warning-only 静默跳过
    if (fileErrors === 0) continue

    const relPath = file.replace(process.cwd() + '/', '')
    console.log(`\n${relPath}`)
    for (const v of violations) {
      const icon = v.severity === 'error' ? '✗' : '⚠'
      console.log(`  ${icon} L${v.line}:${v.col}  [${v.id}]`)
      console.log(`     ${v.message}`)
      console.log(`     ${v.snippet}`)
    }
  }
}

// 汇总（无错误 → 静默返回 0）
if (totalErrors > 0) {
  console.log(`\n> ${totalErrors} 个设计令牌错误，${totalWarnings} 个警告`)
  console.log(`> 请先修复以上错误，再提交。\n`)
  process.exit(1)
}
process.exit(0)
process.exit(0)
