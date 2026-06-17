import { rawDb } from '#database'
import path from 'path'
import fs from 'fs'

const BACKUP_DIR = process.env.DB_BACKUP_DIR || path.join(process.cwd(), 'data', 'backups')
const MAX_BACKUPS = 7

export function backupDatabase(): string | null {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dest = path.join(BACKUP_DIR, `enterprise-${timestamp}.db`)

    rawDb.backup(dest)

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('enterprise-') && f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time)

    if (files.length > MAX_BACKUPS) {
      for (const f of files.slice(MAX_BACKUPS)) {
        fs.unlinkSync(path.join(BACKUP_DIR, f.name))
      }
    }

    return dest
  } catch (err) {
    console.error('[backup] 备份失败:', err)
    return null
  }
}
