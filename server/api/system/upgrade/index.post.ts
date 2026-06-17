import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { execSync, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getUpgradeStatus, setUpgradeStatus } from '#server-utils/upgrade-state'

export { getUpgradeStatus } from '#server-utils/upgrade-state'

function resolveDbPath(projectDir: string): string {
  if (process.env.DB_PATH) return path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(projectDir, process.env.DB_PATH)
  const newPath = path.join(projectDir, 'data', 'db', 'enterprise.db')
  const oldPath = path.join(projectDir, 'data', 'enterprise.db')
  return fs.existsSync(oldPath) ? oldPath : newPath
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:upgrade')

  const current = getUpgradeStatus()
  if (current.step !== 'idle' && current.step !== 'done' && current.step !== 'failed') {
    throw createError({ statusCode: 409, statusMessage: '正在升级中，稍后再试' })
  }

  const files = await readMultipartFormData(event, { maxSize: 200 * 1024 * 1024 })
  if (!files || files.length === 0) {
    throw createError({ statusCode: 422, statusMessage: '还没上传文件呢' })
  }

  const file = files[0]
  if (!file.data || !file.filename?.endsWith('.tar.gz')) {
    throw createError({ statusCode: 422, statusMessage: '请上传 .tar.gz 格式的补丁包' })
  }

  const projectDir = path.resolve('.')
  const tmpDir = path.join(projectDir, 'data', 'tmp', 'upgrade')
  const backupDir = path.join(projectDir, 'data', 'backups')
  const startedAt = new Date().toISOString()
  setUpgradeStatus({ step: 'extracting', startedAt, message: '正在解压补丁包...' })

  try {
    // 1. 解压补丁包
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true })
    fs.mkdirSync(tmpDir, { recursive: true })

    const tarPath = path.join(tmpDir, 'patch.tar.gz')
    fs.writeFileSync(tarPath, file.data)
    execSync(`tar xzf "${tarPath}" -C "${tmpDir}"`, { timeout: 60000 })

    const contentDir = findContentDir(tmpDir)
    if (!contentDir) {
      throw createError({ statusCode: 422, statusMessage: '补丁包内容为空或格式不对' })
    }

    // 读取版本号
    let version = ''
    try {
      const info = fs.readFileSync(path.join(contentDir, 'patch-info.txt'), 'utf-8')
      const m = info.match(/VERSION=(.+)/)
      if (m) version = m[1].trim()
    } catch {}

    // 2. 备份数据库
    setUpgradeStatus({ step: 'backing-up', message: '正在备份数据库...', version })
    fs.mkdirSync(backupDir, { recursive: true })
    const dbPath = resolveDbPath(projectDir)
    const ts = new Date().toISOString().slice(0, 19).replace(/T/, '_').replace(/:/g, '-')
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(backupDir, `pre-upgrade-${ts}.db`))
    }

    // 3. 安装依赖
    setUpgradeStatus({ step: 'installing', message: '正在安装依赖...' })
    try {
      for (const f of ['package.json', 'pnpm-lock.yaml']) {
        const src = path.join(contentDir, f)
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(projectDir, f))
        }
      }
      execSync('pnpm install --no-frozen-lockfile', {
        cwd: projectDir, timeout: 120000, stdio: 'pipe',
      })
    } catch {}

    // 编译原生模块
    rebuildBetterSqlite3(projectDir)

    // 4. 数据库迁移
    setUpgradeStatus({ step: 'migrating', message: '正在执行数据库迁移...' })
    const patchMigrations = path.join(contentDir, 'migrations')
    if (fs.existsSync(patchMigrations)) {
      const dbMigrations = path.join(projectDir, 'server', 'database', 'migrations')
      fs.mkdirSync(dbMigrations, { recursive: true })
      for (const f of fs.readdirSync(patchMigrations)) {
        if (f.endsWith('.sql')) {
          fs.copyFileSync(path.join(patchMigrations, f), path.join(dbMigrations, f))
        }
      }
    }
    execSync('npx drizzle-kit migrate', { cwd: projectDir, timeout: 30000, stdio: 'pipe' })

    // 5. 替换构建产物
    setUpgradeStatus({ step: 'copying', message: '正在替换构建产物...' })
    const patchOutput = path.join(contentDir, '.output')
    if (!fs.existsSync(patchOutput)) {
      throw createError({ statusCode: 422, statusMessage: '补丁包缺少 .output 构建产物' })
    }

    const currentOutput = path.join(projectDir, '.output')
    if (fs.existsSync(currentOutput)) {
      fs.rmSync(currentOutput, { recursive: true })
    }
    fs.cpSync(patchOutput, currentOutput, { recursive: true })

    // 更新 start.sh
    const patchStart = path.join(contentDir, 'start.sh')
    if (fs.existsSync(patchStart)) {
      fs.copyFileSync(patchStart, path.join(projectDir, 'start.sh'))
      fs.chmodSync(path.join(projectDir, 'start.sh'), '755')
    }

    // 写入版本号
    if (version) {
      fs.writeFileSync(path.join(projectDir, '.version'), version)
    }

    // 6. 重启服务
    setUpgradeStatus({ step: 'restarting', message: '正在重启服务...' })
    spawnRestart(projectDir)

    // 清理临时文件
    try { fs.rmSync(tmpDir, { recursive: true }) } catch {}

    return {
      code: 0,
      data: { version, startedAt },
      message: version ? `升级到 v${version} 成功，服务正在重启...` : '补丁已部署，服务正在重启...',
    }
  } catch (err: any) {
    const msg = err.statusMessage || err.message || '升级过程中出了点问题'
    setUpgradeStatus({ step: 'failed', message: msg, error: String(err) })
    try { fs.rmSync(tmpDir, { recursive: true }) } catch {}
    throw createError({ statusCode: 500, statusMessage: msg })
  }
})

