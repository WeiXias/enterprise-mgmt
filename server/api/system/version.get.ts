import { defineEventHandler } from 'h3'
import fs from 'fs'
import path from 'path'

export default defineEventHandler(() => {
  let version = '1.0.0'
  try {
    const p = path.resolve('.version')
    if (fs.existsSync(p)) {
      version = fs.readFileSync(p, 'utf-8').trim()
    }
  } catch { }
  return { code: 0, data: { version } }
})
