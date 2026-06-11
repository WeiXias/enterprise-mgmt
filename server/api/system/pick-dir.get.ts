import { defineEventHandler } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { execSync } from 'child_process'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config')

  const script = `
    set result to (choose folder with prompt "选择上传文件存储目录：")
    if result is not null then
      return POSIX path of result
    end if
    return ""
  `

  try {
    const path = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { encoding: 'utf-8', timeout: 60000 }).trim()
    if (path) return { code: 0, data: path }
    return { code: 1, message: '未选择目录' }
  } catch {
    return { code: 1, message: '选目录时出了点问题' }
  }
})
