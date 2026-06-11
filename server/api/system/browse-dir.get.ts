import { defineEventHandler, getQuery } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { readdir, stat } from 'node:fs/promises'
import { resolve, join, sep } from 'node:path'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config')

  const query = getQuery(event)
  let dir = (query.path as string) || process.cwd()

  // 安全校验：必须是绝对路径
  dir = resolve(dir)

  try {
    const dirStat = await stat(dir)
    if (!dirStat.isDirectory()) {
      return { code: 1, message: '路径不是目录' }
    }

    const entries = await readdir(dir, { withFileTypes: true })
    const dirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .map(e => ({
        name: e.name,
        path: join(dir, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'))

    const breadcrumbs: { name: string; path: string }[] = []
    const parts = dir.split(sep).filter(Boolean)
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      breadcrumbs.push({
        name: part,
        path: (sep === '/' ? '/' : '') + parts.slice(0, i + 1).join(sep),
      })
    }

    return {
      code: 0,
      data: {
        current: dir,
        breadcrumbs,
        dirs,
        parent: dir === sep ? null : resolve(dir, '..'),
      },
    }
  } catch (e: any) {
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      return { code: 1, message: '无权访问该目录' }
    }
    if (e.code === 'ENOENT') {
      return { code: 1, message: '目录不存在' }
    }
    return { code: 1, message: '读取目录失败' }
  }
})
