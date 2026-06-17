import { backupDatabase } from '#server-utils/backup'

const INTERVAL_MS = 60 * 60 * 1000 // 每小时备份一次

export default defineNitroPlugin(() => {
  let timer: ReturnType<typeof setInterval> | null = null

  const scheduleBackup = () => {
    timer = setInterval(() => {
      const dest = backupDatabase()
      if (dest) {
        console.log(`[db-backup] 备份完成: ${dest}`)
      }
    }, INTERVAL_MS)

    const dest = backupDatabase()
    if (dest) {
      console.log(`[db-backup] 首次备份完成: ${dest}`)
    }
  }

  scheduleBackup()

  return {
    cleanup: () => {
      if (timer) clearInterval(timer)
    },
  }
})