function findContentDir(tmpDir: string): string | null {
  for (const e of fs.readdirSync(tmpDir, { withFileTypes: true })) {
    if (e.isDirectory() && e.name !== '__MACOSX') {
      const full = path.join(tmpDir, e.name)
      if (fs.existsSync(path.join(full, '.output')) || fs.existsSync(path.join(full, 'patch-info.txt'))) {
        return full
      }
    }
  }
  if (fs.existsSync(path.join(tmpDir, '.output'))) return tmpDir
  return null
}

function rebuildBetterSqlite3(projectDir: string) {
  const bs3 = path.join(projectDir, 'node_modules', 'better-sqlite3')
  if (!fs.existsSync(bs3)) return

  try {
    execSync('npx --yes node-gyp rebuild', { cwd: bs3, timeout: 60000, stdio: 'pipe' })
  } catch {}

  const pnpmDir = path.join(projectDir, 'node_modules', '.pnpm')
  let srcNode: string | null = null
  if (fs.existsSync(pnpmDir)) {
    const search = (dir: string): void => {
      if (srcNode) return
      try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (srcNode) return
          if (e.isDirectory()) {
            if (e.name === 'build' || e.name === 'Release') return
            search(path.join(dir, e.name))
          } else if (e.name === 'better_sqlite3.node') {
            srcNode = path.join(dir, e.name)
          }
        }
      } catch {}
    }
    search(pnpmDir)
  }

  if (srcNode) {
    const outputDir = path.join(projectDir, '.output', 'server', 'node_modules', 'better-sqlite3')
    const dest1 = path.join(outputDir, 'build', 'Release')
    const dest2 = path.join(outputDir, 'compiled', `${process.version.slice(1)}/${process.platform}/${process.arch}`)
    fs.mkdirSync(dest1, { recursive: true })
    fs.mkdirSync(dest2, { recursive: true })
    fs.copyFileSync(srcNode, path.join(dest1, 'better_sqlite3.node'))
    fs.copyFileSync(srcNode, path.join(dest2, 'better_sqlite3.node'))
  }
}

function spawnRestart(projectDir: string) {
  const script = path.join(projectDir, 'data', 'tmp', 'restart.sh')
  fs.writeFileSync(script, `#!/bin/bash
sleep 2
pkill -f "node .output/server/index.mjs" 2>/dev/null || true
sleep 1
cd "${projectDir}"
nohup ./start.sh > /dev/null 2>&1 &
echo $! > "${projectDir}/.pid"
rm -f "${script}"
`)
  fs.chmodSync(script, '755')
  spawn('nohup', ['bash', script], { detached: true, stdio: 'ignore' }).unref()
}
