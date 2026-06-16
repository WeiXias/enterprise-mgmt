// Web 升级状态管理 — 内存单例

export interface UpgradeStatus {
  step: 'idle' | 'extracting' | 'backing-up' | 'installing' | 'migrating' | 'copying' | 'restarting' | 'done' | 'failed'
  startedAt?: string
  message?: string
  version?: string
  error?: string
}

let status: UpgradeStatus = { step: 'idle' }

export function getUpgradeStatus(): UpgradeStatus {
  return { ...status }
}

export function setUpgradeStatus(partial: Partial<UpgradeStatus>) {
  status = { ...status, ...partial }
}
